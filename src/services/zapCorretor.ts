import { supabase } from "@/integrations/supabase/client";

// =================================================================
// 1. TYPESCRIPT DEFINITIONS
// =================================================================

export type ZapRole = "SUPERADMIN" | "ADMIN_TENANT" | "AGENT";
export type LeadStatus = "new" | "in_progress" | "qualified" | "abandoned" | "sold";
export type SenderType = "lead" | "ai" | "agent";
export type DistributionMode = "sequential" | "random" | "weighted" | "schedule";

export interface ZapProfile {
  id: string;
  full_name: string;
  role: ZapRole;
  tenant_id: string | null;
  is_active: boolean;
  created_at: string;
  // New field for agent alerts (stored in profiles, but fetched with settings)
  whatsapp_alert_number: string | null; 
  // Fields related to Uazapi instance stored in profiles
  instance_name: string | null;
  instance_created_at: string | null;
  instance_id: string | null;
  instance_token: string | null;
  // Settings fields flattened from agent_settings table (used in AdminAgentsPage)
  can_export_leads?: boolean;
  schedule_enabled?: boolean;
  schedule_config?: AgentScheduleConfig | null;
}

export interface ZapLead {
  id: string;
// ... (rest of ZapLead remains the same)
  tenant_id: string;
  agent_id: string | null;
  phone: string;
  status: LeadStatus;
  name: string | null;
  cpf: string | null;
  cep: string | null;
  plate: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  last_interaction_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ZapMessage {
// ... (rest of ZapMessage remains the same)
  id: string;
  lead_id: string;
  sender_type: SenderType;
  sender_profile_id: string | null;
  body: string;
  created_at: string;
}

export interface ZapSalesByAgent {
// ... (rest of ZapSalesByAgent remains the same)
  agent_id: string;
  sales_count: number;
}

export interface ZapDashboardStats {
// ... (rest of ZapDashboardStats remains the same)
  total_leads: number;
  leads_new: number;
  leads_in_progress: number;
  leads_qualified: number;
  leads_abandoned: number;
  leads_sold: number;
  total_sales: number;
  sales_by_agent: ZapSalesByAgent[];
}

// --- RPC Return Types ---

interface LeadWithMessagesRpcResult {
    lead_data: ZapLead;
    messages_data: ZapMessage[];
}

interface DashboardStatsRpcResult {
    total_leads: number;
    leads_new: number;
    leads_in_progress: number;
    leads_qualified: number;
    leads_abandoned: number;
    leads_sold: number;
    total_sales: number;
    sales_by_agent: ZapSalesByAgent[];
}

interface PlatformStatsRpcResult {
    total_tenants: number;
    total_agents: number;
    total_leads: number;
    total_sales: number;
}

// --- End RPC Return Types ---


export interface ZapTenant {
// ... (rest of ZapTenant remains the same)
  id: string;
  name: string;
  whatsapp_central_number: string | null;
  plan_status: string;
  plan_expires_at: string | null;
  base_monthly_leads_limit: number;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface AgentScheduleConfig {
    // Ex: { "monday": ["09:00", "18:00"], "tuesday": ["09:00", "18:00"], ... }
    [day: string]: [string, string] | null;
}

export interface ZapAgentSettings {
// ... (rest of ZapAgentSettings remains the same)
  agent_id: string;
  ai_prompt: string | null;
  followup_30min_enabled: boolean;
  followup_24h_enabled: boolean;
  // New fields
  can_export_leads: boolean;
  schedule_enabled: boolean;
  schedule_config: AgentScheduleConfig | null;
  // Adding whatsapp_alert_number here to facilitate passing it in saveSettings (Error 1, 2)
  whatsapp_alert_number?: string | null; 
}

export interface ZapTenantSettings {
// ... (rest of ZapTenantSettings remains the same)
  tenant_id: string;
  distribution_mode: DistributionMode;
  default_ai_prompt: string | null;
  agents_can_export: boolean;
}

export interface LeadUpdateData {
// ... (rest of LeadUpdateData remains the same)
  name?: string | null;
  cpf?: string | null;
  cep?: string | null;
  plate?: string | null;
}

export interface TenantUpdateData {
// ... (rest of TenantUpdateData remains the same)
  name?: string;
  plan_status?: string;
  plan_expires_at?: string | null;
  base_monthly_leads_limit?: number;
  timezone?: string;
}

export interface GlobalSettings {
// ... (rest of GlobalSettings remains the same)
  n8n_webhook_url: string | null;
  whatsapp_notification_number: string | null;
}

export interface PlatformStats {
// ... (rest of PlatformStats remains the same)
    total_tenants: number;
    total_agents: number;
    total_leads: number;
    total_sales: number;
}

export interface SupportTicketData {
// ... (rest of SupportTicketData remains the same)
    name: string;
    email: string;
    phone: string | null;
    message: string;
}

export type SupportTicketStatus = 'new' | 'in_progress' | 'closed';

export interface ZapSupportTicket {
// ... (rest of ZapSupportTicket remains the same)
    id: string;
    name: string;
    email: string;
    phone: string | null;
    message: string;
    status: SupportTicketStatus;
    created_at: string;
}

// UAZAPI TYPES
export type UazapiStatus = "connected" | "disconnected" | "waiting_qr" | "waiting_pair" | "no_instance" | "error" | "unknown" | "created";

export interface UazapiStatusResponse {
    hasInstance: boolean;
    status: UazapiStatus;
    raw: any;
    updated_at?: string;
}

export interface UazapiConnectResponse {
    qrcode_base64?: string;
    pairingCode?: string;
    message?: string;
}


// =================================================================
// 2. GENERIC CONTEXT FUNCTIONS
// =================================================================

/**
 * Fetches the current authenticated user's profile data.
 * @returns The user's profile.
 * @throws Error if no user is logged in or profile is not found.
 */
export async function getCurrentProfile(): Promise<ZapProfile> {
  try {
    console.log("[getCurrentProfile] start");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("[getCurrentProfile] after getUser", { user, userError });

    if (userError) {
      throw userError;
    }
    if (!user) {
      throw new Error("User not authenticated.");
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*, agent_settings(can_export_leads, schedule_enabled, schedule_config)")
      .eq("id", user.id)
      .maybeSingle();     // Usando maybeSingle para evitar erro PGRST116

    console.log("[getCurrentProfile] query result", { profile, error });

    if (error) {
      console.error("Supabase Profile Fetch Error:", error);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    if (!profile) {
      throw new Error(`Profile not found for user ID: ${user.id}`);
    }

    // Ensure fields are correctly typed and flatten settings for AGENTs
    const typedProfile: ZapProfile = {
      ...profile,
      tenant_id: profile.tenant_id as string | null,
      instance_name: profile.instance_name as string | null,
      instance_created_at: profile.instance_created_at as string | null,
      instance_id: profile.instance_id as string | null,
      instance_token: profile.instance_token as string | null,
      whatsapp_alert_number: profile.whatsapp_alert_number as string | null,
      created_at: profile.created_at as string, // Ensure created_at is present
      
      // Flatten settings for AGENTs (Errors 3, 4, 5, 7, 8 fixed by this)
      can_export_leads: profile.agent_settings?.[0]?.can_export_leads ?? false,
      schedule_enabled: profile.agent_settings?.[0]?.schedule_enabled ?? false,
      schedule_config: profile.agent_settings?.[0]?.schedule_config ?? null,
    };

    console.log("[getCurrentProfile] success, returning profile");
    return typedProfile;
  } catch (e) {
    console.error("[getCurrentProfile] error", e);
    throw e;
  }
}

/**
 * Checks if the current user has one of the required roles.
 * @param roles Array of roles allowed to perform the action.
 * @returns The current user's profile if authorized.
 * @throws Error if permission is denied.
 */
async function requireRole(roles: ZapRole[]): Promise<ZapProfile> {
  const profile = await getCurrentProfile();

  if (!roles.includes(profile.role)) {
    throw new Error(`Permission denied. Required roles: ${roles.join(", ")}.`);
  }

  return profile;
}

/**
 * Submits a support ticket to the database.
 */
export async function submitSupportTicket(data: SupportTicketData): Promise<void> {
    const { error } = await supabase
        .from('support_tickets')
        .insert({
            name: data.name,
            email: data.email,
            phone: data.phone,
            message: data.message,
        });

    if (error) {
        throw new Error(`Failed to submit support ticket: ${error.message}`);
    }
}


// =================================================================
// 3. ADMIN_TENANT SERVICES
// =================================================================

export interface AgentUpdateData {
    full_name?: string;
    is_active?: boolean;
    email?: string;
    whatsapp_alert_number?: string | null;
    // Settings fields
    can_export_leads?: boolean;
    schedule_enabled?: boolean;
    schedule_config?: AgentScheduleConfig | null;
}

export const adminTenantService = {
  /**
   * Lists all active agents within the ADMIN_TENANT's organization.
   */
  async listAgents(): Promise<ZapProfile[]> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, tenant_id, is_active, created_at, instance_name, instance_created_at, instance_id, instance_token, whatsapp_alert_number, agent_settings(can_export_leads, schedule_enabled, schedule_config)")
      .eq("role", "AGENT"); // RLS will filter by tenant_id automatically

    if (error) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }
    
    // Map the nested agent_settings data into the profile structure for easier use
    return data.map(p => ({
        ...p,
        // Flatten agent_settings into the profile object
        can_export_leads: p.agent_settings?.[0]?.can_export_leads ?? false,
        schedule_enabled: p.agent_settings?.[0]?.schedule_enabled ?? false,
        schedule_config: p.agent_settings?.[0]?.schedule_config ?? null,
    })) as ZapProfile[];
  },
  
  /**
   * Updates an agent's profile (name, active status, email, whatsapp number) and settings.
   */
  async updateAgentProfile(agentId: string, updateData: AgentUpdateData): Promise<ZapProfile> {
    const profile = await requireRole(["ADMIN_TENANT"]);
    
    // 1. Prepare Profile Update Data
    const profileUpdate: Partial<ZapProfile> = {};
    if (updateData.full_name !== undefined) profileUpdate.full_name = updateData.full_name;
    if (updateData.is_active !== undefined) profileUpdate.is_active = updateData.is_active;
    if (updateData.whatsapp_alert_number !== undefined) profileUpdate.whatsapp_alert_number = updateData.whatsapp_alert_number;
    
    // 2. Prepare Settings Update Data
    const settingsUpdate: Partial<ZapAgentSettings> = {};
    if (updateData.can_export_leads !== undefined) settingsUpdate.can_export_leads = updateData.can_export_leads;
    if (updateData.schedule_enabled !== undefined) settingsUpdate.schedule_enabled = updateData.schedule_enabled;
    if (updateData.schedule_config !== undefined) settingsUpdate.schedule_config = updateData.schedule_config;

    // 3. Call Edge Function for Auth/Profile Update
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke("user-management", {
        body: {
            action: 'UPDATE_USER',
            user_id_to_update: agentId,
            new_email: updateData.email,
            new_full_name: profileUpdate.full_name,
            new_is_active: profileUpdate.is_active,
            new_whatsapp_alert_number: profileUpdate.whatsapp_alert_number,
        },
    });

    if (edgeError) {
        throw new Error(`Failed to update agent profile (Edge): ${edgeError.message}`);
    }
    
    // 4. Update Agent Settings (if any settings fields were provided)
    if (Object.keys(settingsUpdate).length > 0) {
        const settingsPayload = {
            ...settingsUpdate,
            agent_id: agentId,
            updated_at: new Date().toISOString(),
        };
        
        const { error: settingsError } = await supabase
            .from("agent_settings")
            .upsert(settingsPayload, { onConflict: 'agent_id' });
            
        if (settingsError) {
            throw new Error(`Failed to update agent settings: ${settingsError.message}`);
        }
    }

    // 5. Refetch the updated profile and settings
    const { data: updatedProfileData, error: refetchError } = await supabase
        .from("profiles")
        .select("id, full_name, role, tenant_id, is_active, created_at, instance_name, instance_created_at, instance_id, instance_token, whatsapp_alert_number, agent_settings(can_export_leads, schedule_enabled, schedule_config)")
        .eq("id", agentId)
        .single();
        
    if (refetchError) {
        throw new Error(`Failed to refetch updated agent profile: ${refetchError.message}`);
    }
    
    // Map and return the flattened profile
    const updatedProfile = {
        ...updatedProfileData,
        can_export_leads: updatedProfileData.agent_settings?.[0]?.can_export_leads ?? false,
        schedule_enabled: updatedProfileData.agent_settings?.[0]?.schedule_enabled ?? false,
        schedule_config: updatedProfileData.agent_settings?.[0]?.schedule_config ?? null,
    } as ZapProfile;

    return updatedProfile;
  },
  
  /**
   * Deletes an agent (user and profile) using the user-management Edge Function.
   */
  async deleteAgent(agentId: string): Promise<void> {
    const profile = await requireRole(["ADMIN_TENANT"]);
    
    // Before deleting, ensure the agent belongs to the current tenant (RLS check)
    const { data: agentProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", agentId)
        .single();
        
    if (fetchError || !agentProfile || agentProfile.tenant_id !== profile.tenant_id || agentProfile.role !== 'AGENT') {
        throw new Error("Permission denied or agent not found in this tenant.");
    }

    const { data, error } = await supabase.functions.invoke("user-management", {
      body: {
        action: 'DELETE_USER',
        user_id_to_delete: agentId,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
    
    if (data && data.error) {
        throw new Error(data.error);
    }
  },

  /**
   * Lists leads for the current tenant using the list_tenant_leads RPC.
   */
  async listLeads(params: { status?: LeadStatus; agentId?: string; phone?: string } = {}): Promise<ZapLead[]> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase.rpc("list_tenant_leads", {
      p_status: params.status || null,
      p_agent_id: params.agentId || null,
      p_phone_search: params.phone || null,
    });

    if (error) {
      throw new Error(`Failed to list leads: ${error.message}`);
    }

    return data as ZapLead[];
  },

  /**
   * Retrieves a single lead and its associated messages using the get_lead_with_messages RPC.
   */
  async getLeadWithMessages(leadId: string): Promise<{ lead: ZapLead; messages: ZapMessage[] }> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase.rpc("get_lead_with_messages", {
      p_lead_id: leadId,
    }).single<LeadWithMessagesRpcResult>(); // Usando tipagem local

    if (error) {
      throw new Error(`Failed to fetch lead and messages: ${error.message}`);
    }

    // The RPC returns lead_data and messages_data as JSON objects/arrays
    const lead = data.lead_data;
    const messages = data.messages_data || [];

    return { lead, messages };
  },

  /**
   * Assigns a lead to the next agent using the round-robin distribution RPC.
   */
  async assignLeadToNextAgent(leadId: string): Promise<ZapLead> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase.rpc("assign_lead_to_next_agent", {
      p_lead_id: leadId,
    }).single();

    if (error) {
      throw new Error(`Failed to assign lead: ${error.message}`);
    }

    return data as ZapLead;
  },

  /**
   * Manually assigns a lead to a specific agent.
   */
  async manualAssignLeadToAgent(leadId: string, agentId: string): Promise<ZapLead> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase.rpc("manual_assign_lead_to_agent", {
      p_lead_id: leadId,
      p_agent_id: agentId,
    }).single();

    if (error) {
      throw new Error(`Failed to manually assign lead: ${error.message}`);
    }

    return data as ZapLead;
  },

  /**
   * Marks a lead as sold, registering a sale record.
   */
  async markLeadAsSold(leadId: string): Promise<ZapLead> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase.rpc("mark_lead_as_sold", {
      p_lead_id: leadId,
    }).single();

    if (error) {
      throw new Error(`Failed to mark lead as sold: ${error.message}`);
    }

    return data as ZapLead;
  },

  /**
   * Retrieves dashboard statistics for the current tenant.
   */
  async getDashboardStats(): Promise<ZapDashboardStats> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase.rpc("get_tenant_dashboard_stats").single<DashboardStatsRpcResult>(); // Usando tipagem local

    if (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }

    // The RPC returns sales_by_agent as JSONB, which needs mapping
    const stats: ZapDashboardStats = {
      total_leads: data.total_leads,
      leads_new: data.leads_new,
      leads_in_progress: data.leads_in_progress,
      leads_qualified: data.leads_qualified,
      leads_abandoned: data.leads_abandoned,
      leads_sold: data.leads_sold,
      total_sales: data.total_sales,
      sales_by_agent: data.sales_by_agent as ZapSalesByAgent[],
    };

    return stats;
  },

  /**
   * Fetches the current tenant's settings.
   */
  async getSettings(): Promise<ZapTenantSettings> {
    const profile = await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase
      .from("tenant_settings")
      .select("tenant_id, distribution_mode, default_ai_prompt, agents_can_export")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch tenant settings: ${error.message}`);
    }
    
    // If settings don't exist, return defaults
    if (!data) {
        return {
            tenant_id: profile.tenant_id!,
            distribution_mode: 'sequential',
            default_ai_prompt: null,
            agents_can_export: false,
        };
    }

    return data as ZapTenantSettings;
  },

  /**
   * Saves or updates the current tenant's settings.
   */
  async saveSettings(settings: Partial<ZapTenantSettings>): Promise<ZapTenantSettings> {
    const profile = await requireRole(["ADMIN_TENANT"]);
    
    const updateData = {
        ...settings,
        tenant_id: profile.tenant_id!,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("tenant_settings")
      .upsert(updateData, { onConflict: 'tenant_id' })
      .select("tenant_id, distribution_mode, default_ai_prompt, agents_can_export")
      .single();

    if (error) {
      throw new Error(`Failed to save tenant settings: ${error.message}`);
    }

    return data as ZapTenantSettings;
  },

  /**
   * Checks if a phone number is blocked for the current tenant.
   */
  async isPhoneBlocked(phone: string): Promise<boolean> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase.rpc("is_phone_blocked", {
      p_phone: phone,
    }).single();

    if (error) {
      throw new Error(`Failed to check phone block status: ${error.message}`);
    }

    return data as boolean;
  },
};

// =================================================================
// 4. AGENT SERVICES
// =================================================================

export const agentService = {
  /**
   * Lists leads assigned to the current agent using the list_my_leads RPC.
   */
  async listMyLeads(params: { status?: LeadStatus } = {}): Promise<ZapLead[]> {
    await requireRole(["AGENT"]);

    const { data, error } = await supabase.rpc("list_my_leads", {
      p_status: params.status || null,
    });

    if (error) {
      throw new Error(`Failed to list my leads: ${error.message}`);
    }

    return data as ZapLead[];
  },

  /**
   * Retrieves a single lead and its associated messages (RLS ensures only agent's leads are returned).
   */
  async getLeadWithMessages(leadId: string): Promise<{ lead: ZapLead; messages: ZapMessage[] }> {
    await requireRole(["AGENT"]);

    const { data, error } = await supabase.rpc("get_lead_with_messages", {
      p_lead_id: leadId,
    }).single<LeadWithMessagesRpcResult>(); // Usando tipagem local

    if (error) {
      throw new Error(`Failed to fetch lead and messages: ${error.message}`);
    }

    const lead = data.lead_data;
    const messages = data.messages_data || [];

    return { lead, messages };
  },

  /**
   * Marks one of the agent's leads as sold.
   */
  async markLeadAsSold(leadId: string): Promise<ZapLead> {
    await requireRole(["AGENT"]);

    const { data, error } = await supabase.rpc("mark_lead_as_sold", {
      p_lead_id: leadId,
    }).single();

    if (error) {
      throw new Error(`Failed to mark lead as sold: ${error.message}`);
    }

    return data as ZapLead;
  },

  /**
   * Checks if a phone number is blocked for the current tenant.
   */
  async isPhoneBlocked(phone: string): Promise<boolean> {
    await requireRole(["AGENT"]);

    const { data, error } = await supabase.rpc("is_phone_blocked", {
      p_phone: phone,
    }).single();

    if (error) {
      throw new Error(`Failed to check phone block status: ${error.message}`);
    }

    return data as boolean;
  },
  
  /**
   * Fetches the current agent's settings.
   */
  async getSettings(): Promise<ZapAgentSettings> {
    const profile = await requireRole(["AGENT"]);

    const { data, error } = await supabase
      .from("agent_settings")
      .select("*, profiles(whatsapp_alert_number)")
      .eq("agent_id", profile.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch agent settings: ${error.message}`);
    }
    
    // If settings don't exist, return defaults
    if (!data) {
        return {
            agent_id: profile.id,
            ai_prompt: null,
            followup_30min_enabled: true,
            followup_24h_enabled: true,
            can_export_leads: false,
            schedule_enabled: false,
            schedule_config: null,
            whatsapp_alert_number: profile.whatsapp_alert_number, // Use profile's number if settings don't exist
        };
    }
    
    // Flatten the profile data (whatsapp_alert_number) into the settings object
    const settings: ZapAgentSettings = {
        ...data,
        // Ensure nested data is correctly accessed and typed
        schedule_config: data.schedule_config as AgentScheduleConfig | null,
        // The nested select returns an array, we extract the number
        whatsapp_alert_number: data.profiles?.whatsapp_alert_number || profile.whatsapp_alert_number,
    };

    return settings;
  },

  /**
   * Saves or updates the current agent's settings.
   */
  async saveSettings(settings: Partial<ZapAgentSettings>): Promise<ZapAgentSettings> {
    const profile = await requireRole(["AGENT"]);
    
    const updateData = {
        ai_prompt: settings.ai_prompt,
        followup_30min_enabled: settings.followup_30min_enabled,
        followup_24h_enabled: settings.followup_24h_enabled,
        can_export_leads: settings.can_export_leads,
        schedule_enabled: settings.schedule_enabled,
        schedule_config: settings.schedule_config,
        agent_id: profile.id,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("agent_settings")
      .upsert(updateData, { onConflict: 'agent_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save agent settings: ${error.message}`);
    }

    // If the agent is independent, they can update their own alert number via profile update
    if (profile.tenant_id === null && settings.whatsapp_alert_number !== undefined) {
        await supabase.from("profiles")
            .update({ whatsapp_alert_number: settings.whatsapp_alert_number, updated_at: new Date().toISOString() })
            .eq("id", profile.id);
    }

    return data as ZapAgentSettings;
  },
  
  /**
   * Updates specific fields of a lead.
   */
  async updateLeadData(leadId: string, updateData: LeadUpdateData): Promise<ZapLead> {
    await requireRole(["AGENT"]);
    
    // RLS on 'leads' table ensures AGENT can only update their own leads.
    const { data, error } = await supabase
      .from("leads")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update lead data: ${error.message}`);
    }

    return data as ZapLead;
  },
  
  /**
   * Placeholder for export logic.
   */
  async exportMyLeads(status?: LeadStatus): Promise<void> {
      // In a real scenario, this would call an Edge Function or RPC to generate CSV/XLSX
      const profile = await requireRole(["AGENT"]);
      console.log(`Exporting leads for agent ${profile.id} with status: ${status}`);
      // Simulate export success
      return;
  },
  
  // --- UAZAPI INTEGRATION ---
  
  /**
   * Calls the Edge Function to get the current instance status.
   */
  async getInstanceStatus(): Promise<UazapiStatusResponse> {
    const { data, error } = await supabase.functions.invoke("uazapi-proxy", {
      method: "POST",
      body: { action: 'status' },
    });

    if (error) {
      throw new Error(`Failed to fetch instance status: ${error.message}`);
    }
    
    if (data && data.error) {
        throw new Error(data.error);
    }

    return data as UazapiStatusResponse;
  },
  
  /**
   * Calls the Edge Function to create a new Uazapi instance.
   */
  async createInstance(): Promise<void> {
    const { data, error } = await supabase.functions.invoke("uazapi-proxy", {
      method: "POST",
      body: { action: 'create-instance' },
    });

    if (error) {
      throw new Error(`Failed to create instance: ${error.message}`);
    }
    
    if (data && data.error) {
        throw new Error(data.error);
    }
  },
  
  /**
   * Calls the Edge Function to connect the instance (returns QR or Pair Code).
   */
  async connectInstance(): Promise<UazapiConnectResponse> {
    const { data, error } = await supabase.functions.invoke("uazapi-proxy", {
      method: "POST",
      body: { action: 'connect' },
    });

    if (error) {
      throw new Error(`Failed to initiate connection: ${error.message}`);
    }
    
    if (data && data.error) {
        throw new Error(data.error);
    }

    return data as UazapiConnectResponse;
  },
  
  /**
   * Calls the Edge Function to disconnect the instance.
   */
  async disconnectInstance(): Promise<void> {
    const { data, error } = await supabase.functions.invoke("uazapi-proxy", {
      method: "POST",
      body: { action: 'disconnect' },
    });

    if (error) {
      throw new Error(`Failed to disconnect instance: ${error.message}`);
    }
    
    if (data && data.error) {
        throw new Error(data.error);
    }
  },
  
  /**
   * Calls the Edge Function to delete the instance.
   */
  async deleteInstance(): Promise<void> {
    const { data, error } = await supabase.functions.invoke("uazapi-proxy", {
      method: "POST",
      body: { action: 'delete' },
    });

    if (error) {
      throw new Error(`Failed to delete instance: ${error.message}`);
    }
    
    if (data && data.error) {
        throw new Error(data.error);
    }
  },
};

// =================================================================
// 5. SUPERADMIN SERVICES
// =================================================================

export interface CreateTenantAndAdminParams {
  tenantName: string;
  adminEmail: string;
  adminPassword: string;
  leadsLimit: number;
}

export interface CreateIndividualAgentParams {
    fullName: string;
    email: string;
    password: string;
}

export const superadminService = {
  /**
   * Lists all tenants in the system.
   */
  async listTenants(): Promise<ZapTenant[]> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, plan_status, plan_expires_at, base_monthly_leads_limit, timezone, created_at, updated_at, whatsapp_central_number");

    if (error) {
      throw new Error(`Failed to list tenants: ${error.message}`);
    }

    return data as ZapTenant[];
  },

  /**
   * Creates a new tenant and its initial ADMIN_TENANT user via Edge Function.
   */
  async createTenantAndAdmin(params: CreateTenantAndAdminParams): Promise<ZapTenant> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase.functions.invoke("create-tenant-and-admin", {
      body: {
        tenant_name: params.tenantName,
        admin_email: params.adminEmail,
        admin_password: params.adminPassword,
        leads_limit: params.leadsLimit,
      },
    });

    if (error) {
      throw new Error(`Failed to create tenant and admin: ${error.message}`);
    }
    
    // The Edge Function returns the created tenant object inside the 'tenant' key
    if (data && data.tenant) {
        return data.tenant as ZapTenant;
    }

    throw new Error("Failed to retrieve created tenant data from Edge Function response.");
  },
  
  /**
   * Creates a new individual agent (AGENT role, no tenant_id) via Edge Function.
   */
  async createIndividualAgent(params: CreateIndividualAgentParams): Promise<ZapProfile> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase.functions.invoke("user-management", {
      body: {
        email: params.email,
        password: params.password,
        full_name: params.fullName,
        role: "AGENT",
        tenant_id: null, // Individual agents don't belong to a tenant
      },
    });

    if (error) {
      throw new Error(`Failed to create individual agent: ${error.message}`);
    }
    
    // Since the Edge Function only returns { message, userId }, we return a minimal object indicating success.
    return { id: data.userId, full_name: params.fullName, role: 'AGENT', tenant_id: null, is_active: true, instance_name: null, instance_created_at: null, instance_id: null, instance_token: null, whatsapp_alert_number: null, created_at: new Date().toISOString() };
  },

  /**
   * Retrieves dashboard statistics for a specific tenant ID.
   */
  async getTenantDashboardStats(tenantId: string): Promise<ZapDashboardStats> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase.rpc("get_tenant_dashboard_stats", {
      p_tenant_id: tenantId,
    }).single<DashboardStatsRpcResult>(); // Usando tipagem local

    if (error) {
      throw new Error(`Failed to fetch dashboard stats for tenant ${tenantId}: ${error.message}`);
    }

    const stats: ZapDashboardStats = {
      total_leads: data.total_leads,
      leads_new: data.leads_new,
      leads_in_progress: data.leads_in_progress,
      leads_qualified: data.leads_qualified,
      leads_abandoned: data.leads_abandoned,
      leads_sold: data.leads_sold,
      total_sales: data.total_sales,
      sales_by_agent: data.sales_by_agent as ZapSalesByAgent[],
    };

    return stats;
  },
  
  /**
   * Updates specific details of a tenant (plan, limits, name).
   */
  async updateTenantDetails(tenantId: string, updateData: TenantUpdateData): Promise<ZapTenant> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase
      .from("tenants")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update tenant details: ${error.message}`);
    }

    return data as ZapTenant;
  },
  
  /**
   * Fetches all global settings.
   */
  async getGlobalSettings(): Promise<GlobalSettings> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase
      .from("global_settings")
      .select("key, value");

    if (error) {
      throw new Error(`Failed to fetch global settings: ${error.message}`);
    }
    
    // Map array of {key, value} to a single object
    const settingsMap = data.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
    }, {} as Record<string, string | null>);
    
    return {
        n8n_webhook_url: settingsMap.n8n_webhook_url || null,
        whatsapp_notification_number: settingsMap.whatsapp_notification_number || null,
    };
  },
  
  /**
   * Saves or updates global settings.
   */
  async saveGlobalSettings(settings: Partial<GlobalSettings>): Promise<void> {
    await requireRole(["SUPERADMIN"]);
    
    const updates = Object.entries(settings)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => ({
            key,
            value: value,
            updated_at: new Date().toISOString(),
        }));

    if (updates.length === 0) return;

    const { error } = await supabase
      .from("global_settings")
      .upsert(updates, { onConflict: 'key' });

    if (error) {
      throw new Error(`Failed to save global settings: ${error.message}`);
    }
  },
  
  /**
   * Retrieves platform-wide statistics (total tenants, agents, leads, sales).
   */
  async getPlatformStats(): Promise<PlatformStats> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase.rpc("get_platform_dashboard_stats").single<PlatformStatsRpcResult>(); // Usando tipagem local

    if (error) {
      throw new Error(`Failed to fetch platform stats: ${error.message}`);
    }

    return data as PlatformStats;
  },
  
  /**
   * Lists all support tickets.
   */
  async listSupportTickets(statusFilter: SupportTicketStatus | 'all' = 'all'): Promise<ZapSupportTicket[]> {
    await requireRole(["SUPERADMIN"]);
    
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order('created_at', { ascending: false });
      
    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list support tickets: ${error.message}`);
    }
    
    // Ensure status field exists, defaulting to 'new' if not present (since we just created the table)
    return (data as ZapSupportTicket[]).map(ticket => ({
        ...ticket,
        status: ticket.status || 'new',
    }));
  },
  
  /**
   * Updates the status of a support ticket.
   */
  async updateSupportTicketStatus(ticketId: string, status: SupportTicketStatus): Promise<ZapSupportTicket> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", ticketId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ticket status: ${error.message}`);
    }

    return data as ZapSupportTicket;
  },
};