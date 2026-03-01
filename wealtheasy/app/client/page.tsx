'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useDemoMode } from '@/lib/demo-mode-context'
import { createClient } from '@/lib/supabase/client'

/* ------------------------------------------------------------------ */
/*  Account-split helpers                                              */
/* ------------------------------------------------------------------ */

const ACCOUNT_WEIGHTS: Record<string, number> = {
    TFSA: 0.40, RRSP: 0.35, FHSA: 0.10, Cash: 0.10, Crypto: 0.05,
}
const ACCOUNT_GROWTH: Record<string, number> = {
    TFSA: 3.2, RRSP: 1.8, FHSA: 2.4, Cash: 0, Crypto: 8.1,
}

/** Distribute portfolio_total across the client's account types. */
function splitPortfolio(
    accountTypes: string[],
    total: number,
): { type: string; balance: number; growth: number }[] {
    if (!accountTypes.length) return []
    const rawWeights = accountTypes.map((t) => ACCOUNT_WEIGHTS[t] ?? 0.1)
    const sum = rawWeights.reduce((a, b) => a + b, 0)
    return accountTypes.map((t, i) => ({
        type: t,
        balance: Math.round((rawWeights[i] / sum) * total * 100) / 100,
        growth: ACCOUNT_GROWTH[t] ?? 0,
    }))
}

/* ------------------------------------------------------------------ */
/*  Stub / fallback data                                               */
/* ------------------------------------------------------------------ */

const STUB_NOTIFICATIONS: {
    notification_id: string
    brief_id: string
    client_id: string
    headline: string
    status: string
    delivered_at: string
    opened_at: string | null
}[] = []

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatCurrency(val: number): { dollars: string; cents: string } {
    const dollars = Math.floor(val).toLocaleString('en-CA')
    const cents = (val % 1).toFixed(2).slice(1) // ".54"
    return { dollars: `$${dollars}`, cents }
}

function formatBalance(val: number): string {
    return '$' + Math.floor(val).toLocaleString('en-CA')
}

function formatTimeSince(iso: string): string {
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 60) return `${diff}m ago`
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
}

function getGreeting(): string {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning,'
    if (h < 18) return 'Good afternoon,'
    return 'Good evening,'
}

/* ------------------------------------------------------------------ */
/*  CSS icon sub-components                                           */
/* ------------------------------------------------------------------ */

function SignalBars() {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {[4, 6, 8, 10].map((h, i) => (
                <div
                    key={i}
                    style={{
                        width: 3,
                        height: h,
                        background: '#32302F',
                        borderRadius: 1,
                    }}
                />
            ))}
        </div>
    )
}

function WifiIcon() {
    return (
        <div style={{ position: 'relative', width: 16, height: 12 }}>
            {[14, 10, 6].map((size, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: size,
                        height: size * 0.6,
                        borderTop: '2px solid #32302F',
                        borderLeft: '2px solid transparent',
                        borderRight: '2px solid transparent',
                        borderRadius: `${size}px ${size}px 0 0`,
                    }}
                />
            ))}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: '#32302F',
                }}
            />
        </div>
    )
}

function BatteryIcon() {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
                style={{
                    width: 22,
                    height: 11,
                    border: '1.5px solid #32302F',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 1,
                        left: 1,
                        bottom: 1,
                        width: '70%',
                        background: '#32302F',
                        borderRadius: 1,
                    }}
                />
            </div>
            <div
                style={{
                    width: 3,
                    height: 5,
                    background: '#32302F',
                    borderRadius: '0 1px 1px 0',
                    marginLeft: 0.5,
                }}
            />
        </div>
    )
}

function BellIcon({ unreadCount }: { unreadCount: number }) {
    return (
        <div style={{ position: 'relative', width: 24, height: 24, cursor: 'pointer' }}>
            {/* Bell body */}
            <div
                style={{
                    position: 'absolute',
                    top: 2,
                    left: 3,
                    width: 18,
                    height: 14,
                    background: '#32302F',
                    borderRadius: '6px 6px 0 0',
                }}
            />
            {/* Bell base */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 1,
                    width: 22,
                    height: 3,
                    background: '#32302F',
                    borderRadius: 2,
                }}
            />
            {/* Clapper */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 6,
                    height: 4,
                    background: '#32302F',
                    borderRadius: '0 0 3px 3px',
                }}
            />
            {/* Notification badge */}
            {unreadCount > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: unreadCount > 1 ? 16 : 8,
                        height: unreadCount > 1 ? 16 : 8,
                        borderRadius: '50%',
                        background: '#E8443A',
                        border: '1.5px solid #FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        color: '#FFFFFF',
                        fontWeight: 600,
                    }}
                >
                    {unreadCount > 1 ? unreadCount : ''}
                </div>
            )}
        </div>
    )
}

function HomeIcon({ active }: { active: boolean }) {
    const c = active ? '#00C07B' : '#6B6867'
    return (
        <div style={{ width: 24, height: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
            {/* Roof triangle */}
            <div
                style={{
                    width: 0,
                    height: 0,
                    borderLeft: '9px solid transparent',
                    borderRight: '9px solid transparent',
                    borderBottom: `7px solid ${c}`,
                }}
            />
            {/* Body */}
            <div style={{ width: 14, height: 10, background: c, borderRadius: '0 0 2px 2px' }} />
        </div>
    )
}

function AccountsIcon() {
    return (
        <div style={{ width: 24, height: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 3, background: '#6B6867', borderRadius: 2 }} />
            <div style={{ width: 18, height: 3, background: '#6B6867', borderRadius: 2 }} />
        </div>
    )
}

function SpendIcon() {
    return (
        <div
            style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '2px solid #6B6867',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: '#6B6867',
                fontWeight: 700,
            }}
        >
            $
        </div>
    )
}

function TaxIcon() {
    return (
        <div
            style={{
                width: 16,
                height: 18,
                border: '2px solid #6B6867',
                borderRadius: 2,
                position: 'relative',
            }}
        >
            {/* Folded corner */}
            <div
                style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid #FFFFFF',
                    borderBottom: '6px solid #6B6867',
                }}
            />
            {/* Lines */}
            <div style={{ position: 'absolute', top: 6, left: 3, right: 3, height: 1.5, background: '#6B6867', borderRadius: 1 }} />
            <div style={{ position: 'absolute', top: 10, left: 3, right: 3, height: 1.5, background: '#6B6867', borderRadius: 1 }} />
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function ClientDashboard() {
    const router = useRouter()
    const { selectedClientId, selectedClientName } = useDemoMode()

    // ── Live client profile from Supabase ──
    const [clientData, setClientData] = useState<{
        portfolio_total: number
        avatar_initials: string
        accounts: { type: string; balance: number; growth: number }[]
    } | null>(null)

    useEffect(() => {
        if (!selectedClientId) return
        const load = async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('clients')
                .select('portfolio_total, avatar_initials, accounts')
                .eq('id', selectedClientId)
                .single()
            if (error) {
                console.error('[ClientDashboard] Failed to fetch client:', error.message)
                return
            }
            if (data) {
                const accountTypes: string[] = Array.isArray(data.accounts) ? data.accounts : []
                setClientData({
                    portfolio_total: data.portfolio_total ?? 0,
                    avatar_initials: data.avatar_initials ?? '',
                    accounts: splitPortfolio(accountTypes, data.portfolio_total ?? 0),
                })
            }
        }
        load()
    }, [selectedClientId])

    // ── Notifications from backend API ──
    const [notifications, setNotifications] = useState(STUB_NOTIFICATIONS)

    useEffect(() => {
        if (!selectedClientId) return
        const load = async () => {
            try {
                const result = await api.get(`/api/notifications?client_id=${selectedClientId}`) as any
                if (result?.notifications) setNotifications(result.notifications)
            } catch (err) {
                console.log('Notifications API unavailable:', err)
            }
        }
        load()
    }, [selectedClientId])

    // ── Derived values ──
    const portfolioTotal = clientData?.portfolio_total ?? 0
    const accountCards = clientData?.accounts ?? []
    const unreadCount = notifications.filter(n => n.status === 'delivered' && !n.opened_at).length
    const { dollars, cents } = formatCurrency(portfolioTotal)

    // Live time
    const [timeStr, setTimeStr] = useState('')
    useEffect(() => {
        const update = () =>
            setTimeStr(
                new Date().toLocaleTimeString('en-CA', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                })
            )
        update()
        const id = setInterval(update, 60000)
        return () => clearInterval(id)
    }, [])

    return (
        <div
            style={{
                maxWidth: 390,
                background: '#FFFFFF',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            {/* ---- Scrollable content ---- */}
            <div style={{ flex: 1, paddingBottom: 72, overflowY: 'auto' }}>
                {/* ==== Status bar ==== */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 20px 4px',
                        background: '#FFFFFF',
                    }}
                >
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#32302F' }}>{timeStr}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <SignalBars />
                        <WifiIcon />
                        <BatteryIcon />
                    </div>
                </div>

                {/* ==== Header row ==== */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '8px 20px 16px',
                    }}
                >
                    <div>
                        <div style={{ fontSize: 13, color: '#6B6867' }}>{getGreeting()}</div>
                        <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', color: '#32302F', marginTop: 2 }}>
                            {selectedClientName.split(' ')[0] || 'there'}
                        </div>
                    </div>
                    <div onClick={() => router.push('/client/notifications')}>
                        <BellIcon unreadCount={unreadCount} />
                    </div>
                </div>

                {/* ==== Portfolio total ==== */}
                <div className="fade-in" style={{ padding: '0 20px 24px' }}>
                    <div
                        style={{
                            fontSize: 12,
                            color: '#6B6867',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: 6,
                        }}
                    >
                        Total portfolio
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <span
                            style={{
                                fontSize: 42,
                                fontFamily: 'Georgia, serif',
                                color: '#32302F',
                                lineHeight: 1,
                            }}
                        >
                            {dollars}
                        </span>
                        <span
                            style={{
                                fontSize: 22,
                                color: '#6B6867',
                                marginLeft: 1,
                                marginTop: 2,
                            }}
                        >
                            {cents}
                        </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#00C07B', marginTop: 8 }}>↑ 3.2% this month</div>
                </div>

                {/* ==== Account card scroll ==== */}
                <div
                    style={{
                        display: 'flex',
                        gap: 12,
                        padding: '0 20px',
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    {accountCards.map((acc) => (
                        <div
                            key={acc.type}
                            style={{
                                background: '#F7F6F4',
                                borderRadius: 16,
                                padding: 16,
                                minWidth: 140,
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    color: '#6B6867',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: 8,
                                }}
                            >
                                {acc.type}
                            </div>
                            <div style={{ fontSize: 20, fontFamily: 'Georgia, serif', color: '#32302F' }}>
                                {formatBalance(acc.balance)}
                            </div>
                            {acc.growth !== 0 ? (
                                <div style={{ fontSize: 11, color: '#00C07B', marginTop: 4 }}>↑ {acc.growth}%</div>
                            ) : (
                                <div style={{ fontSize: 11, color: '#6B6867', marginTop: 4 }}>Available</div>
                            )}
                        </div>
                    ))}
                    {/* + card */}
                    <div
                        style={{
                            background: '#FFFFFF',
                            border: '1.5px dashed #EBEBEB',
                            borderRadius: 16,
                            padding: 16,
                            minWidth: 140,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <span style={{ fontSize: 24, color: '#6B6867' }}>+</span>
                    </div>
                </div>

                {/* ==== What's New ==== */}
                <div style={{ padding: '24px 20px 0' }}>
                    <div style={{ fontSize: 16, fontFamily: 'Georgia, serif', color: '#32302F', marginBottom: 12 }}>
                        What&apos;s new
                    </div>

                    {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#6B6867', fontSize: 14 }}>
                            No new updates
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {notifications.map((notif) => {
                                const isUnread = notif.status === 'delivered' && notif.opened_at === null
                                return (
                                    <div
                                        key={notif.notification_id}
                                        className="slide-up"
                                        onClick={() => router.push(`/client/briefs/${notif.brief_id}`)}
                                        style={{
                                            background: '#F7F6F4',
                                            borderRadius: 16,
                                            padding: 16,
                                            cursor: 'pointer',
                                            transition: 'background 150ms ease',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#EEEDE9')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = '#F7F6F4')}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {isUnread && (
                                                    <div
                                                        style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            background: '#00C07B',
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <span style={{ fontSize: 11, color: '#6B6867' }} suppressHydrationWarning>
                                                {formatTimeSince(notif.delivered_at)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 14, color: '#32302F', lineHeight: 1.4, marginTop: 6 }}>
                                            {notif.headline}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#00C07B', marginTop: 8 }}>View details →</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ==== Life event entry card ==== */}
                <Link href="/client/life-event" style={{ textDecoration: 'none', display: 'block', padding: '16px 20px 0' }}>
                    <div
                        style={{
                            background: '#F7F6F4',
                            borderRadius: 16,
                            padding: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'background 150ms ease',
                        }}
                    >
                        <div>
                            <div style={{ fontSize: 14, color: '#32302F', fontWeight: 500 }}>
                                Something change recently?
                            </div>
                            <div style={{ fontSize: 12, color: '#6B6867', marginTop: 2 }}>
                                Tell us about a life event
                            </div>
                        </div>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                background: '#00C07B',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                fontSize: 18,
                                flexShrink: 0,
                            }}
                        >
                            →
                        </div>
                    </div>
                </Link>
            </div>

            {/* ==== Bottom nav bar ==== */}
            <div
                style={{
                    position: 'sticky',
                    bottom: 0,
                    background: '#FFFFFF',
                    borderTop: '1px solid #EBEBEB',
                    padding: '8px 0 16px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    zIndex: 10,
                }}
            >
                {/* Home (active) */}
                <div
                    onClick={() => router.push('/client')}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                >
                    <HomeIcon active={true} />
                    <span style={{ fontSize: 10, color: '#00C07B', fontWeight: 500 }}>Home</span>
                </div>

                {/* Accounts */}
                <div
                    onClick={() => router.push('/client/accounts')}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                >
                    <AccountsIcon />
                    <span style={{ fontSize: 10, color: '#6B6867' }}>Accounts</span>
                </div>

                {/* Spend */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default' }}>
                    <SpendIcon />
                    <span style={{ fontSize: 10, color: '#6B6867' }}>Spend</span>
                </div>

                {/* Tax */}
                <div
                    onClick={() => router.push('/client/tax')}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                >
                    <TaxIcon />
                    <span style={{ fontSize: 10, color: '#6B6867' }}>Tax</span>
                </div>
            </div>
        </div>
    )
}
