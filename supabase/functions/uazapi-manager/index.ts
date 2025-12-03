import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const UAZAPI_BASE_URL = "https://infinitegear.uazapi.com"; // Base URL da Uazapi
const UAZAPI_ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");

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

// Função auxiliar para obter o usuário autenticado
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// Função auxiliar para chamar a Uazapi
async function callUazapi(
  endpoint: string,
  method: "GET" | "POST",
  tokenType: "admin" | "instance",
  body?: any,
  instanceToken?: string,
) {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  if (tokenType === "admin") {
    if (!UAZAPI_ADMIN_TOKEN) throw new Error("UAZAPI_ADMIN_TOKEN not configured.");
    headers["admintoken"] = UAZAPI_ADMIN_TOKEN;
  } else if (tokenType === "instance") {
    if (!instanceToken) throw new Error("Instance token missing.");
    headers["token"] = instanceToken;
  }

  const url = `${UAZAPI_BASE_URL}${endpoint}`;
  
  console.log(`[Uazapi] Calling ${method} ${url}`);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Uazapi Error (${response.status}): ${errorText}`);
    throw new Error(`Uazapi API failed with status ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Função auxiliar para gerar o nome da instância (mantida para consistência)
async function generateInstanceName(userId: string, email: string) {
    const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now().toString();
    const lastFourDigits = timestamp.slice(-4);
    return `zapcro${emailPart}${lastFourDigits}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const url = new URL(req.url);
  const path = url.pathname.replace("/uazapi-manager", "");

  try {
    // Buscar o perfil do usuário para obter os dados da instância
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, instance_name, instance_id, instance_token")
        .eq("id", user.id)
        .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error("User profile not found.");

    const { instance_name, instance_id, instance_token } = profile;
    
    // Variáveis para armazenar o status e payload (temporário, pois não temos coluna dedicada)
    let currentStatus = "unknown";
    let lastStatusPayload = null;
    let updated_at = new Date().toISOString();


    switch (path) {
      case "/instance/init": {
        if (instance_id || instance_token) {
            return new Response(JSON.stringify({ 
                error: "Instance already exists", 
                instance_id: instance_id 
            }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        // 1. Gerar nome da instância (usando o nome já salvo no profiles)
        const generatedInstanceName = instance_name || await generateInstanceName(user.id, user.email || 'unknown');
        
        // 2. Chamar Uazapi para criar
        const uazapiResponse = await callUazapi(
          "/instance/init",
          "POST",
          "admin",
          {
            name: generatedInstanceName,
            systemName: "zapcorretor", // Nome fixo do sistema
          },
        );

        // 3. Salvar no profiles
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            instance_id: uazapiResponse.instanceId,
            instance_token: uazapiResponse.token,
            instance_name: generatedInstanceName, // Garante que o nome está salvo
            updated_at: updated_at,
          })
          .eq("id", user.id)
          .select("instance_id")
          .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ 
            message: "Instance created successfully", 
            instance_id: updatedProfile.instance_id 
        }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "/instance/status": {
        if (!instance_id || !instance_token) {
            return new Response(JSON.stringify({ hasInstance: false, status: "no_instance" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        // 1. Chamar Uazapi para obter status
        const uazapiResponse = await callUazapi(
          "/instance/status",
          "GET",
          "instance",
          undefined,
          instance_token,
        );
        
        // Mapeamento de status (simplificado)
        if (uazapiResponse.status === "connected") {
            currentStatus = "connected";
        } else if (uazapiResponse.status === "disconnected") {
            currentStatus = "disconnected";
        } else if (uazapiResponse.status === "qrcode") {
            currentStatus = "waiting_qr";
        } else if (uazapiResponse.status === "pairing") {
            currentStatus = "waiting_pair";
        } else {
            currentStatus = "created"; // Se a instância existe mas o status é neutro/inicial
        }
        
        lastStatusPayload = uazapiResponse;
        
        // NOTA: Não atualizamos o profiles aqui, pois não temos colunas dedicadas para status/payload.
        // O status é retornado diretamente para o frontend.

        return new Response(JSON.stringify({ 
            hasInstance: true, 
            status: currentStatus, 
            raw: lastStatusPayload,
            updated_at: updated_at,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "/instance/connect": {
        if (!instance_id || !instance_token) throw new Error("Instance not found. Please initialize first.");
        
        const body = await req.json().catch(() => ({}));
        
        // 1. Chamar Uazapi para conectar
        const uazapiResponse = await callUazapi(
          "/instance/connect",
          "POST",
          "instance",
          body,
          instance_token,
        );
        
        // 2. Retornar resposta da Uazapi (pode conter QR code ou pair code)
        return new Response(JSON.stringify(uazapiResponse), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "/instance/disconnect": {
        if (!instance_id || !instance_token) throw new Error("Instance not found.");

        // 1. Chamar Uazapi para desconectar
        const uazapiResponse = await callUazapi(
          "/instance/disconnect",
          "POST",
          "instance",
          undefined,
          instance_token,
        );
        
        // 2. Limpar token e id no profiles
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({ 
                instance_id: null, 
                instance_token: null,
                updated_at: updated_at,
            })
            .eq("id", user.id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ message: "Disconnected successfully", raw: uazapiResponse }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});