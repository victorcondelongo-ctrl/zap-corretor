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

// Função auxiliar para gerar o nome da instância
async function generateInstanceName(userId: string, email: string) {
    // Remove caracteres especiais, mantém minúsculas e números, e adiciona prefixo 'zapcro'
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
    let instanceRecord: any;
    
    // Tenta buscar a instância do usuário (necessário para todas as rotas, exceto init)
    if (path !== "/instance/init") {
        const { data, error } = await supabaseAdmin
            .from("uazapi_instances")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) throw error;
        instanceRecord = data;
    }

    switch (path) {
      case "/instance/init": {
        if (instanceRecord) {
            return new Response(JSON.stringify({ 
                error: "Instance already exists", 
                instance: instanceRecord 
            }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        // 1. Gerar nome da instância
        const instanceName = await generateInstanceName(user.id, user.email || 'unknown');
        
        // 2. Chamar Uazapi para criar
        const uazapiResponse = await callUazapi(
          "/instance/init",
          "POST",
          "admin",
          {
            name: instanceName,
            systemName: "zapcorretor", // Nome fixo do sistema
          },
        );

        // 3. Salvar no banco
        const { data: newInstance, error: insertError } = await supabaseAdmin
          .from("uazapi_instances")
          .insert({
            user_id: user.id,
            instance_id: uazapiResponse.instanceId,
            instance_token: uazapiResponse.token,
            name: instanceName,
            system_name: "zapcorretor",
            status: "created",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify({ 
            message: "Instance created successfully", 
            instance: newInstance 
        }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "/instance/status": {
        if (!instanceRecord) {
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
          instanceRecord.instance_token,
        );
        
        // Mapeamento de status (simplificado)
        let status = "unknown";
        if (uazapiResponse.status === "connected") {
            status = "connected";
        } else if (uazapiResponse.status === "disconnected") {
            status = "disconnected";
        } else if (uazapiResponse.status === "qrcode") {
            status = "waiting_qr";
        } else if (uazapiResponse.status === "pairing") {
            status = "waiting_pair";
        }

        // 2. Atualizar status no banco
        const { data: updatedInstance, error: updateError } = await supabaseAdmin
            .from("uazapi_instances")
            .update({ 
                status: status, 
                last_status_payload: uazapiResponse,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ 
            hasInstance: true, 
            status: status, 
            raw: uazapiResponse,
            updated_at: updatedInstance.updated_at,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "/instance/connect": {
        if (!instanceRecord) throw new Error("Instance not found. Please initialize first.");
        
        const body = await req.json().catch(() => ({}));
        
        // 1. Chamar Uazapi para conectar
        const uazapiResponse = await callUazapi(
          "/instance/connect",
          "POST",
          "instance",
          body,
          instanceRecord.instance_token,
        );
        
        // 2. Retornar resposta da Uazapi (pode conter QR code ou pair code)
        return new Response(JSON.stringify(uazapiResponse), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "/instance/disconnect": {
        if (!instanceRecord) throw new Error("Instance not found.");

        // 1. Chamar Uazapi para desconectar
        const uazapiResponse = await callUazapi(
          "/instance/disconnect",
          "POST",
          "instance",
          undefined,
          instanceRecord.instance_token,
        );
        
        // 2. Atualizar status local para disconnected
        const { error: updateError } = await supabaseAdmin
            .from("uazapi_instances")
            .update({ 
                status: "disconnected", 
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

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