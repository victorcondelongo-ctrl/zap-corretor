/// <reference types="https://deno.land/std@0.190.0/http/server.ts" />
/// <reference types="https://esm.sh/@supabase/supabase-js@2.45.0" />

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função auxiliar para criar o cliente Supabase com Service Role
function createSupabaseAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

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

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    const { email, password, full_name, role, tenant_id, action, user_id_to_delete } = await req.json();

    // --- Handle DELETE_USER action ---
    if (action === 'DELETE_USER') {
        if (!user_id_to_delete) {
            return new Response(JSON.stringify({ error: "Missing user_id_to_delete field" }), {
                status: 400,
                headers: corsHeaders,
            });
        }
        
        // 1. Delete user from auth.users (this cascades to public.profiles due to foreign key ON DELETE CASCADE)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id_to_delete);

        if (deleteError) {
            console.error("Error deleting auth user:", deleteError.message);
            return new Response(JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }), {
                status: 400,
                headers: corsHeaders,
            });
        }
        
        return new Response(
            JSON.stringify({
                message: "User and profile deleted successfully",
                userId: user_id_to_delete,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
        );
    }
    
    // --- Handle CREATE_USER action (Original logic) ---
    
    if (!email || !password || !full_name || !role) {
      return new Response("Missing required fields for user creation", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 1. Cria o usuário no Supabase Auth
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

    // 2. Cria o perfil na tabela profiles (O trigger handle_new_user deveria fazer isso, 
    // mas para Edge Functions que criam usuários admin, fazemos manualmente ou confiamos no trigger.
    // Como este endpoint é usado para criar AGENTs por ADMIN_TENANT, o trigger não é acionado.
    // O trigger só é acionado em SIGNUP. Portanto, fazemos manualmente aqui.)
    
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