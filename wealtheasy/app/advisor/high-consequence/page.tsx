'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import ClassifyModal from '@/components/advisor/ClassifyModal'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type HCEvent = {
    event_id: string
    client_id: string
    client_name: string
    event_type: string
    source: string
    confidence_score: number
    signal_summary: string | null
    created_at: string
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

function formatTimeSince(created: string): string {
    const diff = Math.round((Date.now() - new Date(created).getTime()) / 60000)
    if (diff < 60) return `${diff}m ago`
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
}

/* ------------------------------------------------------------------ */
/*  Nav bar (shared pattern)                                          */
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
                        onMouseEnter={(e) => {
                            if (!active) e.currentTarget.style.color = '#32302F'
                        }}
                        onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.color = '#6B6867'
                        }}
                    >
                        {link.label}
                    </Link>
                )
            })}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Event card                                                        */
/* ------------------------------------------------------------------ */

function EventCard({ event, index }: { event: HCEvent; index: number }) {
    const [modalDecision, setModalDecision] = useState<'generate' | 'dismiss' | 'escalate' | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [resolved, setResolved] = useState<'generate' | 'dismiss' | 'escalate' | null>(null)

    const handleConfirm = async () => {
        if (!modalDecision) return
        setIsLoading(true)
        try {
            const res = await api.post(`/api/events/${event.event_id}/classify`, {
                advisor_id: 'advisor-demo',
                decision: modalDecision,
            })
            console.log(`Classify ${event.event_id} as ${modalDecision}:`, res)
        } catch (err) {
            console.error(`Classify error (expected — API not running):`, err)
        }
        setIsLoading(false)
        setResolved(modalDecision)
        setModalDecision(null)
    }

    const eventLabel = EVENT_LABELS[event.event_type] ?? event.event_type

    const RESOLUTION_TEXT: Record<string, { text: string; color: string }> = {
        generate: { text: 'Brief generation started — will appear in review queue shortly', color: '#00C07B' },
        dismiss: { text: 'Event dismissed', color: '#6B6867' },
        escalate: { text: 'Escalated to compliance', color: '#F5A623' },
    }

    return (
        <>
            <div
                className="slide-up"
                style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    padding: 24,
                    opacity: 0,
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: 'forwards',
                }}
            >
                {/* ---- Header row ---- */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}
                >
                    {/* Left */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                                flexShrink: 0,
                            }}
                        >
                            {getInitials(event.client_name)}
                        </div>
                        <div>
                            <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#32302F' }}>
                                {event.client_name}
                            </div>
                            <div style={{ fontSize: 13, color: '#6B6867', marginTop: 2 }}>{eventLabel}</div>
                        </div>
                    </div>

                    {/* Right */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#6B6867' }} suppressHydrationWarning>{formatTimeSince(event.created_at)}</span>
                        <span
                            style={{
                                fontSize: 12,
                                borderRadius: 100,
                                padding: '3px 10px',
                                fontWeight: 500,
                                background: confidenceBg(event.confidence_score),
                                color: confidenceColor(event.confidence_score),
                            }}
                        >
                            {Math.round(event.confidence_score * 100)}%
                        </span>
                    </div>
                </div>

                {/* ---- Signal summary ---- */}
                <div style={{ marginTop: 16 }}>
                    <span
                        style={{
                            fontSize: 11,
                            color: '#6B6867',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: 500,
                        }}
                    >
                        SIGNAL DETECTED
                    </span>
                    <div
                        style={{
                            background: '#F7F6F4',
                            borderRadius: 8,
                            padding: '12px 14px',
                            fontSize: 14,
                            color: '#32302F',
                            lineHeight: 1.5,
                            marginTop: 6,
                        }}
                    >
                        {event.source === 'self_reported' && (
                            <span>Client self-reported a {eventLabel.toLowerCase()} event.</span>
                        )}
                        {event.signal_summary && (
                            <span>{event.source === 'self_reported' ? ' ' : ''}{event.signal_summary}</span>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B6867', marginTop: 6 }}>
                        Source: {event.source === 'self_reported' ? 'Self-Reported' : 'Account Signal'}
                    </div>
                </div>

                {/* ---- Divider ---- */}
                <div style={{ borderTop: '1px solid #EBEBEB', margin: '20px 0' }} />

                {/* ---- Decision row ---- */}
                {resolved ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                        <div
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: RESOLUTION_TEXT[resolved].color,
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                flexShrink: 0,
                            }}
                        >
                            ✓
                        </div>
                        <span style={{ fontSize: 13, color: RESOLUTION_TEXT[resolved].color }}>
                            {RESOLUTION_TEXT[resolved].text}
                        </span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button
                            onClick={() => setModalDecision('dismiss')}
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
                            Dismiss
                        </button>
                        <button
                            onClick={() => setModalDecision('escalate')}
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #F5A623',
                                color: '#F5A623',
                                borderRadius: 100,
                                padding: '10px 20px',
                                fontSize: 14,
                                cursor: 'pointer',
                                fontFamily: "'DM Sans', sans-serif",
                                fontWeight: 500,
                                transition: 'all 150ms ease',
                            }}
                        >
                            Escalate to Compliance
                        </button>
                        <button
                            onClick={() => setModalDecision('generate')}
                            style={{
                                background: '#00C07B',
                                border: 'none',
                                color: '#FFFFFF',
                                borderRadius: 100,
                                padding: '10px 24px',
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: 'pointer',
                                fontFamily: "'DM Sans', sans-serif",
                                transition: 'all 150ms ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#009960')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#00C07B')}
                        >
                            Generate Brief
                        </button>
                    </div>
                )}
            </div>

            {/* ---- Modal ---- */}
            {modalDecision && (
                <ClassifyModal
                    eventId={event.event_id}
                    clientName={event.client_name}
                    eventType={eventLabel}
                    decision={modalDecision}
                    onClose={() => setModalDecision(null)}
                    onConfirm={handleConfirm}
                    isLoading={isLoading}
                />
            )}
        </>
    )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function HighConsequencePage() {
    const [events, setEvents] = useState<HCEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            setLoadError(null)
            try {
                const result = await api.get('/api/events/high-consequence?status=pending_classification&limit=50&offset=0') as any
                setEvents(result?.events ?? [])
            } catch (err: any) {
                console.error('Failed to load high-consequence events:', err)
                setLoadError(err?.message ?? 'Could not reach backend')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

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
                    High-Consequence Events
                </h1>
                <p style={{ color: '#6B6867', fontSize: 14, margin: '6px 0 20px' }}>
                    These events require human review before any AI processing begins
                </p>

                {/* Warning callout */}
                <div
                    style={{
                        background: '#FDE8E7',
                        borderRadius: 12,
                        padding: '14px 18px',
                        fontSize: 13,
                        color: '#32302F',
                        borderLeft: '4px solid #E8443A',
                        lineHeight: 1.5,
                        marginBottom: 28,
                    }}
                >
                    No brief has been generated for any event on this screen. Your decision determines whether AI
                    processing begins, is dismissed, or is escalated to compliance.
                </div>

                {/* Events list / loading / empty state */}
                {isLoading ? (
                    <div style={{ padding: '80px 20px', display: 'flex', justifyContent: 'center' }}>
                        <p style={{ color: '#6B6867', fontSize: 14, margin: 0 }}>Loading events…</p>
                    </div>
                ) : loadError ? (
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
                                border: '2px solid #E8443A',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#E8443A',
                                fontSize: 20,
                            }}
                        >
                            !
                        </div>
                        <p style={{ color: '#32302F', fontSize: 16, margin: 0, fontWeight: 500 }}>
                            Could not load events
                        </p>
                        <p style={{ color: '#6B6867', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 300 }}>
                            Make sure the backend is running on port 3001. ({loadError})
                        </p>
                    </div>
                ) : events.length === 0 ? (
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
                            No events pending review
                        </p>
                        <p style={{ color: '#6B6867', fontSize: 14, margin: 0 }}>
                            High-consequence signals will appear here when detected
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {events.map((event, idx) => (
                            <EventCard key={event.event_id} event={event} index={idx} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
