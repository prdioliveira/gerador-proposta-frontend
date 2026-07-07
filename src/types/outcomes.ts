export type OutcomeStatus = 'pending' | 'approved' | 'lost' | 'negotiating'

export interface ProposalOutcome {
  id: number
  project_id: number
  proposal_filename: string
  status: OutcomeStatus
  estimated_hours: number | null
  actual_hours: number | null
  contract_value: number | null
  external_project_id: string | null
  notes: string | null
  registered_at: string
  updated_at: string
}

export interface OutcomeCreate {
  client: string
  project: string
  proposal_filename: string
  status?: OutcomeStatus
  estimated_hours?: number | null
  actual_hours?: number | null
  contract_value?: number | null
  external_project_id?: string | null
  notes?: string | null
}

export interface OutcomeUpdate {
  status?: OutcomeStatus
  estimated_hours?: number | null
  actual_hours?: number | null
  contract_value?: number | null
  external_project_id?: string | null
  notes?: string | null
}

export interface OutcomeSummary {
  total: number
  by_status: Record<OutcomeStatus, number>
  decided: number
  conversion_rate: number | null
  approved_contract_value: number
}
