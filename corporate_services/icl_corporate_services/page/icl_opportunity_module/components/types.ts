export type ToastMessage = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

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
};

export type WorkflowState = { state: string; color: string };

export type OpportunityDetail = OpportunityRow & {
  workflow_state?: string;
  custom_bid_status?: string;
  custom_bid?: string;
  linked_project?: string;
  opportunity_folder?: { name: string; file_name: string } | null;
  party_name?: string;
  company?: string;
  contact_person?: string;
  contact_display?: string;
  contact_email?: string;
  contact_mobile?: string;
  customer_group?: string;
  campaign?: string;
  industry?: string;
  no_of_employees?: string;
  annual_revenue?: number;
  market_segment?: string;
  website?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  order_lost_reason?: string;
  creation?: string;
  modified?: string;
  owner?: string;
};

export type OpportunityListResult = {
  opportunities: OpportunityRow[];
  total: number;
};
