'use client'

import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  Stub data                                                         */
/* ------------------------------------------------------------------ */

const STUB_ACCOUNTS = [
    {
        type: 'TFSA',
        balance: 24150.0,
        contribution_room: 18500,
        growth_percent: 3.2,
        growth_amount: 748.2,
        color: '#00C07B',
        description: 'Tax-Free Savings Account',
        href: '/client/accounts/tfsa',
    },
    {
        type: 'RRSP',
        balance: 18340.0,
        contribution_room: 22400,
        growth_percent: 1.8,
        growth_amount: 323.8,
        color: '#32302F',
        description: 'Registered Retirement Savings Plan',
        href: '/client/accounts/rrsp',
    },
    {
        type: 'Cash',
        balance: 5342.54,
        contribution_room: null as number | null,
        growth_percent: 0,
        growth_amount: 0,
        color: '#6B6867',
        description: 'Wealthsimple Cash',
        href: '/client/accounts/cash',
    },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDollars(val: number): string {
    return '$' + Math.floor(val).toLocaleString('en-CA')
}

function formatFull(val: number): { dollars: string; cents: string } {
    const dollars = Math.floor(val).toLocaleString('en-CA')
    const cents = (val % 1).toFixed(2).slice(1)
    return { dollars: `$${dollars}`, cents }
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function AccountsPage() {
    const total = STUB_ACCOUNTS.reduce((sum, a) => sum + a.balance, 0)
    const totalGrowth = STUB_ACCOUNTS.reduce((sum, a) => sum + a.growth_amount, 0)
    const { dollars, cents } = formatFull(total)

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
                    Accounts
                </span>
                <div style={{ width: 40 }} />
            </div>

            {/* ---- Total row ---- */}
            <div style={{ padding: '8px 20px 20px' }}>
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
                    <span style={{ fontSize: 36, fontFamily: 'Georgia, serif', color: '#32302F', lineHeight: 1 }}>
                        {dollars}
                    </span>
                    <span style={{ fontSize: 18, color: '#6B6867', marginLeft: 1, marginTop: 2 }}>
                        {cents}
                    </span>
                </div>
                <div style={{ fontSize: 13, color: '#00C07B', marginTop: 6 }}>
                    ↑ ${totalGrowth.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} this month
                </div>
            </div>

            {/* ---- Account cards ---- */}
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 32 }}>
                {STUB_ACCOUNTS.map((acc, idx) => (
                    <div
                        key={acc.type}
                        className="slide-up"
                        style={{
                            background: '#FFFFFF',
                            borderRadius: 16,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            padding: 20,
                            opacity: 0,
                            animationDelay: `${idx * 60}ms`,
                            animationFillMode: 'forwards',
                        }}
                    >
                        {/* Top row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#6B6867', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {acc.type}
                            </span>
                            <span style={{ fontSize: 11, color: '#6B6867' }}>{acc.description}</span>
                        </div>

                        {/* Balance row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
                            <span style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: '#32302F' }}>
                                {formatDollars(acc.balance)}
                            </span>
                            {acc.growth_amount > 0 && (
                                <span style={{ fontSize: 13, color: '#00C07B' }}>
                                    ↑ ${acc.growth_amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                                </span>
                            )}
                        </div>

                        {/* Accent bar */}
                        <div
                            style={{
                                height: 3,
                                borderRadius: 2,
                                background: acc.color,
                                width: '100%',
                                margin: '12px 0',
                            }}
                        />

                        {/* Contribution room */}
                        {acc.contribution_room !== null && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: '#6B6867' }}>Contribution room</span>
                                <span style={{ fontSize: 14, color: '#32302F', fontWeight: 500 }}>
                                    {formatDollars(acc.contribution_room)}
                                </span>
                            </div>
                        )}

                        {/* CTA */}
                        <Link
                            href={acc.href}
                            style={{
                                fontSize: 13,
                                color: acc.color,
                                fontWeight: 500,
                                textDecoration: 'none',
                                display: 'inline-block',
                                marginTop: 4,
                            }}
                        >
                            View account →
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    )
}
