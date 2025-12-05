// @ts-nocheck
// As importações de URL e referências de tipo são gerenciadas pelo ambiente Deno e não devem ser incluídas aqui para evitar erros de compilação local.
// import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Para fins de tipagem local no VSCode, você pode adicionar:
// declare const Deno: any;
// declare const serve: any;
// declare const createClient: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
};

// NOTE: UAZAPI_BASE_URL is set to the instance endpoint for simplicity in the switch logic
const UAZAPI_BASE_URL = "https://infinitegear.uazapi.com/instance"; 
const UAZAPI_ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN");

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
  const userIdHeader = req.headers.get("x-user-id"); // Custom header for internal calls

  const supabaseAdmin = createSupabaseAdminClient();

  if (authHeader && authHeader.startsWith("Bearer eyJhbGciOiJIUzI1NiIsIml")) { // Check if it's a JWT (anon key)
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user } = {} } = await supabase.auth.getUser(token);
    return user;
  } else if (authHeader && authHeader.startsWith(`Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) && userIdHeader) {
    // Internal call from another Edge Function using service role key
    const { data: { user } = {} } = await supabaseAdmin.auth.admin.getUserById(userIdHeader);
    return user;
  }
  return null;
}

// Função auxiliar para gerar o nome da instância (zapcro + email_part + 4_timestamp_digits)
function generateInstanceName(email: string) {
    const emailPart = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Date.now().toString();
    const lastFourDigits = timestamp.slice(-4);
    return `zapcro${emailPart}${lastFourDigits}`;
}

// Função auxiliar para chamar a Uazapi
async function callUazapi(
  endpoint: string,
  method: "GET" | "POST" | "DELETE",
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
  let requestBody: any = {};
  
  try {
    requestBody = await req.json();
  } catch (e) {
    // Ignore if body is empty for GET/DELETE requests
  }
  
  const { action, phone } = requestBody;
  
  if (!action) {
      return new Response(JSON.stringify({ error: "Missing required action in request body." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  try {
    // 1. Fetch profile data (instance_name, instance_id, instance_token)
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, instance_name, instance_id, instance_token, tenant_id")
        .eq("id", user.id)
        .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error("User profile not found.");

    const { instance_name, instance_id, instance_token, tenant_id } = profile;
    let updated_at = new Date().toISOString();
    let uazapiResponse: any;


    switch (action) {
      case "create-instance": {
        if (instance_id || instance_token) {
            return new Response(JSON.stringify({ 
                error: "Instance already exists", 
                instance_id: instance_id 
            }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        // 1. Gerar nome da instância (usando a regra zapcro...)
        const generatedInstanceName = instance_name || generateInstanceName(user.email || 'unknown');
        
        // 2. Chamar Uazapi para criar
        uazapiResponse = await callUazapi(
          "/init",
          "POST",
          "admin",
          {
            name: generatedInstanceName,
            systemName: "zapcorretor",
          },
        );

        const newInstanceId = uazapiResponse.instanceId;
        const newToken = uazapiResponse.token;

        if (!newInstanceId || !newToken) {
             throw new Error("UazAPI did not return instance ID or token.");
        }

        // 3. Salvar no profiles
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            instance_id: newInstanceId,
            instance_token: newToken,
            instance_name: generatedInstanceName,
            updated_at: updated_at,
          })
          .eq("id", user.id);

        if (updateError) throw updateError;
        
        // 4. Se for ADMIN_TENANT, configurar o webhook
        if (profile.tenant_id) { // Assuming ADMIN_TENANT has a tenant_id
            const { data: globalSettings, error: settingsError } = await supabaseAdmin
                .from("global_settings")
                .select("value")
                .eq("key", "n8n_webhook_url")
                .single();

            if (settingsError) {
                console.warn("Could not fetch n8n_webhook_url from global_settings:", settingsError.message);
            }

            const n8nWebhookUrl = globalSettings?.value;

            if (n8nWebhookUrl) {
                console.log(`[Uazapi] Configuring webhook for instance ${newInstanceId} to ${n8nWebhookUrl}`);
                await callUazapi(
                    "/webhook",
                    "POST",
                    "instance",
                    {
                        webhookUrl: n8nWebhookUrl,
                        events: ["messages"],
                        ignore: ["wasSentByApi", "isGroupYes"]
                    },
                    newToken
                );
            } else {
                console.warn("n8n_webhook_url not found in global_settings. Webhook not configured.");
            }
        }


        return new Response(JSON.stringify({ 
            message: "Instance created successfully", 
            instance_id: newInstanceId 
        }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "status": {
        if (!instance_id || !instance_token) {
            return new Response(JSON.stringify({ hasInstance: false, status: "no_instance" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        // 1. Chamar Uazapi para obter status
        uazapiResponse = await callUazapi(
          "/status",
          "GET",
          "instance",
          undefined,
          instance_token,
        );
        
        let currentStatus = "created";
        if (uazapiResponse.status === "connected") {
            currentStatus = "connected";
        } else if (uazapiResponse.status === "disconnected") {
            currentStatus = "disconnected";
        } else if (uazapiResponse.status === "qrcode") {
            currentStatus = "waiting_qr";
        } else if (uazapiResponse.status === "pairing") {
            currentStatus = "waiting_pair";
        }
        
        // 2. Retornar status
        return new Response(JSON.stringify({ 
            hasInstance: true, 
            status: currentStatus, 
            raw: uazapiResponse,
            updated_at: updated_at,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "connect": {
        if (!instance_id || !instance_token) throw new Error("Instance not found. Please initialize first.");
        
        // 1. Chamar Uazapi para conectar
        uazapiResponse = await callUazapi(
          "/connect",
          "POST",
          "instance",
          phone ? { phone } : undefined, // Pass phone if provided (for pairing code)
          instance_token,
        );
        
        // 2. Retornar resposta da Uazapi (pode conter QR code ou pair code)
        return new Response(JSON.stringify(uazapiResponse), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect": {
        if (!instance_id || !instance_token) throw new Error("Instance not found.");

        // 1. Chamar Uazapi para desconectar
        uazapiResponse = await callUazapi(
          "/disconnect",
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
      
      case "pause": {
        if (!instance_id || !instance_token) throw new Error("Instance not found.");

        uazapiResponse = await callUazapi(
          "/pause",
          "POST",
          "instance",
          undefined,
          instance_token,
        );
        
        return new Response(JSON.stringify({ message: "Instance paused successfully", raw: uazapiResponse }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case "delete": {
        if (!instance_id || !instance_token) throw new Error("Instance not found.");

        // 1. Chamar Uazapi para deletar
        uazapiResponse = await callUazapi(
          "/delete",
          "DELETE",
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
                instance_name: null,
                updated_at: updated_at,
            })
            .eq("id", user.id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ message: "Instance deleted successfully", raw: uazapiResponse }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action specified" }), {
          status: 400,
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