'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

/* ------------------------------------------------------------------ */
/*  Stub data                                                         */
/* ------------------------------------------------------------------ */

const STUB_BRIEFS = [
    {
        brief_id: '1',
        client_id: 'c1',
        client_name: 'Sarah Chen',
        event_type: 'new_baby',
        confidence_score: 0.87,
        source: 'account_signal' as const,
        risk_tier: 'low' as const,
        status: 'pending' as const,
        created_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
        time_in_queue_minutes: 47,
    },
    {
        brief_id: '2',
        client_id: 'c2',
        client_name: 'James Okafor',
        event_type: 'retirement_approaching',
        confidence_score: 0.95,
        source: 'self_reported' as const,
        risk_tier: 'low' as const,
        status: 'pending' as const,
        created_at: new Date(Date.now() - 112 * 60 * 1000).toISOString(),
        time_in_queue_minutes: 112,
    },
    {
        brief_id: '3',
        client_id: 'c3',
        client_name: 'Marcus Tremblay',
        event_type: 'lump_sum_deposit',
        confidence_score: 0.71,
        source: 'account_signal' as const,
        risk_tier: 'high' as const,
        status: 'pending' as const,
        created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        time_in_queue_minutes: 8,
    },
]

type BriefStub = (typeof STUB_BRIEFS)[number]

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const EVENT_LABELS: Record<string, string> = {
    new_baby: 'New Baby',
    retirement_approaching: 'Retirement Approaching',
    lump_sum_deposit: 'Lump Sum Deposit',
    marriage: 'Marriage',
    divorce: 'Divorce',
    job_loss: 'Job Loss',
    job_change: 'Job Change',
    home_purchase: 'Home Purchase',
    inheritance: 'Inheritance',
    major_medical: 'Major Medical',
    education_funding: 'Education Funding',
    business_start: 'Business Start',
}

function formatQueueTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getInitials(name: string): string {
    const parts = name.split(' ')
    return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
}

function confidenceColor(score: number): string {
    if (score >= 0.8) return '#00C07B'
    if (score >= 0.6) return '#F5A623'
    return '#E8443A'
}

/* ------------------------------------------------------------------ */
/*  Filter / Sort types                                               */
/* ------------------------------------------------------------------ */

type RiskFilter = 'all' | 'low' | 'high'
type SourceFilter = 'all' | 'self_reported' | 'account_signal'
type SortOption = 'oldest' | 'newest' | 'confidence_high' | 'confidence_low'

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
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

function SkeletonRow() {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 120px',
                padding: '16px 20px',
                gap: 12,
                alignItems: 'center',
                borderBottom: '1px solid #EBEBEB',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="pulse" style={{ width: 28, height: 28, borderRadius: '50%', background: '#EBEBEB' }} />
                <div className="pulse" style={{ width: 120, height: 14, borderRadius: 4, background: '#EBEBEB' }} />
            </div>
            <div className="pulse" style={{ width: 100, height: 14, borderRadius: 4, background: '#EBEBEB' }} />
            <div className="pulse" style={{ width: 60, height: 22, borderRadius: 100, background: '#EBEBEB' }} />
            <div className="pulse" style={{ width: 40, height: 14, borderRadius: 4, background: '#EBEBEB' }} />
            <div className="pulse" style={{ width: 50, height: 22, borderRadius: 100, background: '#EBEBEB' }} />
            <div className="pulse" style={{ width: 40, height: 14, borderRadius: 4, background: '#EBEBEB' }} />
            <div className="pulse" style={{ width: 80, height: 32, borderRadius: 100, background: '#EBEBEB' }} />
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function AdvisorQueuePage() {
    const router = useRouter()

    // State machine: 'loading' | 'error' | 'loaded'
    const [pageState, setPageState] = useState<'loading' | 'error' | 'loaded'>('loaded')
    const [briefs] = useState<BriefStub[]>(STUB_BRIEFS)

    // Filters
    const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
    const [sort, setSort] = useState<SortOption>('oldest')

    // Hover state for rows
    const [hoveredRow, setHoveredRow] = useState<string | null>(null)

    // Filtered + sorted briefs
    const filteredBriefs = useMemo(() => {
        let result = [...briefs]

        if (riskFilter !== 'all') {
            result = result.filter((b) => b.risk_tier === riskFilter)
        }
        if (sourceFilter !== 'all') {
            result = result.filter((b) => b.source === sourceFilter)
        }

        switch (sort) {
            case 'oldest':
                result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                break
            case 'newest':
                result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                break
            case 'confidence_high':
                result.sort((a, b) => b.confidence_score - a.confidence_score)
                break
            case 'confidence_low':
                result.sort((a, b) => a.confidence_score - b.confidence_score)
                break
        }

        return result
    }, [briefs, riskFilter, sourceFilter, sort])

    /* ---- Render helpers ---- */

    const renderSourcePill = (source: string) => {
        const isSelf = source === 'self_reported'
        return (
            <span
                style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 500,
                    background: isSelf ? '#F7F6F4' : '#FFF3E0',
                    color: isSelf ? '#6B6867' : '#F5A623',
                }}
            >
                {isSelf ? 'Self-reported' : 'Signal'}
            </span>
        )
    }

    const renderRiskPill = (risk: string) => {
        const isLow = risk === 'low'
        return (
            <span
                style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 500,
                    background: isLow ? '#E6F9F1' : '#FDE8E7',
                    color: isLow ? '#00C07B' : '#E8443A',
                }}
            >
                {isLow ? 'Low' : 'High'}
            </span>
        )
    }

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
                    <span
                        style={{
                            fontFamily: 'Georgia, serif',
                            fontSize: 20,
                            color: '#32302F',
                            fontWeight: 700,
                        }}
                    >
                        WealthEasy
                    </span>
                    <span style={{ color: '#EBEBEB', fontSize: 20 }}>/</span>
                    <span style={{ color: '#6B6867', fontSize: 14 }}>Advisor Portal</span>
                </div>

                {/* Avatar */}
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
                {/* Title */}
                <h1
                    style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 28,
                        color: '#32302F',
                        margin: 0,
                        fontWeight: 400,
                    }}
                >
                    Review Queue
                </h1>
                <p style={{ color: '#6B6867', fontSize: 14, margin: '6px 0 28px' }}>
                    {briefs.length} brief{briefs.length !== 1 ? 's' : ''} awaiting review
                </p>

                {/* ---- Filter bar ---- */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        marginBottom: 20,
                        flexWrap: 'wrap',
                    }}
                >
                    <SegmentedControl<RiskFilter>
                        options={[
                            { label: 'All', value: 'all' },
                            { label: 'Low', value: 'low' },
                            { label: 'High', value: 'high' },
                        ]}
                        value={riskFilter}
                        onChange={setRiskFilter}
                    />

                    <SegmentedControl<SourceFilter>
                        options={[
                            { label: 'All', value: 'all' },
                            { label: 'Self-reported', value: 'self_reported' },
                            { label: 'Signal', value: 'account_signal' },
                        ]}
                        value={sourceFilter}
                        onChange={setSourceFilter}
                    />

                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortOption)}
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
                        <option value="oldest">Oldest first</option>
                        <option value="newest">Newest first</option>
                        <option value="confidence_high">Highest confidence</option>
                        <option value="confidence_low">Lowest confidence</option>
                    </select>
                </div>

                {/* ---- Card container ---- */}
                <div
                    style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                    }}
                >
                    {/* ---- Loading state ---- */}
                    {pageState === 'loading' && (
                        <div>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 120px',
                                    padding: '12px 20px',
                                    borderBottom: '1px solid #EBEBEB',
                                }}
                            >
                                {['CLIENT', 'EVENT', 'SOURCE', 'CONFIDENCE', 'RISK', 'IN QUEUE', ''].map((h) => (
                                    <span
                                        key={h || 'action'}
                                        style={{
                                            fontSize: 12,
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
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    )}

                    {/* ---- Error state ---- */}
                    {pageState === 'error' && (
                        <div
                            style={{
                                padding: '80px 20px',
                                textAlign: 'center',
                            }}
                        >
                            <p style={{ color: '#E8443A', fontSize: 16, margin: '0 0 16px' }}>
                                Failed to load briefs
                            </p>
                            <button
                                onClick={() => setPageState('loaded')}
                                style={{
                                    padding: '8px 20px',
                                    fontSize: 13,
                                    borderRadius: 100,
                                    border: '1px solid #EBEBEB',
                                    background: '#FFFFFF',
                                    color: '#32302F',
                                    cursor: 'pointer',
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontWeight: 500,
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* ---- Loaded state ---- */}
                    {pageState === 'loaded' && (
                        <>
                            {/* Column headers */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 120px',
                                    padding: '12px 20px',
                                    borderBottom: '1px solid #EBEBEB',
                                }}
                            >
                                {['CLIENT', 'EVENT', 'SOURCE', 'CONFIDENCE', 'RISK', 'IN QUEUE', ''].map((h) => (
                                    <span
                                        key={h || 'action'}
                                        style={{
                                            fontSize: 12,
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

                            {/* Rows or empty state */}
                            {filteredBriefs.length === 0 ? (
                                /* ---- Empty state ---- */
                                <div
                                    style={{
                                        padding: '80px 20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 12,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            border: '2px solid #EBEBEB',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#6B6867',
                                            fontSize: 20,
                                        }}
                                    >
                                        ✓
                                    </div>
                                    <p style={{ color: '#32302F', fontSize: 16, margin: 0, fontWeight: 500 }}>
                                        All caught up
                                    </p>
                                    <p style={{ color: '#6B6867', fontSize: 14, margin: 0 }}>
                                        No briefs match the current filters
                                    </p>
                                </div>
                            ) : (
                                /* ---- Data rows ---- */
                                filteredBriefs.map((brief, idx) => {
                                    const isGenerating = brief.status === 'generating'
                                    const isLast = idx === filteredBriefs.length - 1
                                    const isHovered = hoveredRow === brief.brief_id

                                    return (
                                        <div
                                            key={brief.brief_id}
                                            className="slide-up"
                                            onMouseEnter={() => setHoveredRow(brief.brief_id)}
                                            onMouseLeave={() => setHoveredRow(null)}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 120px',
                                                padding: '16px 20px',
                                                borderBottom: isLast ? 'none' : '1px solid #EBEBEB',
                                                alignItems: 'center',
                                                background: isHovered ? '#F7F6F4' : 'transparent',
                                                transition: 'background 150ms ease',
                                                animationDelay: `${idx * 50}ms`,
                                                opacity: 0, /* start hidden, slide-up reveals */
                                                animationFillMode: 'forwards',
                                            }}
                                        >
                                            {/* CLIENT */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div
                                                    style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '50%',
                                                        background: '#00C07B',
                                                        color: '#FFFFFF',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {getInitials(brief.client_name)}
                                                </div>
                                                <span style={{ color: '#32302F', fontSize: 14, fontWeight: 500 }}>
                                                    {brief.client_name}
                                                </span>
                                            </div>

                                            {/* EVENT */}
                                            <span style={{ color: '#32302F', fontSize: 14 }}>
                                                {EVENT_LABELS[brief.event_type] ?? brief.event_type}
                                            </span>

                                            {/* SOURCE */}
                                            {renderSourcePill(brief.source)}

                                            {/* CONFIDENCE */}
                                            <span
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: 500,
                                                    color: confidenceColor(brief.confidence_score),
                                                }}
                                            >
                                                {Math.round(brief.confidence_score * 100)}%
                                            </span>

                                            {/* RISK */}
                                            {renderRiskPill(brief.risk_tier)}

                                            {/* IN QUEUE */}
                                            <span style={{ color: '#6B6867', fontSize: 14 }}>
                                                {formatQueueTime(brief.time_in_queue_minutes)}
                                            </span>

                                            {/* ACTION */}
                                            {isGenerating ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div
                                                        className="pulse"
                                                        style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            background: '#F5A623',
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '6px 16px',
                                                            borderRadius: 100,
                                                            fontSize: 13,
                                                            fontWeight: 500,
                                                            background: '#F7F6F4',
                                                            color: '#6B6867',
                                                        }}
                                                    >
                                                        Generating…
                                                    </span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => router.push(`/advisor/brief/${brief.brief_id}`)}
                                                    style={{
                                                        padding: '6px 16px',
                                                        fontSize: 13,
                                                        borderRadius: 100,
                                                        border: 'none',
                                                        background: '#00C07B',
                                                        color: '#FFFFFF',
                                                        cursor: 'pointer',
                                                        fontFamily: "'DM Sans', sans-serif",
                                                        fontWeight: 500,
                                                        transition: 'background 150ms ease',
                                                    }}
                                                    onMouseEnter={(e) =>
                                                        (e.currentTarget.style.background = '#009960')
                                                    }
                                                    onMouseLeave={(e) =>
                                                        (e.currentTarget.style.background = '#00C07B')
                                                    }
                                                >
                                                    Review →
                                                </button>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
