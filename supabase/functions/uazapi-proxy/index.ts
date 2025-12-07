// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

  if (authHeader && authHeader.startsWith("Bearer ")) { // Check if it's a JWT
    const token = authHeader.replace("Bearer ", "");
    // Use the admin client to verify the token and get the user
    const { data: { user } = {} } = await supabaseAdmin.auth.getUser(token);
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
    if (!UAZAPI_ADMIN_TOKEN) {
        console.error("UAZAPI_ADMIN_TOKEN not configured.");
        throw new Error("UAZAPI_ADMIN_TOKEN not configured.");
    }
    headers["admintoken"] = UAZAPI_ADMIN_TOKEN;
    console.log("[callUazapi] Using admin token.");
  } else if (tokenType === "instance") {
    if (!instanceToken) {
        console.error("Instance token missing for instance call.");
        throw new Error("Instance token missing.");
    }
    headers["token"] = instanceToken;
    console.log("[callUazapi] Using instance token.");
  }

  const url = `${UAZAPI_BASE_URL}${endpoint}`;
  
  console.log(`[callUazapi] Calling ${method} ${url} with body:`, body);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[callUazapi] Uazapi Error (${response.status}): ${errorText}`);
    throw new Error(`Uazapi API failed with status ${response.status}: ${errorText}`);
  }

  const responseData = await response.json();
  console.log("[callUazapi] Uazapi Response:", responseData);
  return responseData;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    console.warn("[uazapi-proxy] Unauthorized: No authenticated user.");
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
    console.warn("[uazapi-proxy] No JSON body provided or invalid JSON.");
    // Ignore if body is empty for GET/DELETE requests
  }
  
  const { action, phone } = requestBody;
  
  if (!action) {
      console.error("[uazapi-proxy] Missing required action in request body.");
      return new Response(JSON.stringify({ error: "Missing required action in request body." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  console.log(`[uazapi-proxy] Action: ${action} for user: ${user.id}`);

  try {
    // 1. Fetch profile data (instance_name, instance_id, instance_token)
    const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, instance_name, instance_id, instance_token, tenant_id") // REMOVED 'email'
        .eq("id", user.id)
        .single();

    if (profileError) {
        console.error("[uazapi-proxy] Profile fetch error:", profileError);
        throw profileError;
    }
    if (!profile) {
        console.error("[uazapi-proxy] User profile not found for user:", user.id);
        throw new Error("User profile not found.");
    }

    const { instance_name, instance_id, instance_token, tenant_id } = profile; // REMOVED 'email'
    let updated_at = new Date().toISOString();
    let uazapiResponse: any;


    switch (action) {
      case "create-instance": {
        if (instance_id || instance_token) {
            console.warn("[uazapi-proxy] Attempted to create instance, but one already exists for user:", user.id);
            return new Response(JSON.stringify({ 
                error: "Instance already exists", 
                instance_id: instance_id 
            }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        // 1. Gerar nome da instância (usando a regra zapcro...)
        const generatedInstanceName = instance_name || generateInstanceName(user.email || 'unknown'); // Use user.email
        console.log("[uazapi-proxy] Generated instance name:", generatedInstanceName);
        
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
             console.error("[uazapi-proxy] UazAPI did not return instance ID or token on creation.");
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

        if (updateError) {
            console.error("[uazapi-proxy] Error updating profile with new instance data:", updateError);
            throw updateError;
        }
        
        // 4. Se for ADMIN_TENANT, configurar o webhook
        if (tenant_id) { // Assuming ADMIN_TENANT has a tenant_id
            console.log("[uazapi-proxy] User has tenant_id, checking for n8n webhook configuration.");
            const { data: globalSettings, error: settingsError } = await supabaseAdmin
                .from("global_settings")
                .select("value")
                .eq("key", "n8n_webhook_url")
                .single();

            if (settingsError) {
                console.warn("[uazapi-proxy] Could not fetch n8n_webhook_url from global_settings:", settingsError.message);
            }

            const n8nWebhookUrl = globalSettings?.value;

            if (n8nWebhookUrl) {
                console.log(`[uazapi-proxy] Configuring webhook for instance ${newInstanceId} to ${n8nWebhookUrl}`);
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
                console.log("[uazapi-proxy] Webhook configured successfully.");
            } else {
                console.warn("[uazapi-proxy] n8n_webhook_url not found in global_settings. Webhook not configured.");
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
        // Se não houver instance_id ou instance_token no perfil, significa que não há instância criada na Uazapi
        if (!instance_id || !instance_token) {
            console.log("[uazapi-proxy] No instance_id or instance_token found in profile, returning no_instance status.");
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
        
        let currentStatus = "created"; // Default if instance exists but status is not yet connected/disconnected
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
        
        console.log("[uazapi-proxy] Attempting to connect instance.");
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

        console.log("[uazapi-proxy] Attempting to disconnect instance.");
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

        if (updateError) {
            console.error("[uazapi-proxy] Error updating profile after disconnect:", updateError);
            throw updateError;
        }

        return new Response(JSON.stringify({ message: "Disconnected successfully", raw: uazapiResponse }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case "pause": {
        if (!instance_id || !instance_token) throw new Error("Instance not found.");

        console.log("[uazapi-proxy] Attempting to pause instance.");
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

        console.log("[uazapi-proxy] Attempting to delete instance.");
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

        if (updateError) {
            console.error("[uazapi-proxy] Error updating profile after delete:", updateError);
            throw updateError;
        }

        return new Response(JSON.stringify({ message: "Instance deleted successfully", raw: uazapiResponse }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        console.warn("[uazapi-proxy] Invalid action specified:", action);
        return new Response(JSON.stringify({ error: "Invalid action specified" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("[uazapi-proxy] General error caught:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});