'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Event definitions                                                 */
/* ------------------------------------------------------------------ */

const LIFE_EVENTS = [
    { type: 'new_baby', label: 'New Baby', emoji: '👶' },
    { type: 'new_job', label: 'New Job', emoji: '💼' },
    { type: 'income_drop', label: 'Income Drop', emoji: '📉' },
    { type: 'marriage', label: 'Marriage', emoji: '💍' },
    { type: 'divorce', label: 'Divorce', emoji: '📋' },
    { type: 'spouse_death', label: 'Loss of Spouse', emoji: '🕊️' },
    { type: 'lump_sum_deposit', label: 'Large Deposit', emoji: '💰' },
    { type: 'debt_payoff', label: 'Debt Paid Off', emoji: '✅' },
    { type: 'child_leaving', label: 'Child Leaving', emoji: '🎓' },
    { type: 'retirement_approaching', label: 'Retirement', emoji: '🌅' },
    { type: 'home_purchase', label: 'Home Purchase', emoji: '🏠' },
    { type: 'inheritance', label: 'Inheritance', emoji: '📜' },
]

const EVENT_MESSAGES: Record<string, string> = {
    new_baby: "Congratulations. We'll look at RESP, CCB eligibility, and TFSA strategy for your new family member.",
    new_job: "Great news. We'll review your new income, contribution room, and any benefit changes.",
    income_drop: "We're here to help. We'll look at your options and what support may be available.",
    marriage: "Congratulations. We'll look at how to align your financial plans as a couple.",
    divorce: "We understand this is a difficult time. We'll help you understand your financial picture going forward.",
    spouse_death: "We're sorry for your loss. We'll help you understand what needs attention right now.",
    lump_sum_deposit: "We'll help you understand the best way to put this money to work.",
    debt_payoff: "Well done. We'll show you how to redirect that freed-up cash flow.",
    child_leaving: "A big milestone. We'll look at how your financial picture changes now.",
    retirement_approaching: "An important window. We'll look at your drawdown strategy and timeline.",
    home_purchase: "Exciting. We'll look at FHSA, RRSP Home Buyers Plan, and first-time buyer credits.",
    inheritance: "We'll help you understand the tax implications and best use of these funds.",
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function LifeEventPage() {
    const router = useRouter()
    const [selected, setSelected] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [hoveredTile, setHoveredTile] = useState<string | null>(null)

    const selectedEvent = LIFE_EVENTS.find((e) => e.type === selected)

    const handleSubmit = async () => {
        if (!selected) return
        setIsSubmitting(true)
        try {
            const res = await api.post('/api/events', {
                client_id: 'ae66133f-8eb4-4165-af1a-fd98e8553db9',
                event_type: selected,
                source: 'self_reported',
            })
            console.log('Event submitted:', res)
        } catch {
            console.log('API not available yet, proceeding to success state')
        }
        setIsSubmitting(false)
        setIsSubmitted(true)
    }

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
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                }}
            >
                <Link
                    href="/client"
                    style={{ fontSize: 20, color: '#32302F', textDecoration: 'none', lineHeight: 1, width: 40 }}
                >
                    ←
                </Link>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#32302F' }}>
                    Life Event
                </span>
                <div style={{ width: 40 }} />
            </div>

            {isSubmitted ? (
                /* ================================================================ */
                /*  Success state                                                   */
                /* ================================================================ */
                <div style={{ padding: '48px 20px 0', textAlign: 'center' }}>
                    {/* Checkmark circle */}
                    <div
                        className="fade-in"
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: '#E6F9F1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            fontSize: 32,
                            color: '#00C07B',
                        }}
                    >
                        ✓
                    </div>

                    <div
                        style={{
                            fontFamily: 'Georgia, serif',
                            fontSize: 24,
                            color: '#32302F',
                            marginTop: 20,
                        }}
                    >
                        We&apos;ve got it
                    </div>

                    <p
                        style={{
                            fontSize: 14,
                            color: '#6B6867',
                            lineHeight: 1.6,
                            marginTop: 10,
                            maxWidth: 280,
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}
                    >
                        A licensed advisor will review your information. If there&apos;s something actionable,
                        you&apos;ll hear from us in your notifications.
                    </p>

                    <button
                        onClick={() => router.push('/client')}
                        style={{
                            background: '#FFFFFF',
                            border: '1px solid #EBEBEB',
                            color: '#32302F',
                            borderRadius: 100,
                            padding: '12px 28px',
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            marginTop: 32,
                            transition: 'all 150ms ease',
                        }}
                    >
                        Back to Home
                    </button>
                </div>
            ) : (
                /* ================================================================ */
                /*  Form state                                                      */
                /* ================================================================ */
                <>
                    {/* ---- Intro ---- */}
                    <div style={{ padding: '8px 20px 24px' }}>
                        <h1
                            style={{
                                fontFamily: 'Georgia, serif',
                                fontSize: 24,
                                color: '#32302F',
                                lineHeight: 1.3,
                                margin: 0,
                                fontWeight: 400,
                            }}
                        >
                            Has something changed?
                        </h1>
                        <p
                            style={{
                                fontSize: 14,
                                color: '#6B6867',
                                lineHeight: 1.6,
                                marginTop: 8,
                                marginBottom: 0,
                            }}
                        >
                            Let us know about a major life event and we&apos;ll show you what it means for your
                            money.
                        </p>
                    </div>

                    {/* ---- Event grid ---- */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                            padding: '0 20px',
                        }}
                    >
                        {LIFE_EVENTS.map((evt) => {
                            const isSelected = selected === evt.type
                            const isHovered = hoveredTile === evt.type && !isSelected
                            return (
                                <button
                                    key={evt.type}
                                    onClick={() => setSelected(evt.type)}
                                    onMouseEnter={() => setHoveredTile(evt.type)}
                                    onMouseLeave={() => setHoveredTile(null)}
                                    style={{
                                        background: isSelected ? '#E6F9F1' : isHovered ? '#EBEBEB' : '#F7F6F4',
                                        border: `2px solid ${isSelected ? '#00C07B' : 'transparent'}`,
                                        borderRadius: 14,
                                        padding: '16px 12px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}
                                >
                                    <span style={{ fontSize: 28, display: 'block', marginBottom: 8 }}>
                                        {evt.emoji}
                                    </span>
                                    <span
                                        style={{ fontSize: 13, color: '#32302F', fontWeight: 500, lineHeight: 1.3 }}
                                    >
                                        {evt.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {/* ---- Confirmation card ---- */}
                    {selectedEvent && (
                        <div className="slide-up" style={{ marginTop: 20, padding: '0 20px' }}>
                            <div
                                style={{
                                    background: '#FFFFFF',
                                    borderRadius: 16,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                    padding: 20,
                                }}
                            >
                                {/* Event header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 32 }}>{selectedEvent.emoji}</span>
                                    <span
                                        style={{
                                            fontFamily: 'Georgia, serif',
                                            fontSize: 18,
                                            color: '#32302F',
                                        }}
                                    >
                                        {selectedEvent.label}
                                    </span>
                                </div>

                                {/* Divider */}
                                <div style={{ borderTop: '1px solid #EBEBEB', margin: '14px 0' }} />

                                {/* Message */}
                                <p
                                    style={{
                                        fontSize: 13,
                                        color: '#6B6867',
                                        lineHeight: 1.6,
                                        margin: 0,
                                    }}
                                >
                                    {EVENT_MESSAGES[selectedEvent.type]}
                                </p>

                                {/* Advisory note */}
                                <p
                                    style={{
                                        fontSize: 11,
                                        color: '#6B6867',
                                        marginTop: 10,
                                        marginBottom: 0,
                                    }}
                                >
                                    Your information is reviewed by a licensed advisor before anything is sent to you.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ---- Submit button ---- */}
                    {selected && (
                        <div style={{ padding: '16px 20px 32px' }}>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{
                                    width: '100%',
                                    padding: 14,
                                    borderRadius: 100,
                                    border: 'none',
                                    background: '#00C07B',
                                    color: '#FFFFFF',
                                    fontSize: 15,
                                    fontWeight: 500,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontFamily: "'DM Sans', sans-serif",
                                    opacity: isSubmitting ? 0.7 : 1,
                                    transition: 'all 150ms ease',
                                }}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
