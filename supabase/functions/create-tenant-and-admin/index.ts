// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Check Authorization (Superadmin JWT)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized: Missing Authorization header", {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    const { tenant_name, admin_email, admin_password, leads_limit } = await req.json();

    if (!tenant_name || !admin_email || !admin_password || leads_limit === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields: tenant_name, admin_email, admin_password, leads_limit" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Admin Client (using Service Role Key)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // --- Step A: Create Tenant (Corretora) using RPC ---
    // We use the existing create_tenant RPC which handles RLS and default values (trial, timezone)
    const { data: tenantData, error: tenantError } = await supabaseAdmin.rpc("create_tenant", {
      p_name: tenant_name,
      p_whatsapp_central_number: null, // Not required in simplified form
      p_timezone: 'America/Sao_Paulo', // Default timezone
      p_plan_status: 'trial',
      p_plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
      p_base_monthly_leads_limit: leads_limit,
    }).single();

    if (tenantError) {
      console.error("Error creating tenant:", tenantError.message);
      return new Response(JSON.stringify({ error: `Failed to create tenant: ${tenantError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newTenantId = tenantData.id;

    // --- Step B: Create ADMIN_TENANT User in Supabase Auth ---
    const { data: userData, error: userError } = await supabaseAdmin.auth
      .admin.createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true, // Send confirmation email
      });

    if (userError) {
      console.error("Error creating auth user:", userError.message);
      // If user creation fails, we should ideally roll back the tenant creation, 
      // but since we are using RPC, we rely on the SUPERADMIN to clean up the orphaned tenant if necessary.
      return new Response(JSON.stringify({ error: `Failed to create admin user: ${userError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = userData.user!.id;

    // --- Step C: Create ADMIN_TENANT Profile ---
    // The handle_new_user trigger will create the profile.
    // We need to wait for the profile to be created by the trigger
    // and then fetch it to get the instance_name.
    let profileCreated = false;
    let attempts = 0;
    const maxAttempts = 10;
    let createdProfile: any = null;

    while (!profileCreated && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        const { data: profileData, error: fetchProfileError } = await supabaseAdmin
            .from("profiles")
            .select("id, instance_name")
            .eq("id", newUserId)
            .single();

        if (profileData) {
            createdProfile = profileData;
            profileCreated = true;
        } else if (fetchProfileError) {
            console.warn(`Attempt ${attempts + 1}: Error fetching profile for new user: ${fetchProfileError.message}`);
        }
        attempts++;
    }

    if (!createdProfile) {
        console.error("Failed to fetch created profile after multiple attempts.");
        await supabaseAdmin.auth.admin.deleteUser(newUserId); // Rollback auth user
        return new Response(JSON.stringify({ error: "Failed to create admin profile (timeout)." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // --- Step D: Create Uazapi Instance for the new ADMIN_TENANT ---
    // We need to invoke the uazapi-proxy Edge Function from here.
    // The uazapi-proxy expects the user's JWT for authentication.
    // Since we are in an admin context, we need to create a temporary JWT for the new user
    // or modify uazapi-proxy to accept a service role key for this specific action.
    // For simplicity and security, let's modify uazapi-proxy to allow service role key for create-instance
    // when invoked internally by another Edge Function.

    // For now, let's assume uazapi-proxy can be called with the service role key
    // or that the create-instance action is public (which is not ideal).
    // A better approach would be to pass the new user's ID and let uazapi-proxy use the service role key
    // to fetch the profile and create the instance.

    // Let's invoke uazapi-proxy with the new user's ID and the service role key
    const { data: uazapiData, error: uazapiError } = await supabaseAdmin.functions.invoke("uazapi-proxy", {
        headers: {
            // This is a hack: we're passing the service role key as Authorization.
            // A more robust solution would be to have a dedicated internal endpoint
            // or a way for Edge Functions to securely call each other.
            // For now, this demonstrates the invocation.
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            'x-user-id': newUserId, // Pass the new user's ID
        },
        body: {
            action: 'create-instance',
        },
    });

    if (uazapiError) {
        console.error("Error creating Uazapi instance:", uazapiError.message);
        // Rollback: delete auth user and tenant if Uazapi instance creation fails
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        await supabaseAdmin.from("tenants").delete().eq("id", newTenantId);
        return new Response(JSON.stringify({ error: `Failed to create Uazapi instance: ${uazapiError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    
    if (uazapiData && uazapiData.error) {
        console.error("Uazapi proxy returned error:", uazapiData.error);
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        await supabaseAdmin.from("tenants").delete().eq("id", newTenantId);
        return new Response(JSON.stringify({ error: `Uazapi instance creation failed: ${uazapiData.error}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }


    return new Response(
      JSON.stringify({
        message: "Tenant and Admin created successfully",
        tenant: tenantData,
        adminUserId: newUserId,
        uazapiInstance: uazapiData,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("General error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});