'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Stub data                                                         */
/* ------------------------------------------------------------------ */

const STUB_CLIENT = {
    client_id: 'c1',
    name: 'Sarah Chen',
    avatar_initials: 'SC',
    portfolio_total: 47832.54,
    accounts: [
        { type: 'TFSA', balance: 24150.0, growth: 3.2 },
        { type: 'RRSP', balance: 18340.0, growth: 1.8 },
        { type: 'Cash', balance: 5342.54, growth: 0 },
    ],
}

const STUB_NOTIFICATIONS = [
    {
        notification_id: 'n1',
        brief_id: 'b1',
        client_id: 'c1',
        headline: "We noticed something. Here's what it means for your money.",
        status: 'delivered',
        delivered_at: new Date(Date.now() - 46 * 60 * 1000).toISOString(),
        opened_at: null as string | null,
    },
]

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

function BellIcon({ hasUnread }: { hasUnread: boolean }) {
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
            {/* Red dot */}
            {hasUnread && (
                <div
                    style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#E8443A',
                        border: '1.5px solid #FFFFFF',
                    }}
                />
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

function InvestIcon() {
    return (
        <div style={{ width: 24, height: 24, position: 'relative' }}>
            {/* Rising chart line */}
            <div style={{ position: 'absolute', bottom: 4, left: 2, width: 20, height: 2, background: '#6B6867', borderRadius: 1 }} />
            <div style={{ position: 'absolute', bottom: 6, left: 6, width: 2, height: 8, background: '#6B6867', borderRadius: 1, transform: 'rotate(-30deg)' }} />
            <div style={{ position: 'absolute', bottom: 10, left: 12, width: 2, height: 10, background: '#6B6867', borderRadius: 1, transform: 'rotate(15deg)' }} />
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
    const client = STUB_CLIENT
    const notifications = STUB_NOTIFICATIONS
    const hasUnread = notifications.some((n) => n.status === 'delivered' && n.opened_at === null)
    const { dollars, cents } = formatCurrency(client.portfolio_total)

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
                            {client.name.split(' ')[0]}
                        </div>
                    </div>
                    <div onClick={() => router.push('/client/notifications')}>
                        <BellIcon hasUnread={hasUnread} />
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
                    {client.accounts.map((acc) => (
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
                                            <span style={{ fontSize: 11, color: '#6B6867' }}>
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

                {/* Invest */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default' }}>
                    <InvestIcon />
                    <span style={{ fontSize: 10, color: '#6B6867' }}>Invest</span>
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
