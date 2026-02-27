'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import RejectModal from '@/components/advisor/RejectModal'
import FlagModal from '@/components/advisor/FlagModal'

/* ------------------------------------------------------------------ */
/*  Stub data                                                         */
/* ------------------------------------------------------------------ */

const STUB_BRIEF = {
    brief_id: '1',
    status: 'pending',
    event_type: 'new_baby',
    confidence_score: 0.87,
    source: 'account_signal',
    risk_tier: 'low',
    created_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
    client: {
        client_id: 'c1',
        name: 'Sarah Chen',
        age: 31,
        province: 'ON',
        income_bracket: '75000-100000',
        accounts: ['TFSA', 'RRSP'],
        tfsa_room: 18500,
        rrsp_room: 22400,
        dependents: 1,
    },
    content: {
        summary:
            'Based on recent transaction patterns, we believe Sarah recently had a baby. This is one of the most financially significant life events — and one of the most time-sensitive in terms of available government benefits.',
        actions: [
            {
                rank: 1,
                title: 'Open an RESP immediately',
                explanation:
                    'The Canada Education Savings Grant matches 20% of contributions up to $2,500 per year. Every month without an RESP is a month of free government money left on the table.',
                cta_label: 'Open RESP',
                cta_link: '/client/accounts/resp',
            },
            {
                rank: 2,
                title: 'Apply for the Canada Child Benefit',
                explanation:
                    'Sarah may be eligible for up to $7,437 per year per child under 6. This is not automatic — it requires an application.',
                cta_label: 'Learn more',
                cta_link: '/client/learn/ccb',
            },
            {
                rank: 3,
                title: 'Review your TFSA contribution',
                explanation:
                    'With $18,500 in remaining room, increasing monthly contributions now takes advantage of tax-free compounding over an 18-year horizon.',
                cta_label: 'Contribute to TFSA',
                cta_link: '/client/accounts/tfsa',
            },
        ],
    },
}

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

function getInitials(name: string): string {
    const parts = name.split(' ')
    return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
}

function confidenceColor(score: number): string {
    if (score >= 0.8) return '#00C07B'
    if (score >= 0.6) return '#F5A623'
    return '#E8443A'
}

function confidenceBg(score: number): string {
    if (score >= 0.8) return '#E6F9F1'
    if (score >= 0.6) return '#FFF3E0'
    return '#FDE8E7'
}

function formatIncome(bracket: string): string {
    const match = bracket.match(/(\d+)-(\d+)/)
    if (!match) return bracket
    const lo = Math.round(parseInt(match[1]) / 1000)
    const hi = Math.round(parseInt(match[2]) / 1000)
    return `$${lo}K – $${hi}K`
}

function formatCurrency(value: number): string {
    return '$' + value.toLocaleString('en-CA')
}

function formatQueueTime(createdAt: string): string {
    const diff = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000)
    if (diff < 60) return `${diff}m`
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const RANK_LABELS = ['1st priority', '2nd priority', '3rd priority']
const RANK_COLORS = ['#00C07B', '#32302F', '#6B6867']

/* ---- Shared input styles ---- */
const inputBase: React.CSSProperties = {
    width: '100%',
    border: '1px solid #EBEBEB',
    borderRadius: 6,
    padding: '6px 8px',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
}

const textareaBase: React.CSSProperties = {
    width: '100%',
    border: '1px solid #EBEBEB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#32302F',
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.6,
    resize: 'vertical' as const,
    minHeight: 100,
    outline: 'none',
    boxSizing: 'border-box',
}

function applyFocus(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#00C07B'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,192,123,0.12)'
}

function removeFocus(e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) {
    e.currentTarget.style.borderColor = '#EBEBEB'
    e.currentTarget.style.boxShadow = 'none'
}

/* ---- Label component ---- */
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <span
            style={{
                fontSize: 12,
                color: '#6B6867',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 500,
            }}
        >
            {children}
        </span>
    )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function BriefReviewPage() {
    const params = useParams()
    const router = useRouter()
    const briefId = params.brief_id as string

    // Data — stub as default, overwritten when API responds
    const [brief, setBrief] = useState(STUB_BRIEF)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const result = await api.get(`/api/briefs/${briefId}`) as any
                if (result?.brief_id) setBrief(result)
            } catch (err) {
                console.log('Using stub data for brief:', err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [briefId])

    // Editable content state
    const [summary, setSummary] = useState(brief.content.summary)
    const [actions, setActions] = useState(
        brief.content.actions.map((a) => ({
            ...a,
            title: a.title,
            explanation: a.explanation,
        }))
    )

    // Re-sync editable state when brief data loads from API
    useEffect(() => {
        setSummary(brief.content.summary)
        setActions(brief.content.actions.map((a) => ({
            ...a,
            title: a.title,
            explanation: a.explanation,
        })))
    }, [brief])

    // Edit tracking
    const [hasEdits, setHasEdits] = useState(false)
    const markEdited = () => setHasEdits(true)

    // Modals
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [showFlagModal, setShowFlagModal] = useState(false)

    // Approve state
    const [approving, setApproving] = useState(false)

    /* ---- Action updaters ---- */
    const updateActionTitle = (idx: number, value: string) => {
        markEdited()
        setActions((prev) =>
            prev.map((a, i) => (i === idx ? { ...a, title: value } : a))
        )
    }

    const updateActionExplanation = (idx: number, value: string) => {
        markEdited()
        setActions((prev) =>
            prev.map((a, i) => (i === idx ? { ...a, explanation: value } : a))
        )
    }

    /* ---- API handlers ---- */
    const handleApprove = async () => {
        setApproving(true)
        try {
            const body = {
                advisor_id: 'advisor-demo',
                was_edited: hasEdits,
                content: {
                    summary,
                    actions: actions.map((a) => ({
                        rank: a.rank,
                        title: a.title,
                        explanation: a.explanation,
                        cta_label: a.cta_label,
                        cta_link: a.cta_link,
                    })),
                },
            }
            const res = await api.post(`/api/briefs/${briefId}/approve`, body)
            console.log('Approve response:', res)
            router.push('/advisor/queue')
        } catch (err) {
            console.error('Approve error (expected — API not running):', err)
            setApproving(false)
        }
    }

    const handleReject = async (reason: string) => {
        try {
            const res = await api.post(`/api/briefs/${briefId}/reject`, {
                advisor_id: 'advisor-demo',
                rejection_reason: reason,
            })
            console.log('Reject response:', res)
        } catch (err) {
            console.error('Reject error (expected — API not running):', err)
        }
        setShowRejectModal(false)
        router.push('/advisor/queue')
    }

    const handleFlag = async (reason: string) => {
        try {
            const res = await api.post(`/api/briefs/${briefId}/flag`, {
                advisor_id: 'advisor-demo',
                flag_reason: reason,
            })
            console.log('Flag response:', res)
        } catch (err) {
            console.error('Flag error (expected — API not running):', err)
        }
        setShowFlagModal(false)
        router.push('/advisor/queue')
    }

    /* ---- Metadata pills ---- */
    const confScore = brief.confidence_score
    const confPct = Math.round(confScore * 100)

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#F7F6F4',
                fontFamily: "'DM Sans', sans-serif",
                paddingBottom: 80,
            }}
        >
            {/* ---- Top bar (same as queue) ---- */}
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
                    <span style={{ color: '#6B6867', fontSize: 14 }}>Advisor Portal</span>
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
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
                {/* Back link */}
                <Link
                    href="/advisor/queue"
                    style={{
                        display: 'block',
                        fontSize: 13,
                        color: '#6B6867',
                        textDecoration: 'none',
                        marginBottom: 24,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#32302F')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6867')}
                >
                    ← Back to Queue
                </Link>

                {/* Event metadata row */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 28,
                    }}
                >
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#32302F' }}>
                        {EVENT_LABELS[brief.event_type] ?? brief.event_type}
                    </span>

                    {/* Confidence pill */}
                    <span
                        style={{
                            fontSize: 12,
                            borderRadius: 100,
                            padding: '3px 10px',
                            fontWeight: 500,
                            background: confidenceBg(confScore),
                            color: confidenceColor(confScore),
                        }}
                    >
                        {confPct}%
                    </span>

                    {/* Risk pill */}
                    <span
                        style={{
                            fontSize: 12,
                            borderRadius: 100,
                            padding: '3px 10px',
                            fontWeight: 500,
                            background: brief.risk_tier === 'low' ? '#E6F9F1' : '#FDE8E7',
                            color: brief.risk_tier === 'low' ? '#00C07B' : '#E8443A',
                        }}
                    >
                        {brief.risk_tier === 'low' ? 'Low Risk' : 'High Risk'}
                    </span>

                    {/* Source pill */}
                    <span
                        style={{
                            fontSize: 12,
                            borderRadius: 100,
                            padding: '3px 10px',
                            fontWeight: 500,
                            background: brief.source === 'self_reported' ? '#F7F6F4' : '#FFF3E0',
                            color: brief.source === 'self_reported' ? '#6B6867' : '#F5A623',
                        }}
                    >
                        {brief.source === 'self_reported' ? 'Self-reported' : 'Signal'}
                    </span>

                    {/* Time in queue */}
                    <span style={{ fontSize: 13, color: '#6B6867' }}>
                        · {formatQueueTime(brief.created_at)} in queue
                    </span>
                </div>

                {/* ---- Two-column layout ---- */}
                <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
                    {/* ======== LEFT: Client Profile Panel ======== */}
                    <div
                        style={{
                            width: 340,
                            flexShrink: 0,
                            background: '#FFFFFF',
                            borderRadius: 16,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            padding: 24,
                            position: 'sticky',
                            top: 24,
                        }}
                    >
                        {/* Client header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    background: '#00C07B',
                                    color: '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 16,
                                    fontWeight: 500,
                                    flexShrink: 0,
                                }}
                            >
                                {getInitials(brief.client.name)}
                            </div>
                            <div>
                                <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#32302F' }}>
                                    {brief.client.name}
                                </div>
                                <span
                                    style={{
                                        fontSize: 12,
                                        background: '#F7F6F4',
                                        color: '#6B6867',
                                        borderRadius: 100,
                                        padding: '2px 10px',
                                        display: 'inline-block',
                                        marginTop: 4,
                                    }}
                                >
                                    {brief.client.province}
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid #EBEBEB', margin: '16px 0' }} />

                        {/* Profile fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <SectionLabel>AGE</SectionLabel>
                                <span style={{ fontSize: 14, color: '#32302F', fontWeight: 500 }}>{brief.client.age}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <SectionLabel>INCOME</SectionLabel>
                                <span style={{ fontSize: 14, color: '#32302F', fontWeight: 500 }}>
                                    {formatIncome(brief.client.income_bracket)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <SectionLabel>DEPENDENTS</SectionLabel>
                                <span style={{ fontSize: 14, color: '#32302F', fontWeight: 500 }}>
                                    {brief.client.dependents}
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid #EBEBEB', margin: '16px 0' }} />

                        {/* Accounts */}
                        <SectionLabel>ACCOUNTS</SectionLabel>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {brief.client.accounts.map((acc) => (
                                <span
                                    key={acc}
                                    style={{
                                        background: '#F7F6F4',
                                        color: '#32302F',
                                        borderRadius: 100,
                                        padding: '4px 12px',
                                        fontSize: 13,
                                    }}
                                >
                                    {acc}
                                </span>
                            ))}
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid #EBEBEB', margin: '16px 0' }} />

                        {/* Contribution room */}
                        <SectionLabel>CONTRIBUTION ROOM</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: '#6B6867' }}>TFSA</span>
                                <span style={{ fontSize: 15, color: '#00C07B', fontWeight: 600 }}>
                                    {formatCurrency(brief.client.tfsa_room)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: '#6B6867' }}>RRSP</span>
                                <span style={{ fontSize: 15, color: '#32302F', fontWeight: 600 }}>
                                    {formatCurrency(brief.client.rrsp_room)}
                                </span>
                            </div>
                        </div>

                        {/* Signal context (only for account_signal) */}
                        {brief.source === 'account_signal' && (
                            <>
                                <div style={{ borderTop: '1px solid #EBEBEB', margin: '16px 0' }} />
                                <SectionLabel>SIGNAL CONTEXT</SectionLabel>
                                <div
                                    style={{
                                        background: '#FFF3E0',
                                        borderRadius: 8,
                                        padding: '10px 12px',
                                        fontSize: 13,
                                        color: '#32302F',
                                        marginTop: 8,
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Detected via account signal · Confidence {confPct}%
                                </div>
                            </>
                        )}
                    </div>

                    {/* ======== RIGHT: Brief Content Panel ======== */}
                    <div
                        style={{
                            flex: 1,
                            minWidth: 0,
                            background: '#FFFFFF',
                            borderRadius: 16,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            padding: 28,
                        }}
                    >
                        {/* Summary section */}
                        <SectionLabel>AI-GENERATED SUMMARY</SectionLabel>
                        <textarea
                            value={summary}
                            onChange={(e) => {
                                markEdited()
                                setSummary(e.target.value)
                            }}
                            onFocus={applyFocus}
                            onBlur={removeFocus}
                            style={{ ...textareaBase, marginTop: 10 }}
                        />
                        <p style={{ color: '#6B6867', fontSize: 11, margin: '6px 0 0' }}>
                            Edits are tracked for compliance
                        </p>

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid #EBEBEB', margin: '24px 0' }} />

                        {/* Actions section */}
                        <SectionLabel>RECOMMENDED ACTIONS</SectionLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                            {actions.map((action, idx) => (
                                <div
                                    key={action.rank}
                                    className="slide-up"
                                    style={{
                                        border: '1px solid #EBEBEB',
                                        borderRadius: 12,
                                        padding: 16,
                                        borderLeft: `4px solid ${RANK_COLORS[idx] ?? '#6B6867'}`,
                                        opacity: 0,
                                        animationDelay: `${idx * 60}ms`,
                                        animationFillMode: 'forwards',
                                    }}
                                >
                                    {/* Rank badge */}
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            background: '#F7F6F4',
                                            color: '#6B6867',
                                            fontSize: 11,
                                            borderRadius: 100,
                                            padding: '2px 8px',
                                            marginBottom: 8,
                                        }}
                                    >
                                        {RANK_LABELS[idx] ?? `${idx + 1}th priority`}
                                    </span>

                                    {/* Title input */}
                                    <input
                                        type="text"
                                        value={action.title}
                                        onChange={(e) => updateActionTitle(idx, e.target.value)}
                                        onFocus={applyFocus}
                                        onBlur={removeFocus}
                                        style={{
                                            ...inputBase,
                                            fontSize: 15,
                                            color: '#32302F',
                                            fontWeight: 500,
                                            marginBottom: 8,
                                        }}
                                    />

                                    {/* Explanation textarea */}
                                    <textarea
                                        value={action.explanation}
                                        onChange={(e) => updateActionExplanation(idx, e.target.value)}
                                        onFocus={applyFocus}
                                        onBlur={removeFocus}
                                        style={{
                                            ...inputBase,
                                            fontSize: 13,
                                            color: '#6B6867',
                                            lineHeight: 1.5,
                                            resize: 'vertical' as const,
                                            minHeight: 56,
                                            marginBottom: 8,
                                        }}
                                    />

                                    {/* CTA preview */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ color: '#6B6867', fontSize: 11 }}>CTA →</span>
                                        <span style={{ color: '#00C07B', fontSize: 12, fontWeight: 500 }}>
                                            {action.cta_label}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ======== ACTION BAR ======== */}
            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#FFFFFF',
                    borderTop: '1px solid #EBEBEB',
                    padding: '16px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 40,
                }}
            >
                {/* Status indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: hasEdits ? '#F5A623' : '#6B6867',
                        }}
                    />
                    <span style={{ fontSize: 13, color: hasEdits ? '#F5A623' : '#6B6867' }}>
                        {hasEdits ? 'Unsaved changes' : 'Ready to review'}
                    </span>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={() => setShowFlagModal(true)}
                        style={{
                            background: '#FFFFFF',
                            border: '1px solid #EBEBEB',
                            color: '#6B6867',
                            borderRadius: 100,
                            padding: '10px 20px',
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            transition: 'all 150ms ease',
                        }}
                    >
                        Flag for Compliance
                    </button>

                    <button
                        onClick={() => setShowRejectModal(true)}
                        style={{
                            background: '#FFFFFF',
                            border: '1px solid #E8443A',
                            color: '#E8443A',
                            borderRadius: 100,
                            padding: '10px 20px',
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            transition: 'all 150ms ease',
                        }}
                    >
                        Reject
                    </button>

                    <button
                        onClick={handleApprove}
                        disabled={approving}
                        style={{
                            background: approving ? '#009960' : '#00C07B',
                            border: 'none',
                            color: '#FFFFFF',
                            borderRadius: 100,
                            padding: '10px 24px',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: approving ? 'not-allowed' : 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                            if (!approving) e.currentTarget.style.background = '#009960'
                        }}
                        onMouseLeave={(e) => {
                            if (!approving) e.currentTarget.style.background = '#00C07B'
                        }}
                    >
                        {approving ? 'Approving…' : 'Approve'}
                    </button>
                </div>
            </div>

            {/* ======== MODALS ======== */}
            {showRejectModal && (
                <RejectModal
                    briefId={briefId}
                    onClose={() => setShowRejectModal(false)}
                    onConfirm={handleReject}
                />
            )}
            {showFlagModal && (
                <FlagModal
                    briefId={briefId}
                    onClose={() => setShowFlagModal(false)}
                    onConfirm={handleFlag}
                />
            )}
        </div>
    )
}
