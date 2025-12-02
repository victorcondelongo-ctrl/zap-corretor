import { supabase } from "@/integrations/supabase/client";

// =================================================================
// 1. TYPESCRIPT DEFINITIONS
// =================================================================

export type ZapRole = "SUPERADMIN" | "ADMIN_TENANT" | "AGENT";
export type LeadStatus = "new" | "in_progress" | "qualified" | "abandoned" | "sold";
export type SenderType = "lead" | "ai" | "agent";

export interface ZapProfile {
  id: string;
  full_name: string;
  role: ZapRole;
  tenant_id: string | null;
  is_active: boolean;
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
  plan_status: string;
  plan_expires_at: string | null;
  base_monthly_leads_limit: number;
  timezone: string;
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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  // Ensure tenant_id is correctly typed as string | null
  const typedProfile: ZapProfile = {
    ...profile,
    tenant_id: profile.tenant_id as string | null,
  };

  return typedProfile;
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

// =================================================================
// 3. ADMIN_TENANT SERVICES
// =================================================================

export const adminTenantService = {
  /**
   * Lists all active agents within the ADMIN_TENANT's organization.
   */
  async listAgents(): Promise<ZapProfile[]> {
    const profile = await requireRole(["ADMIN_TENANT"]);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .eq("role", "AGENT")
      .eq("is_active", true);

    if (error) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }

    return data as ZapProfile[];
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
};

// =================================================================
// 5. SUPERADMIN SERVICES
// =================================================================

export const superadminService = {
  /**
   * Lists all tenants in the system.
   */
  async listTenants(): Promise<ZapTenant[]> {
    await requireRole(["SUPERADMIN"]);

    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, plan_status, plan_expires_at, base_monthly_leads_limit, timezone, created_at");

    if (error) {
      throw new Error(`Failed to list tenants: ${error.message}`);
    }

    return data as ZapTenant[];
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
};