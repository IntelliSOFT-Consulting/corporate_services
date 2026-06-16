export type OpportunityRow = {
  name: string;
  title?: string;
  customer_name?: string;
  opportunity_from?: string;
  status?: string;
  sales_stage?: string;
  opportunity_amount?: number;
  currency?: string;
  expected_closing?: string;
  opportunity_owner?: string;
  transaction_date?: string;
  probability?: number;
  territory?: string;
  source?: string;
  workflow_state?: string;
};

export type OpportunityStats = {
  by_status: Array<{ status: string; count: number }>;
  by_opportunity_from: Array<{ opportunity_from: string; count: number }>;
  by_workflow_state: Array<{ workflow_state: string; count: number }>;
  total: number;
};

export type OpportunityDetail = OpportunityRow & {
  company?: string;
  campaign?: string;
  linked_project?: string | null;
  custom_bid_status?: string;
  owner?: string;
  modified?: string;
  contact_person?: string;
  contact_email?: string;
  contact_mobile?: string;
  phone?: string;
  city?: string;
  country?: string;
  industry?: string;
  market_segment?: string;
  no_of_employees?: string;
  annual_revenue?: number;
  reminder_activities?: Array<{ name: string; owner: string; creation: string; content: string }>;
  opportunity_folder?: { name: string; file_name: string } | null;
};

export type WorkflowStateInfo = {
  state: string;
  color: string;
};
