'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ClientRow {
    id: string
    name: string
    portfolio_total: number | null
    income_bracket: string
    province: string
    age: number
}

interface TransactionRow {
    id: string
    client_id: string
    amount: number
    transaction_type: string
    merchant_category: string | null
    description: string | null
    date: string
    clients: { name: string } | null
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */

const INPUT_STYLE: React.CSSProperties = {
    background: '#1A1A1A',
    border: '1px solid #2A2A2A',
    color: '#E0E0E0',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: 'monospace',
    outline: 'none',
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

export default function DevTransactionsPage() {
    const supabase = createClient()
    const [clients, setClients] = useState<ClientRow[]>([])
    const [transactions, setTransactions] = useState<TransactionRow[]>([])
    const [loading, setLoading] = useState(true)
    const [filterClient, setFilterClient] = useState('')

    // Form state
    const [formClient, setFormClient] = useState('')
    const [formAmount, setFormAmount] = useState('')
    const [formType, setFormType] = useState('credit')
    const [formCategory, setFormCategory] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Load clients
    useEffect(() => {
        async function loadClients() {
            try {
                const { data } = await supabase.from('clients').select('id, name, portfolio_total, income_bracket, province, age').order('name')
                if (data) setClients(data)
            } catch (err) {
                console.log('Failed to load clients:', err)
            }
        }
        loadClients()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Load transactions
    const loadTransactions = useCallback(async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('transactions')
                .select('*, clients(name)')
                .order('date', { ascending: false })
                .limit(100)

            if (filterClient) {
                query = query.eq('client_id', filterClient)
            }

            const { data } = await query
            if (data) setTransactions(data as TransactionRow[])
        } catch (err) {
            console.log('Failed to load transactions:', err)
        }
        setLoading(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterClient])

    useEffect(() => {
        loadTransactions()
    }, [loadTransactions])

    const handleSubmit = async () => {
        if (!formClient || !formAmount) return
        setSubmitting(true)
        setFormStatus(null)

        try {
            const { error } = await supabase.from('transactions').insert({
                client_id: formClient,
                amount: parseFloat(formAmount),
                transaction_type: formType,
                merchant_category: formCategory || null,
                description: formDescription || null,
                date: formDate,
            })

            if (error) throw error

            setFormStatus({ type: 'success', msg: '// Transaction added' })
            setFormAmount('')
            setFormCategory('')
            setFormDescription('')
            await loadTransactions()
        } catch (err) {
            setFormStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Insert failed' })
        }
        setSubmitting(false)
    }

    return (
        <div>
            {/* ---- Title ---- */}
            <div style={{ fontSize: 11, color: '#6B6867', fontFamily: 'monospace', textTransform: 'uppercase' }}>
        // TRANSACTIONS
            </div>

            {/* ---- Client filter ---- */}
            <div style={{ marginTop: 16, marginBottom: 8 }}>
                <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    style={{ ...INPUT_STYLE, cursor: 'pointer', minWidth: 320 }}
                >
                    <option value="">All clients</option>
                    {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}{c.portfolio_total != null ? ` — $${c.portfolio_total.toLocaleString('en-CA')}` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* ---- Selected client banner ---- */}
            {filterClient && (() => {
                const sel = clients.find((c) => c.id === filterClient)
                if (!sel) return null
                return (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 20,
                        background: '#1A1A1A',
                        border: '1px solid #2A2A2A',
                        borderRadius: 6,
                        padding: '8px 16px',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        marginBottom: 16,
                    }}>
                        <span style={{ color: '#00C07B', fontWeight: 600 }}>{sel.name}</span>
                        {sel.portfolio_total != null && (
                            <span style={{ color: '#E0E0E0' }}>
                                Portfolio: <span style={{ color: '#00C07B', fontWeight: 600 }}>
                                    ${sel.portfolio_total.toLocaleString('en-CA')}
                                </span>
                            </span>
                        )}
                        <span style={{ color: '#6B6867' }}>{sel.age} · {sel.province} · {sel.income_bracket}</span>
                    </div>
                )
            })()}

            {/* ---- Table ---- */}
            {loading ? (
                <div style={{ fontSize: 13, color: '#6B6867', fontFamily: 'monospace' }}>Loading transactions...</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr>
                                <th style={TH_STYLE}>DATE</th>
                                <th style={TH_STYLE}>CLIENT</th>
                                <th style={TH_STYLE}>TYPE</th>
                                <th style={TH_STYLE}>AMOUNT</th>
                                <th style={TH_STYLE}>CATEGORY</th>
                                <th style={TH_STYLE}>DESCRIPTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ ...TD_STYLE, color: '#6B6867', textAlign: 'center', padding: '24px 12px' }}>
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr
                                        key={tx.id}
                                        style={{ transition: 'background 100ms ease' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#1A1A1A')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={TD_STYLE}>{tx.date}</td>
                                        <td style={{ ...TD_STYLE, color: '#00C07B' }}>{tx.clients?.name ?? tx.client_id}</td>
                                        <td style={{ ...TD_STYLE, color: tx.transaction_type === 'credit' ? '#00C07B' : '#E8443A' }}>
                                            {tx.transaction_type}
                                        </td>
                                        <td style={TD_STYLE}>
                                            {tx.transaction_type === 'debit' ? '−' : ''}$
                                            {Math.abs(tx.amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ ...TD_STYLE, color: '#6B6867' }}>{tx.merchant_category ?? '—'}</td>
                                        <td style={{ ...TD_STYLE, color: '#6B6867' }}>
                                            {tx.description
                                                ? tx.description.length > 40
                                                    ? tx.description.slice(0, 40) + '…'
                                                    : tx.description
                                                : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ---- Manual entry form ---- */}
            <div style={{ marginTop: 32 }}>
                <div style={{ fontSize: 11, color: '#6B6867', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 12 }}>
          // ADD TRANSACTION
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: 10, color: '#6B6867', fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                            Client
                        </label>
                        <select
                            value={formClient}
                            onChange={(e) => setFormClient(e.target.value)}
                            style={{ ...INPUT_STYLE, cursor: 'pointer', minWidth: 180 }}
                        >
                            <option value="">Select...</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: '#6B6867', fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                            Amount
                        </label>
                        <input
                            type="number"
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                            placeholder="0.00"
                            style={{ ...INPUT_STYLE, width: 120 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: '#6B6867', fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                            Type
                        </label>
                        <select
                            value={formType}
                            onChange={(e) => setFormType(e.target.value)}
                            style={{ ...INPUT_STYLE, cursor: 'pointer', minWidth: 100 }}
                        >
                            <option value="credit">credit</option>
                            <option value="debit">debit</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: '#6B6867', fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                            Category
                        </label>
                        <input
                            type="text"
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            placeholder="e.g. baby_retail"
                            style={{ ...INPUT_STYLE, width: 160 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: '#6B6867', fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                            Description
                        </label>
                        <input
                            type="text"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Optional description"
                            style={{ ...INPUT_STYLE, width: 200 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 10, color: '#6B6867', fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                            Date
                        </label>
                        <input
                            type="date"
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            style={{ ...INPUT_STYLE, width: 150 }}
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!formClient || !formAmount || submitting}
                        style={{
                            background: formClient && formAmount ? '#00C07B' : '#2A2A2A',
                            color: formClient && formAmount ? '#0F0F0F' : '#6B6867',
                            border: 'none',
                            borderRadius: 6,
                            padding: '10px 20px',
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            cursor: formClient && formAmount && !submitting ? 'pointer' : 'not-allowed',
                            opacity: submitting ? 0.7 : 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {submitting ? 'Adding...' : '⚡ Add Transaction'}
                    </button>
                </div>

                {/* Form status */}
                {formStatus && (
                    <div
                        style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            color: formStatus.type === 'success' ? '#00C07B' : '#E8443A',
                            marginTop: 10,
                        }}
                    >
                        {formStatus.msg}
                    </div>
                )}
            </div>
        </div>
    )
}
