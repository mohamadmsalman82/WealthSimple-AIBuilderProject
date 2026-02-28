'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Stub data                                                         */
/* ------------------------------------------------------------------ */

const STUB_AUDIT_ENTRIES = [
    {
        log_id: 'a1',
        actor_id: null as string | null,
        actor_type: 'system',
        action: 'event_created',
        record_type: 'event',
        record_id: 'e1',
        client_id: 'c1',
        metadata: { event_type: 'new_baby', source: 'account_signal', confidence_score: 0.87 } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a2',
        actor_id: null as string | null,
        actor_type: 'system',
        action: 'event_routed',
        record_type: 'event',
        record_id: 'e1',
        client_id: 'c1',
        metadata: { routing_decision: 'routed', confidence_score: 0.87, risk_tier: 'low' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 119 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a3',
        actor_id: null as string | null,
        actor_type: 'system',
        action: 'brief_generated',
        record_type: 'brief',
        record_id: 'b1',
        client_id: 'c1',
        metadata: { event_type: 'new_baby', confidence_score: 0.87, rules_version: '2025-01', model_used: 'claude-opus-4-6' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 118 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a4',
        actor_id: 'advisor-demo',
        actor_type: 'advisor',
        action: 'brief_approved',
        record_type: 'brief',
        record_id: 'b1',
        client_id: 'c1',
        metadata: { advisor_id: 'advisor-demo', was_edited: true, original_content_hash: 'abc123', final_content_hash: 'def456' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a5',
        actor_id: null as string | null,
        actor_type: 'system',
        action: 'notification_sent',
        record_type: 'notification',
        record_id: 'n1',
        client_id: 'c1',
        metadata: { brief_id: 'b1', delivery_channel: 'in_app', headline: 'We noticed something. Here\'s what it means for your money.' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 46 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a6',
        actor_id: 'c1',
        actor_type: 'client',
        action: 'event_created',
        record_type: 'event',
        record_id: 'e2',
        client_id: 'c1',
        metadata: { event_type: 'new_baby', source: 'self_reported', confidence_score: 0.95 } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a7',
        actor_id: null as string | null,
        actor_type: 'system',
        action: 'event_created',
        record_type: 'event',
        record_id: 'e3',
        client_id: 'c2',
        metadata: { event_type: 'lump_sum_deposit', source: 'account_signal', confidence_score: 0.71 } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a8',
        actor_id: null as string | null,
        actor_type: 'system',
        action: 'event_held',
        record_type: 'event',
        record_id: 'e3',
        client_id: 'c2',
        metadata: { routing_decision: 'held', confidence_score: 0.71, risk_tier: 'high' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 94 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a9',
        actor_id: 'advisor-demo',
        actor_type: 'advisor',
        action: 'event_classified',
        record_type: 'event',
        record_id: 'e3',
        client_id: 'c2',
        metadata: { routing_decision: 'escalate', confidence_score: 0.71, risk_tier: 'high' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 33 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a10',
        actor_id: 'advisor-demo',
        actor_type: 'advisor',
        action: 'brief_rejected',
        record_type: 'brief',
        record_id: 'b2',
        client_id: 'c3',
        metadata: { advisor_id: 'advisor-demo', rejection_reason: 'misclassified_event' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a11',
        actor_id: 'advisor-demo',
        actor_type: 'advisor',
        action: 'brief_flagged',
        record_type: 'brief',
        record_id: 'b3',
        client_id: 'c4',
        metadata: { advisor_id: 'advisor-demo', flag_reason: 'Recommendation may conflict with client risk profile' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 72 * 60 * 1000).toISOString(),
    },
    {
        log_id: 'a12',
        actor_id: null as string | null,
        actor_type: 'system',
        action: 'brief_generated',
        record_type: 'brief',
        record_id: 'b4',
        client_id: 'c3',
        metadata: { event_type: 'retirement_approaching', confidence_score: 0.95, rules_version: '2025-01', model_used: 'claude-opus-4-6' } as Record<string, unknown>,
        timestamp: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
    },
]

type AuditEntry = (typeof STUB_AUDIT_ENTRIES)[number]

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const ACTION_LABELS: Record<string, string> = {
    event_created: 'Event Created',
    event_routed: 'Routed',
    event_held: 'Held for Review',
    event_classified: 'Classified',
    event_dismissed: 'Dismissed',
    event_escalated: 'Escalated',
    brief_generated: 'Brief Generated',
    brief_approved: 'Approved',
    brief_rejected: 'Rejected',
    brief_flagged: 'Flagged',
    notification_sent: 'Notification Sent',
}

function actionColor(action: string): string {
    if (action === 'brief_approved' || action === 'notification_sent') return '#00C07B'
    if (action === 'brief_rejected') return '#E8443A'
    if (action === 'brief_flagged' || action === 'event_held' || action === 'event_escalated') return '#F5A623'
    return '#32302F'
}

const ACTOR_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    system: { bg: '#F7F6F4', color: '#6B6867', label: 'System' },
    advisor: { bg: '#E8F4FF', color: '#2B6CB0', label: 'Advisor' },
    client: { bg: '#E6F9F1', color: '#00C07B', label: 'Client' },
}

const RECORD_STYLES: Record<string, { bg: string; color: string }> = {
    event: { bg: '#F7F6F4', color: '#6B6867' },
    brief: { bg: '#F3EEFF', color: '#6B46C1' },
    notification: { bg: '#E6F9F1', color: '#00C07B' },
}

function formatTimestamp(iso: string): { date: string; time: string } {
    const d = new Date(iso)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const date = `${months[d.getMonth()]} ${d.getDate()}`
    const hours = d.getHours()
    const mins = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const h12 = hours % 12 || 12
    return { date, time: `${h12}:${mins} ${ampm}` }
}

<<<<<<< HEAD
function truncateId(id: string | null): string {
=======
function truncateId(id: string | null | undefined): string {
>>>>>>> a26ed4f0d422a0f0d8a05c2f90051e712edc4384
    if (!id) return '—'
    return id.length > 8 ? id.slice(0, 8) + '…' : id
}


function renderMetadataInline(meta: Record<string, unknown>): React.ReactNode {
    const parts: React.ReactNode[] = []
    Object.entries(meta).forEach(([key, val], i) => {
        if (key === 'was_edited') {
            parts.push(
                <span key={key}>
                    {i > 0 && ' · '}
                    {val ? (
                        <span style={{ color: '#00C07B' }}>edited ✓</span>
                    ) : (
                        <span style={{ color: '#6B6867' }}>not edited</span>
                    )}
                </span>
            )
        } else {
            parts.push(
                <span key={key}>
                    {i > 0 && ' · '}
                    {key}: {String(val)}
                </span>
            )
        }
    })
    return parts
}

/* ------------------------------------------------------------------ */
/*  Nav bar                                                           */
/* ------------------------------------------------------------------ */

function AdvisorNav() {
    const pathname = usePathname()
    const links = [
        { label: 'Queue', href: '/advisor/queue' },
        { label: 'High-Consequence', href: '/advisor/high-consequence' },
        { label: 'Audit Log', href: '/advisor/audit' },
    ]

    return (
        <div style={{ display: 'flex', gap: 24 }}>
            {links.map((link) => {
                const active = pathname === link.href
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        style={{
                            fontSize: 14,
                            color: active ? '#32302F' : '#6B6867',
                            fontWeight: active ? 500 : 400,
                            textDecoration: 'none',
                            borderBottom: active ? '2px solid #00C07B' : '2px solid transparent',
                            paddingBottom: 2,
                            transition: 'color 150ms ease',
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#32302F' }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#6B6867' }}
                    >
                        {link.label}
                    </Link>
                )
            })}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Segmented control                                                 */
/* ------------------------------------------------------------------ */

function SegmentedControl<T extends string>({
    options, value, onChange,
}: {
    options: { label: string; value: T }[]
    value: T
    onChange: (v: T) => void
}) {
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {options.map((opt) => {
                const active = opt.value === value
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        style={{
                            padding: '6px 16px',
                            fontSize: 13,
                            borderRadius: 100,
                            border: active ? 'none' : '1px solid #EBEBEB',
                            background: active ? '#32302F' : '#FFFFFF',
                            color: active ? '#FFFFFF' : '#6B6867',
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            transition: 'all 150ms ease',
                        }}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Metadata tooltip cell                                             */
/* ------------------------------------------------------------------ */

function MetadataCell({ meta }: { meta: Record<string, unknown> }) {
    const [showTip, setShowTip] = useState(false)

    return (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
        >
            <div
                style={{
                    fontSize: 11,
                    color: '#6B6867',
                    lineHeight: 1.6,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    wordBreak: 'break-word' as const,
                }}
            >
                {renderMetadataInline(meta)}
            </div>
            {showTip && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        background: '#32302F',
                        color: '#FFFFFF',
                        fontSize: 11,
                        borderRadius: 8,
                        padding: '10px 12px',
                        maxWidth: 300,
                        zIndex: 20,
                        fontFamily: 'monospace',
                        whiteSpace: 'pre',
                        marginBottom: 4,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}
                >
                    {JSON.stringify(meta, null, 2)}
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Filter types                                                      */
/* ------------------------------------------------------------------ */

type ActorFilter = 'all' | 'system' | 'advisor' | 'client'
type RecordFilter = 'all' | 'event' | 'brief' | 'notification'

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function AuditLogPage() {
    const [allEntries, setAllEntries] = useState(STUB_AUDIT_ENTRIES)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const result = await api.get('/api/audit?limit=50&offset=0') as any
                if (result?.entries) setAllEntries(result.entries)
            } catch (err) {
                console.log('Using stub data for audit:', err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    // Filters
    const [actorFilter, setActorFilter] = useState<ActorFilter>('all')
    const [actionFilter, setActionFilter] = useState<string>('all')
    const [recordFilter, setRecordFilter] = useState<RecordFilter>('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Hover
    const [hoveredRow, setHoveredRow] = useState<string | null>(null)

    const clearFilters = () => {
        setActorFilter('all')
        setActionFilter('all')
        setRecordFilter('all')
        setDateFrom('')
        setDateTo('')
    }

    // Filtered entries
    const filtered = useMemo(() => {
        let result = [...allEntries]

        if (actorFilter !== 'all') {
            result = result.filter((e) => e.actor_type === actorFilter)
        }
        if (actionFilter !== 'all') {
            result = result.filter((e) => e.action === actionFilter)
        }
        if (recordFilter !== 'all') {
            result = result.filter((e) => e.record_type === recordFilter)
        }
        if (dateFrom) {
            const from = new Date(dateFrom).getTime()
            result = result.filter((e) => new Date(e.timestamp).getTime() >= from)
        }
        if (dateTo) {
            const to = new Date(dateTo).getTime() + 86400000 // end of day
            result = result.filter((e) => new Date(e.timestamp).getTime() <= to)
        }

        // Sort newest first
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        return result
    }, [allEntries, actorFilter, actionFilter, recordFilter, dateFrom, dateTo])

    // Summary stats
    const stats = useMemo(() => {
        const briefsGenerated = filtered.filter((e) => e.action === 'brief_generated').length
        const briefsApproved = filtered.filter((e) => e.action === 'brief_approved').length
        const advisorEdits = filtered.filter(
            (e) => e.action === 'brief_approved' && e.metadata.was_edited === true
        ).length
        const escalations = filtered.filter(
            (e) =>
                e.action === 'event_escalated' ||
                (e.action === 'event_classified' && e.metadata.routing_decision === 'escalate')
        ).length
        return { briefsGenerated, briefsApproved, advisorEdits, escalations }
    }, [filtered])

    // Export CSV
    const handleExport = useCallback(() => {
        const headers = ['timestamp', 'actor_type', 'actor_id', 'action', 'record_type', 'record_id', 'client_id', 'metadata']
        const rows = filtered.map((e) => [
            e.timestamp,
            e.actor_type,
            e.actor_id ?? '',
            e.action,
            e.record_type,
            e.record_id,
            e.client_id,
            JSON.stringify(e.metadata),
        ])
        const csvString = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
        const blob = new Blob([csvString], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [filtered])

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#F7F6F4',
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            {/* ---- Top bar ---- */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 32px',
                    background: '#FFFFFF',
                    borderBottom: '1px solid #EBEBEB',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#32302F', fontWeight: 700 }}>
                        WealthEasy
                    </span>
                    <span style={{ color: '#EBEBEB', fontSize: 20 }}>/</span>
                    <span style={{ color: '#6B6867', fontSize: 14, marginRight: 16 }}>Advisor Portal</span>
                    <AdvisorNav />
                </div>
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#00C07B',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 500,
                    }}
                >
                    AD
                </div>
            </div>

            {/* ---- Page content ---- */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px 64px' }}>
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                        <h1
                            style={{
                                fontFamily: 'Georgia, serif',
                                fontSize: 28,
                                color: '#32302F',
                                margin: 0,
                                fontWeight: 400,
                            }}
                        >
                            Audit Log
                        </h1>
                        <p style={{ color: '#6B6867', fontSize: 14, margin: '6px 0 0' }}>
                            Immutable record of all system, advisor, and client actions
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        style={{
                            background: '#FFFFFF',
                            border: '1px solid #EBEBEB',
                            color: '#32302F',
                            borderRadius: 100,
                            padding: '8px 18px',
                            fontSize: 13,
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            transition: 'all 150ms ease',
                            flexShrink: 0,
                        }}
                    >
                        Export CSV
                    </button>
                </div>

                {/* ---- Summary stats ---- */}
                <div style={{ display: 'flex', gap: 16, margin: '24px 0' }}>
                    {[
                        { label: 'Briefs Generated', value: stats.briefsGenerated },
                        { label: 'Briefs Approved', value: stats.briefsApproved },
                        { label: 'Advisor Edits', value: stats.advisorEdits },
                        { label: 'Escalations', value: stats.escalations },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            style={{
                                flex: 1,
                                background: '#FFFFFF',
                                borderRadius: 12,
                                padding: '16px 20px',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            }}
                        >
                            <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#32302F' }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: 12, color: '#6B6867', marginTop: 4 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* ---- Filter bar ---- */}
                <div
                    style={{
                        background: '#FFFFFF',
                        borderRadius: 12,
                        padding: '16px 20px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        marginBottom: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap',
                    }}
                >
                    <SegmentedControl<ActorFilter>
                        options={[
                            { label: 'All', value: 'all' },
                            { label: 'System', value: 'system' },
                            { label: 'Advisor', value: 'advisor' },
                            { label: 'Client', value: 'client' },
                        ]}
                        value={actorFilter}
                        onChange={setActorFilter}
                    />

                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        style={{
                            border: '1px solid #EBEBEB',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 13,
                            background: '#FFFFFF',
                            color: '#32302F',
                            fontFamily: "'DM Sans', sans-serif",
                            cursor: 'pointer',
                            outline: 'none',
                        }}
                    >
                        <option value="all">All Actions</option>
                        <option value="event_created">event_created</option>
                        <option value="event_routed">event_routed</option>
                        <option value="event_held">event_held</option>
                        <option value="event_classified">event_classified</option>
                        <option value="event_dismissed">event_dismissed</option>
                        <option value="event_escalated">event_escalated</option>
                        <option value="brief_generated">brief_generated</option>
                        <option value="brief_approved">brief_approved</option>
                        <option value="brief_rejected">brief_rejected</option>
                        <option value="brief_flagged">brief_flagged</option>
                        <option value="notification_sent">notification_sent</option>
                    </select>

                    <SegmentedControl<RecordFilter>
                        options={[
                            { label: 'All', value: 'all' },
                            { label: 'Event', value: 'event' },
                            { label: 'Brief', value: 'brief' },
                            { label: 'Notification', value: 'notification' },
                        ]}
                        value={recordFilter}
                        onChange={setRecordFilter}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#6B6867' }}>From</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{
                                border: '1px solid #EBEBEB',
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 13,
                                color: '#32302F',
                                fontFamily: "'DM Sans', sans-serif",
                                outline: 'none',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#00C07B')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#EBEBEB')}
                        />
                        <span style={{ fontSize: 12, color: '#6B6867' }}>To</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{
                                border: '1px solid #EBEBEB',
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 13,
                                color: '#32302F',
                                fontFamily: "'DM Sans', sans-serif",
                                outline: 'none',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = '#00C07B')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = '#EBEBEB')}
                        />
                    </div>

                    <button
                        onClick={clearFilters}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#6B6867',
                            fontSize: 13,
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            padding: '4px 8px',
                            transition: 'color 150ms ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#32302F')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6867')}
                    >
                        Clear all
                    </button>
                </div>

                {/* ---- Log table ---- */}
                <div
                    style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Column headers */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '160px 100px 140px 120px 1fr 100px',
                            padding: '10px 12px',
                            borderBottom: '1px solid #EBEBEB',
                        }}
                    >
                        {['TIMESTAMP', 'ACTOR', 'ACTION', 'RECORD', 'METADATA', 'CLIENT'].map((h) => (
                            <span
                                key={h}
                                style={{
                                    fontSize: 11,
                                    color: '#6B6867',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontWeight: 500,
                                }}
                            >
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Rows */}
                    {filtered.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <p style={{ color: '#6B6867', fontSize: 14 }}>No entries match the current filters</p>
                        </div>
                    ) : (
                        filtered.map((entry, idx) => {
                            const ts = formatTimestamp(entry.timestamp)
                            const actor = ACTOR_STYLES[entry.actor_type] ?? ACTOR_STYLES.system
                            const record = RECORD_STYLES[entry.record_type] ?? RECORD_STYLES.event
                            const isHovered = hoveredRow === entry.log_id

                            return (
                                <div
                                    key={entry.log_id}
                                    className="slide-up"
                                    onMouseEnter={() => setHoveredRow(entry.log_id)}
                                    onMouseLeave={() => setHoveredRow(null)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '160px 100px 140px 120px 1fr 100px',
                                        padding: '12px',
                                        borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid #EBEBEB',
                                        fontSize: 13,
                                        color: '#32302F',
                                        background: isHovered ? '#F7F6F4' : 'transparent',
                                        transition: 'background 150ms ease',
                                        alignItems: 'center',
                                        opacity: 0,
                                        animationDelay: `${idx * 30}ms`,
                                        animationFillMode: 'forwards',
                                    }}
                                >
                                    {/* TIMESTAMP */}
                                    <div>
                                        <div style={{ fontSize: 12, color: '#32302F' }}>{ts.date}</div>
                                        <div style={{ fontSize: 11, color: '#6B6867' }}>{ts.time}</div>
                                    </div>

                                    {/* ACTOR */}
                                    <div>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                background: actor.bg,
                                                color: actor.color,
                                                borderRadius: 100,
                                                padding: '2px 10px',
                                                fontSize: 11,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {actor.label}
                                        </span>
                                    </div>

                                    {/* ACTION */}
                                    <div style={{ color: actionColor(entry.action), fontWeight: 500, fontSize: 13 }}>
                                        {ACTION_LABELS[entry.action] ?? entry.action}
                                    </div>

                                    {/* RECORD */}
                                    <div>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                background: record.bg,
                                                color: record.color,
                                                borderRadius: 100,
                                                padding: '2px 10px',
                                                fontSize: 11,
                                                fontWeight: 500,
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {entry.record_type}
                                        </span>
                                        <div style={{ fontSize: 11, color: '#6B6867', marginTop: 2 }}>
                                            {truncateId(entry.record_id)}
                                        </div>
                                    </div>

                                    {/* METADATA */}
                                    <MetadataCell meta={entry.metadata} />

                                    {/* CLIENT */}
                                    <div style={{ fontSize: 12, color: '#6B6867' }}>
                                        {truncateId(entry.client_id)}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* ---- Pagination ---- */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 16,
                        padding: '8px 0',
                    }}
                >
                    <span style={{ fontSize: 13, color: '#6B6867' }}>
                        Showing 1–{filtered.length} of {filtered.length} entries
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            disabled
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #EBEBEB',
                                color: '#6B6867',
                                borderRadius: 100,
                                padding: '8px 16px',
                                fontSize: 13,
                                fontFamily: "'DM Sans', sans-serif",
                                cursor: 'not-allowed',
                                opacity: 0.4,
                            }}
                        >
                            ← Previous
                        </button>
                        <button
                            disabled
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #EBEBEB',
                                color: '#6B6867',
                                borderRadius: 100,
                                padding: '8px 16px',
                                fontSize: 13,
                                fontFamily: "'DM Sans', sans-serif",
                                cursor: 'not-allowed',
                                opacity: 0.4,
                            }}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
