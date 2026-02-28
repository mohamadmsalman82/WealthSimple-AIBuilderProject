'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useDemoMode } from '@/lib/demo-mode-context'

/* ------------------------------------------------------------------ */
/*  Stub data (kept for reference, no longer used for init)           */
/* ------------------------------------------------------------------ */

const INITIAL_NOTIFICATIONS = [
    {
        notification_id: 'n1',
        brief_id: 'b1',
        client_id: 'c1',
        headline: "We noticed something. Here's what it means for your money.",
        status: 'delivered' as string,
        delivered_at: new Date(Date.now() - 46 * 60 * 1000).toISOString(),
        opened_at: null as string | null,
    },
    {
        notification_id: 'n2',
        brief_id: 'b2',
        client_id: 'c1',
        headline: 'Your retirement window is closer than it looks.',
        status: 'opened' as string,
        delivered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        opened_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
]

type NotifStub = (typeof INITIAL_NOTIFICATIONS)[number]

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatTimeSince(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

function groupByRecency(notifs: any[]): { label: string; items: any[] }[] {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const today: any[] = []
    const thisWeek: any[] = []
    const earlier: any[] = []

    notifs.forEach((n) => {
        const age = now - new Date(n.delivered_at).getTime()
        if (age < dayMs) today.push(n)
        else if (age < 7 * dayMs) thisWeek.push(n)
        else earlier.push(n)
    })

    const groups: { label: string; items: any[] }[] = []
    if (today.length) groups.push({ label: 'Today', items: today })
    if (thisWeek.length) groups.push({ label: 'This week', items: thisWeek })
    if (earlier.length) groups.push({ label: 'Earlier', items: earlier })
    return groups
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
    const router = useRouter()
    const { selectedClientId } = useDemoMode()
    const [notifications, setNotifications] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const result = await api.get(`/api/notifications?client_id=${selectedClientId}`) as any
                console.log('Notifications raw result:', JSON.stringify(result))
                console.log('Notifications array:', result?.notifications)
                if (result?.notifications && result.notifications.length > 0) {
                    setNotifications(result.notifications)
                    console.log('Set notifications to real data:', result.notifications.length, 'items')
                } else {
                    console.log('No notifications in result — keeping stub')
                }
            } catch (err: any) {
                console.log('Notifications API failed:', err?.message)
            } finally {
                setIsLoading(false)
            }
        }
        if (selectedClientId) load()
    }, [selectedClientId])

    const markAllRead = () => {
        // TODO: call PATCH /api/notifications when Mo adds that route
        setNotifications((prev) =>
            prev.map((n) => ({
                ...n,
                status: 'opened',
                opened_at: n.opened_at ?? new Date().toISOString(),
            }))
        )
    }

    const handleTap = (notif: any) => {
        // Mark as read
        setNotifications((prev) =>
            prev.map((n) =>
                n.notification_id === notif.notification_id
                    ? { ...n, status: 'opened', opened_at: n.opened_at ?? new Date().toISOString() }
                    : n
            )
        )
        router.push(`/client/briefs/${notif.brief_id}`)
    }

    const groups = groupByRecency(notifications)
    let globalIdx = 0

    return (
        <div
            style={{
                maxWidth: 390,
                background: '#FFFFFF',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            {/* ---- Header ---- */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 20px 16px',
                }}
            >
                <Link
                    href="/client"
                    style={{ fontSize: 20, color: '#32302F', textDecoration: 'none', lineHeight: 1 }}
                >
                    ←
                </Link>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#32302F' }}>
                    Notifications
                </span>
                <button
                    onClick={markAllRead}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#00C07B',
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 500,
                        padding: 0,
                    }}
                >
                    Mark all read
                </button>
            </div>

            {/* ---- Notification list ---- */}
            <div style={{ padding: '0 16px', flex: 1 }}>
                {isLoading && notifications.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B6867', fontSize: 14 }}>
                        Loading notifications...
                    </div>
                )}
                {notifications.length === 0 ? (
                    /* ---- Empty state ---- */
                    <div
                        style={{
                            paddingTop: 80,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                background: '#F7F6F4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 22,
                            }}
                        >
                            🔔
                        </div>
                        <div
                            style={{
                                fontFamily: 'Georgia, serif',
                                fontSize: 16,
                                color: '#32302F',
                                marginTop: 16,
                            }}
                        >
                            You&apos;re all caught up
                        </div>
                        <div style={{ fontSize: 14, color: '#6B6867', marginTop: 4 }}>
                            No new notifications
                        </div>
                    </div>
                ) : (
                    groups.map((group) => (
                        <div key={group.label}>
                            {/* Section label */}
                            <div
                                style={{
                                    fontSize: 11,
                                    color: '#6B6867',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    padding: '12px 4px 8px',
                                    fontWeight: 500,
                                }}
                            >
                                {group.label}
                            </div>

                            {group.items.map((notif) => {
                                const isUnread = notif.status === 'delivered' && notif.opened_at === null
                                const idx = globalIdx++

                                return (
                                    <div
                                        key={notif.notification_id}
                                        className="slide-up"
                                        onClick={() => handleTap(notif)}
                                        style={{
                                            background: '#FFFFFF',
                                            borderRadius: 12,
                                            padding: 14,
                                            marginBottom: 8,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            opacity: 0,
                                            animationDelay: `${idx * 80}ms`,
                                            animationFillMode: 'forwards',
                                            transition: 'background 150ms ease',
                                        }}
                                    >
                                        {/* Lightning icon */}
                                        <div
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                background: isUnread ? '#E6F9F1' : '#F7F6F4',
                                                color: isUnread ? '#00C07B' : '#6B6867',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 14,
                                                flexShrink: 0,
                                            }}
                                        >
                                            ⚡
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, paddingLeft: 12 }}>
                                            <div
                                                style={{
                                                    fontSize: 14,
                                                    color: isUnread ? '#32302F' : '#6B6867',
                                                    lineHeight: 1.4,
                                                    fontWeight: isUnread ? 500 : 400,
                                                }}
                                            >
                                                {notif.headline}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#6B6867', marginTop: 4 }}>
                                                {formatTimeSince(notif.delivered_at)}
                                            </div>
                                        </div>

                                        {/* Chevron */}
                                        <span
                                            style={{
                                                color: '#6B6867',
                                                fontSize: 18,
                                                alignSelf: 'center',
                                                marginLeft: 8,
                                                flexShrink: 0,
                                            }}
                                        >
                                            ›
                                        </span>

                                        {/* Unread dot */}
                                        {isUnread && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 14,
                                                    right: 14,
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    background: '#00C07B',
                                                }}
                                            />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
