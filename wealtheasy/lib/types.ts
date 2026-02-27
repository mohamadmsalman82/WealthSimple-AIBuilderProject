export interface Client {
    id: string
    name: string
    email: string
    age: number
    province: string
    income_bracket: string
    accounts: string[]
    tfsa_room: number
    rrsp_room: number
    dependents: number
    avatar_initials: string
    portfolio_total: number
    created_at: string
}

export interface LifeEvent {
    id: string
    client_id: string
    event_type: string
    source: 'self_reported' | 'account_signal'
    confidence_score: number
    risk_tier: 'low' | 'high'
    status: 'pending_classification' | 'routed' | 'held' | 'dismissed' | 'escalated' | 'generating'
    routing_decision: string | null
    signal_summary: string | null
    advisor_id: string | null
    created_at: string
    resolved_at: string | null
}

export interface Brief {
    id: string
    client_id: string
    event_id: string
    status: 'generating' | 'pending' | 'approved' | 'rejected' | 'flagged'
    content: BriefContent | null
    original_content_hash: string | null
    final_content_hash: string | null
    was_edited: boolean | null
    advisor_id: string | null
    rejection_reason: string | null
    flag_reason: string | null
    approved_at: string | null
    rejected_at: string | null
    flagged_at: string | null
    created_at: string
}

export interface BriefContent {
    summary: string
    actions: BriefAction[]
}

export interface BriefAction {
    rank: number
    title: string
    explanation: string
    cta_label: string
    cta_link: string
    client_action?: 'done' | 'saved' | 'dismissed' | null
}

export interface Notification {
    id: string
    brief_id: string
    client_id: string
    headline: string
    status: 'delivered' | 'opened' | 'dismissed'
    delivered_at: string
    opened_at: string | null
}

export interface AuditEntry {
    id: string
    actor_id: string | null
    actor_type: 'system' | 'advisor' | 'client'
    action: string
    record_type: 'event' | 'brief' | 'notification'
    record_id: string
    client_id: string | null
    metadata: Record<string, unknown>
    timestamp: string
}

export interface Transaction {
    id: string
    client_id: string
    amount: number
    merchant_category: string | null
    transaction_type: 'credit' | 'debit'
    description: string | null
    date: string
    created_at: string
}

export interface RecommendationRule {
    id: string
    rule_type: string
    rule_content: string
    effective_date: string
    expiry_date: string | null
    last_reviewed_at: string
    reviewed_by: string | null
}
