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
  // New field for individual export permission (to be added to DB later if needed, but defined here for future use)
  can_export_leads?: boolean; 
}

export interface ZapLead {
  id: string;
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
  id: string;
  lead_id: string;
  sender_type: SenderType;
  sender_profile_id: string | null;
  body: string;
  created_at: string;
}

export interface ZapSalesByAgent {
  agent_id: string;
  sales_count: number;
}

export interface ZapDashboardStats {
  total_leads: number;
  leads_new: number;
  leads_in_progress: number;
  leads_qualified: number;
  leads_abandoned: number;
  leads_sold: number;
  total_sales: number;
  sales_by_agent: ZapSalesByAgent[];
}

export interface ZapTenant {
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

export interface ZapAgentSettings {
  agent_id: string;
  ai_prompt: string | null;
  followup_30min_enabled: boolean;
  followup_24h_enabled: boolean;
}

export interface ZapTenantSettings {
  tenant_id: string;
  distribution_mode: DistributionMode;
  default_ai_prompt: string | null;
  agents_can_export: boolean;
}

export interface LeadUpdateData {
  name?: string | null;
  cpf?: string | null;
  cep?: string | null;
  plate?: string | null;
}

export interface TenantUpdateData {
  name?: string;
  plan_status?: string;
  plan_expires_at?: string | null;
  base_monthly_leads_limit?: number;
  timezone?: string;
}

export interface GlobalSettings {
  n8n_webhook_url: string | null;
  whatsapp_notification_number: string | null;
}

export interface PlatformStats {
    total_tenants: number;
    total_agents: number;
    total_leads: number;
    total_sales: number;
}

export interface SupportTicketData {
    name: string;
    email: string;
    phone: string | null;
    message: string;
}

export type SupportTicketStatus = 'new' | 'in_progress' | 'closed';

export interface ZapSupportTicket {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    message: string;
    status: SupportTicketStatus;
    created_at: string;
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
      .select("*")
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

    // Ensure tenant_id is correctly typed as string | null
    const typedProfile: ZapProfile = {
      ...profile,
      tenant_id: profile.tenant_id as string | null,
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

export const adminTenantService = {
  /**
   * Lists all active agents within the ADMIN_TENANT's organization.
   */
  async listAgents(): Promise<ZapProfile[]> {
    await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, tenant_id, is_active, created_at")
      .eq("role", "AGENT"); // RLS will filter by tenant_id automatically

    if (error) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }

    return data as ZapProfile[];
  },
  
  /**
   * Updates an agent's profile (name and active status).
   */
  async updateAgentProfile(agentId: string, updateData: { full_name?: string, is_active?: boolean }): Promise<ZapProfile> {
    const profile = await requireRole(["ADMIN_TENANT"]);
    
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", agentId)
      .eq("tenant_id", profile.tenant_id) // RLS check is redundant but good practice
      .eq("role", "AGENT") // Ensure we only update agents
      .select("id, full_name, role, tenant_id, is_active, created_at")
      .single();

    if (error) {
      throw new Error(`Failed to update agent profile: ${error.message}`);
    }

    return data as ZapProfile;
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
    }).single();

    if (error) {
      throw new Error(`Failed to fetch lead and messages: ${error.message}`);
    }

    // The RPC returns lead_data and messages_data as JSON objects/arrays
    const lead = data.lead_data as ZapLead;
    const messages = data.messages_data as ZapMessage[] || [];

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

    const { data, error } = await supabase.rpc("get_tenant_dashboard_stats").single();

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
    }).single();

    if (error) {
      throw new Error(`Failed to fetch lead and messages: ${error.message}`);
    }

    const lead = data.lead_data as ZapLead;
    const messages = data.messages_data as ZapMessage[] || [];

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
      .select("*")
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
        };
    }

    return data as ZapAgentSettings;
  },

  /**
   * Saves or updates the current agent's settings.
   */
  async saveSettings(settings: Partial<ZapAgentSettings>): Promise<ZapAgentSettings> {
    const profile = await requireRole(["AGENT"]);
    
    const updateData = {
        ...settings,
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
  }
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

    // NOTE: This function is currently unused as the signup flow handles tenant creation via trigger.
    // Keeping it for Superadmin manual creation flow later.
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
    
    // The Edge Function returns a success message, we need to fetch the profile manually
    // For simplicity in this MVP, we assume success and return a placeholder/refetch.
    // In a real scenario, the Edge Function should return the created profile data.
    
    // Since the Edge Function only returns { message, userId }, we can't return ZapProfile directly.
    // We'll rely on the caller to refetch the list or handle the success message.
    // For now, we return a minimal object indicating success.
    return { id: data.userId, full_name: params.fullName, role: 'AGENT', tenant_id: null, is_active: true };
  },

  /**
   * Retrieves dashboard statistics for a specific tenant ID.
   */
  async getTenantDashboardStats(tenantId: string): Promise<ZapDashboardStats> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase.rpc("get_tenant_dashboard_stats", {
      p_tenant_id: tenantId,
    }).single();

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

    const { data, error } = await supabase.rpc("get_platform_dashboard_stats").single();

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