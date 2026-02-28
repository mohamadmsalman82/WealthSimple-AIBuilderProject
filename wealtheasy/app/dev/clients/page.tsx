'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ClientRow {
    id: string
    name: string
    age: number
    province: string
    income_bracket: string
    accounts: string[] | null
    tfsa_room: number | null
    rrsp_room: number | null
    dependents: number | null
    portfolio_total: number | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDollars(val: number | null): string {
    if (val === null || val === undefined) return '—'
    return '$' + val.toLocaleString('en-CA')
}

const TH_STYLE: React.CSSProperties = {
    background: '#1A1A1A',
    color: '#6B6867',
    fontSize: 11,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: '1px solid #2A2A2A',
    letterSpacing: '0.03em',
    fontWeight: 500,
}

const TD_STYLE: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#E0E0E0',
    borderBottom: '1px solid #1A1A1A',
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function DevClientsPage() {
    const [clients, setClients] = useState<ClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    useEffect(() => {
        async function load() {
            try {
                const supabase = createClient()
                const { data, error: err } = await supabase
                    .from('clients')
                    .select('id, name, age, province, income_bracket, accounts, tfsa_room, rrsp_room, dependents, portfolio_total')
                    .order('portfolio_total', { ascending: false })
                if (err) throw err
                if (data) setClients(data)
            } catch (err) {
                console.error('Failed to load clients:', err)
                setError('Failed to load clients')
            }
            setLoading(false)
        }
        load()
    }, [])

    const filtered = clients.filter((c) => {
        const q = search.toLowerCase()
        if (!q) return true
        return (
            c.name.toLowerCase().includes(q) ||
            c.province.toLowerCase().includes(q) ||
            c.income_bracket.toLowerCase().includes(q)
        )
    })

    return (
        <div>
            {/* ---- Title ---- */}
            <div style={{ fontSize: 11, color: '#6B6867', fontFamily: 'monospace', textTransform: 'uppercase' }}>
        // CLIENT PROFILES
            </div>

            {/* ---- Search ---- */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, province, or income bracket..."
                    style={{
                        background: '#1A1A1A',
                        border: '1px solid #2A2A2A',
                        color: '#E0E0E0',
                        borderRadius: 6,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontFamily: 'monospace',
                        width: '100%',
                        maxWidth: 480,
                        outline: 'none',
                    }}
                />
            </div>

            {/* ---- Loading / Error ---- */}
            {loading && (
                <div style={{ fontSize: 13, color: '#6B6867', fontFamily: 'monospace' }}>Loading clients...</div>
            )}
            {error && (
                <div style={{ fontSize: 13, color: '#E8443A', fontFamily: 'monospace' }}>{error}</div>
            )}

            {/* ---- Table ---- */}
            {!loading && !error && (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
                            <thead>
                                <tr>
                                    <th style={TH_STYLE}>CLIENT</th>
                                    <th style={{ ...TH_STYLE, color: '#00C07B' }}>PORTFOLIO</th>
                                    <th style={TH_STYLE}>AGE</th>
                                    <th style={TH_STYLE}>PROV</th>
                                    <th style={TH_STYLE}>INCOME</th>
                                    <th style={TH_STYLE}>ACCOUNTS</th>
                                    <th style={TH_STYLE}>TFSA ROOM</th>
                                    <th style={TH_STYLE}>RRSP ROOM</th>
                                    <th style={TH_STYLE}>DEPS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c) => (
                                    <tr
                                        key={c.id}
                                        style={{ transition: 'background 100ms ease' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#1A1A1A')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={{ ...TD_STYLE, color: '#00C07B' }}>{c.name}</td>
                                        <td style={{ ...TD_STYLE, color: '#00C07B', fontWeight: 600 }}>
                                            {formatDollars(c.portfolio_total)}
                                        </td>
                                        <td style={TD_STYLE}>{c.age}</td>
                                        <td style={TD_STYLE}>{c.province}</td>
                                        <td style={TD_STYLE}>{c.income_bracket}</td>
                                        <td style={TD_STYLE}>{c.accounts?.join(', ') ?? '—'}</td>
                                        <td style={TD_STYLE}>{formatDollars(c.tfsa_room)}</td>
                                        <td style={TD_STYLE}>{formatDollars(c.rrsp_room)}</td>
                                        <td style={TD_STYLE}>{c.dependents ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div
                        style={{
                            fontSize: 11,
                            color: '#6B6867',
                            fontFamily: 'monospace',
                            marginTop: 8,
                        }}
                    >
                        {filtered.length} of {clients.length} clients
                    </div>
                </>
            )}
        </div>
    )
}
