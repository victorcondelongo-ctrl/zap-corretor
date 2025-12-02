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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized: Missing Authorization header", {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    const { email, password, full_name, role, tenant_id } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response("Missing required fields", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 1. Inicializa o cliente Supabase com o Service Role Key
    // Isso permite criar usuários diretamente no auth.users
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

    // 2. Cria o usuário no Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth
      .admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (userError) {
      console.error("Error creating auth user:", userError.message);
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const newUserId = userData.user!.id;

    // 3. Cria o perfil na tabela profiles
    const profileData: any = {
      id: newUserId,
      full_name,
      role,
      tenant_id: role === "SUPERADMIN" ? null : tenant_id,
    };

    const { error: profileError } = await supabaseAdmin.from("profiles").insert(
      profileData,
    );

    if (profileError) {
      console.error("Error creating profile:", profileError.message);
      // Se falhar ao criar o perfil, devemos deletar o usuário auth para evitar órfãos
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: "Failed to create profile" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        message: "User and profile created successfully",
        userId: newUserId,
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
      headers: corsHeaders,
    });
  }
});