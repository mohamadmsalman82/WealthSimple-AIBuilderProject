'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Stub data                                                         */
/* ------------------------------------------------------------------ */

const STUB_BRIEF = {
    brief_id: 'b1',
    event_type: 'new_baby',
    event_context:
        'We noticed patterns in your account that suggest a new baby may have recently joined your family. Here is what that means for your financial picture right now.',
    content: {
        summary:
            'Having a child is one of the most financially significant life events. There are government benefits available to you right now that require action — and contribution room that compounds best when used early.',
        actions: [
            {
                rank: 1,
                title: 'Open an RESP immediately',
                explanation:
                    'The Canada Education Savings Grant matches 20% of contributions up to $2,500 per year. Every month without an RESP is a month of free government money left on the table.',
                cta_label: 'Open RESP',
                cta_link: '/client/accounts/resp',
                client_action: null as string | null,
            },
            {
                rank: 2,
                title: 'Apply for the Canada Child Benefit',
                explanation:
                    'You may be eligible for up to $7,437 per year per child under 6. This is not automatic — it requires an application through the CRA.',
                cta_label: 'Learn more',
                cta_link: '/client/learn/ccb',
                client_action: null as string | null,
            },
            {
                rank: 3,
                title: 'Review your TFSA contribution',
                explanation:
                    'With $18,500 in remaining room, increasing monthly contributions now takes advantage of tax-free compounding over an 18-year horizon.',
                cta_label: 'Contribute to TFSA',
                cta_link: '/client/accounts/tfsa',
                client_action: null as string | null,
            },
        ],
    },
    delivered_at: new Date(Date.now() - 46 * 60 * 1000).toISOString(),
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
    spouse_death: 'Spouse Death',
}

const RANK_LABELS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }

function formatTimeSince(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

/* ------------------------------------------------------------------ */
/*  Action card                                                       */
/* ------------------------------------------------------------------ */

type ClientAction = 'done' | 'saved' | 'dismissed'

function ActionCard({
    action,
    index,
    briefId,
}: {
    action: (typeof STUB_BRIEF.content.actions)[number]
    index: number
    briefId: string
}) {
    const router = useRouter()
    const [selected, setSelected] = useState<ClientAction | null>(
        (action.client_action as ClientAction) ?? null
    )

    const handleSelect = async (ca: ClientAction) => {
        // Update local state immediately regardless of API result
        const newVal = selected === ca ? null : ca
        setSelected(newVal)
        if (newVal) {
            try {
                const res = await api.post(`/api/client/briefs/${briefId}/actions`, {
                    client_id: 'c1',
                    action_rank: action.rank,
                    client_action: newVal,
                })
                console.log(`Action ${action.rank} → ${newVal}:`, res)
            } catch {
                // Backend not running yet — local state still updates correctly
                console.log('API not available yet, action saved locally only')
            }
        }
    }

    const isActioned = selected !== null
    const pills: { label: string; icon: string; value: ClientAction }[] = [
        { label: 'Done', icon: '✓', value: 'done' },
        { label: 'Save', icon: '🔖', value: 'saved' },
        { label: 'Dismiss', icon: '✕', value: 'dismissed' },
    ]

    return (
        <div
            className="slide-up"
            style={{
                background: '#FFFFFF',
                borderRadius: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                padding: 16,
                opacity: 0,
                animationDelay: `${index * 80}ms`,
                animationFillMode: 'forwards',
            }}
        >
            {/* Rank badge */}
            <span
                style={{
                    display: 'inline-block',
                    background: '#F7F6F4',
                    color: '#6B6867',
                    borderRadius: 100,
                    padding: '2px 10px',
                    fontSize: 11,
                    fontWeight: 500,
                }}
            >
                {RANK_LABELS[action.rank] ?? `${action.rank}th`}
            </span>

            {/* Title */}
            <div
                style={{
                    fontSize: 16,
                    fontFamily: 'Georgia, serif',
                    color: '#32302F',
                    marginTop: 8,
                }}
            >
                {action.title}
            </div>

            {/* Explanation */}
            <div
                style={{
                    fontSize: 13,
                    color: '#6B6867',
                    lineHeight: 1.5,
                    marginTop: 6,
                    opacity: isActioned ? 0.7 : 1,
                    transition: 'opacity 200ms ease',
                }}
            >
                {action.explanation}
            </div>

            {/* CTA button */}
            <button
                onClick={() => router.push(action.cta_link)}
                style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 100,
                    border: isActioned ? '1.5px solid #00C07B' : 'none',
                    background: isActioned ? '#FFFFFF' : '#00C07B',
                    color: isActioned ? '#00C07B' : '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: 14,
                    textAlign: 'center',
                    transition: 'all 150ms ease',
                }}
            >
                {action.cta_label}
            </button>

            {/* Action pills */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 12,
                }}
            >
                {pills.map((pill) => {
                    const isActive = selected === pill.value
                    return (
                        <button
                            key={pill.value}
                            onClick={() => handleSelect(pill.value)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: isActive ? '#32302F' : '#F7F6F4',
                                color: isActive ? '#FFFFFF' : '#6B6867',
                                border: 'none',
                                borderRadius: 100,
                                padding: '4px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                                fontFamily: "'DM Sans', sans-serif",
                                transition: 'all 150ms ease',
                            }}
                        >
                            <span>{pill.icon}</span> {pill.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function BriefDetailPage() {
    const brief = STUB_BRIEF

    return (
        <div
            style={{
                maxWidth: 390,
                background: '#FFFFFF',
                minHeight: '100%',
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            {/* ---- Header ---- */}
            <div style={{ padding: '16px 20px' }}>
                <Link
                    href="/client/notifications"
                    style={{ fontSize: 20, color: '#32302F', textDecoration: 'none', lineHeight: 1 }}
                >
                    ←
                </Link>
            </div>

            {/* ---- Event context banner ---- */}
            <div style={{ padding: '0 20px 20px' }}>
                <div
                    style={{
                        background: '#E6F9F1',
                        borderRadius: 16,
                        padding: 20,
                    }}
                >
                    <div
                        style={{
                            fontSize: 11,
                            color: '#00C07B',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 500,
                        }}
                    >
                        We noticed
                    </div>
                    <div
                        style={{
                            fontFamily: 'Georgia, serif',
                            fontSize: 22,
                            color: '#32302F',
                            marginTop: 4,
                        }}
                    >
                        {EVENT_LABELS[brief.event_type] ?? brief.event_type}
                    </div>
                    <p
                        style={{
                            fontSize: 14,
                            color: '#32302F',
                            lineHeight: 1.6,
                            marginTop: 8,
                            marginBottom: 0,
                        }}
                    >
                        {brief.event_context}
                    </p>
                    <div style={{ fontSize: 11, color: '#6B6867', marginTop: 12 }}>
                        Delivered {formatTimeSince(brief.delivered_at)}
                    </div>
                </div>
            </div>

            {/* ---- Summary ---- */}
            <div style={{ padding: '0 20px 24px' }}>
                <div
                    style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 18,
                        color: '#32302F',
                        marginBottom: 10,
                    }}
                >
                    What this means for you
                </div>
                <div
                    style={{
                        fontSize: 14,
                        color: '#32302F',
                        lineHeight: 1.7,
                        background: '#F7F6F4',
                        borderRadius: 12,
                        padding: 16,
                    }}
                >
                    {brief.content.summary}
                </div>
            </div>

            {/* ---- Actions ---- */}
            <div style={{ padding: '0 20px', paddingBottom: 32 }}>
                <div
                    style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 18,
                        color: '#32302F',
                        marginBottom: 12,
                    }}
                >
                    Your next steps
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {brief.content.actions.map((action, idx) => (
                        <ActionCard
                            key={action.rank}
                            action={action}
                            index={idx}
                            briefId={brief.brief_id}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
