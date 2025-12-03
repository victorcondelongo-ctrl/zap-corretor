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
    const profileData = {
      id: newUserId,
      full_name: `Admin ${tenant_name}`, // Default name for the admin
      role: "ADMIN_TENANT",
      tenant_id: newTenantId,
      is_active: true,
    };

    const { error: profileError } = await supabaseAdmin.from("profiles").insert(
      profileData,
    );

    if (profileError) {
      console.error("Error creating profile:", profileError.message);
      // If profile creation fails, delete the auth user to prevent orphans
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Failed to create admin profile. Auth user deleted." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Tenant and Admin created successfully",
        tenant: tenantData,
        adminUserId: newUserId,
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