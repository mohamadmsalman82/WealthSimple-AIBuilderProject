'use client'

import Link from 'next/link'

/* ------------------------------------------------------------------ */
/*  ProductPageLayout                                                 */
/* ------------------------------------------------------------------ */

interface ProductPageLayoutProps {
    title: string
    description: string
    accentColor: string
    backHref: string
    stats: Array<{ label: string; value: string }>
    rules: Array<{ label: string; detail: string }>
    ctaLabel: string
    children?: React.ReactNode
}

export default function ProductPageLayout({
    title,
    description,
    accentColor,
    backHref,
    stats,
    rules,
    ctaLabel,
    children,
}: ProductPageLayoutProps) {
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
                    href={backHref}
                    style={{ fontSize: 20, color: '#32302F', textDecoration: 'none', lineHeight: 1, width: 40 }}
                >
                    ←
                </Link>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#32302F' }}>
                    {title}
                </span>
                <div style={{ width: 40 }} />
            </div>

            {/* ---- Hero section ---- */}
            <div
                style={{
                    padding: 20,
                    background: `${accentColor}1A`,
                    borderRadius: 16,
                    margin: '0 16px 20px',
                }}
            >
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#32302F' }}>
                    {title}
                </div>
                <p style={{ fontSize: 14, color: '#6B6867', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
                    {description}
                </p>

                {/* Stats row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                    {stats.map((stat) => (
                        <span
                            key={stat.label}
                            style={{
                                background: '#FFFFFF',
                                borderRadius: 100,
                                padding: '6px 14px',
                                fontSize: 12,
                            }}
                        >
                            <span style={{ color: '#6B6867' }}>{stat.label}</span>
                            <span style={{ color: '#6B6867' }}> · </span>
                            <span style={{ color: '#32302F', fontWeight: 500 }}>{stat.value}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* ---- Rules section ---- */}
            <div style={{ padding: '0 16px', marginBottom: 20 }}>
                <div
                    style={{
                        fontSize: 11,
                        color: '#6B6867',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 10,
                        fontWeight: 500,
                    }}
                >
                    Key rules
                </div>
                {rules.map((rule) => (
                    <div
                        key={rule.label}
                        style={{
                            background: '#FFFFFF',
                            borderRadius: 12,
                            padding: 14,
                            marginBottom: 8,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                    >
                        <div style={{ fontSize: 13, color: '#32302F', fontWeight: 500 }}>{rule.label}</div>
                        <div style={{ fontSize: 12, color: '#6B6867', lineHeight: 1.5, marginTop: 4 }}>
                            {rule.detail}
                        </div>
                    </div>
                ))}
            </div>

            {/* ---- Children ---- */}
            {children}

            {/* ---- CTA button ---- */}
            <div style={{ margin: '0 16px 32px' }}>
                <button
                    onClick={() => { }}
                    style={{
                        width: '100%',
                        padding: 14,
                        borderRadius: 100,
                        border: 'none',
                        background: '#00C07B',
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: 'all 150ms ease',
                    }}
                >
                    {ctaLabel}
                </button>
            </div>
        </div>
    )
}
