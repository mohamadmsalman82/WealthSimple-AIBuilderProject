'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const EVENT_TYPES = [
    'new_baby', 'new_job', 'income_drop', 'marriage', 'divorce', 'spouse_death',
    'lump_sum_deposit', 'debt_payoff', 'child_leaving', 'retirement_approaching',
    'home_purchase', 'inheritance',
]

const INPUT_STYLE: React.CSSProperties = {
    background: '#1A1A1A',
    border: '1px solid #2A2A2A',
    color: '#E0E0E0',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 13,
    fontFamily: 'monospace',
    width: '100%',
    maxWidth: 480,
    outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
    fontSize: 11,
    color: '#6B6867',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    marginBottom: 6,
    display: 'block',
    letterSpacing: '0.05em',
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ClientRow {
    id: string
    name: string
    province: string
    age: number
    income_bracket: string
}

interface LogEntry {
    timestamp: string
    clientName: string
    eventType: string
}

interface ScanResult {
    client_id: string
    client_name: string
    event_type: string
    confidence_score: number
    status: string
    event_id: string | null
    skipped: boolean
}

interface ScanResponse {
    message: string
    clients_scanned: number
    signals_detected: number
    events_created: number
    results: ScanResult[]
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function DevSignalPage() {
    const [clients, setClients] = useState<ClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedClient, setSelectedClient] = useState('')
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
    const [signalSummary, setSignalSummary] = useState('')
    const [confidence, setConfidence] = useState(0.85)
    const [isFiring, setIsFiring] = useState(false)
    const [result, setResult] = useState<string | null>(null)
    const [sessionLog, setSessionLog] = useState<LogEntry[]>([])

    // Account Monitor scan state
    const [isScanning, setIsScanning] = useState(false)
    const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
    const [scanError, setScanError] = useState<string | null>(null)

    // Load clients
    useEffect(() => {
        async function load() {
            try {
                const supabase = createClient()
                const { data } = await supabase
                    .from('clients')
                    .select('id, name, province, age, income_bracket')
                    .order('name')
                if (data) setClients(data)
            } catch (err) {
                console.log('Failed to load clients:', err)
            }
            setLoading(false)
        }
        load()
    }, [])

    const selectedClientObj = clients.find((c) => c.id === selectedClient)
    const canFire = selectedClient !== '' && selectedEvent !== null

    // ---- Account Monitor Scan handler ----
    const handleScan = useCallback(async () => {
        setIsScanning(true)
        setScanResult(null)
        setScanError(null)
        try {
            const res = await api.post('/api/signals/scan', {}) as ScanResponse
            setScanResult(res)
        } catch (err: any) {
            setScanError(err?.message ?? 'Scan failed — is the backend running?')
        } finally {
            setIsScanning(false)
        }
    }, [])

    const handleFire = useCallback(async () => {
        if (!canFire || !selectedEvent) return
        setIsFiring(true)

        const payload = {
            client_id: selectedClient,
            event_type: selectedEvent,
            source: 'account_signal',
            signal_summary: signalSummary || null,
            confidence_score: confidence,
        }

        try {
            const res = await api.post('/api/events', payload)
            setResult(JSON.stringify(res, null, 2))
        } catch {
            setResult(
                JSON.stringify(
                    {
                        status: 'api_unavailable',
                        note: "Signal will fire when Mo's backend is connected",
                        event_type: selectedEvent,
                        client_id: selectedClient,
                    },
                    null,
                    2
                )
            )
        }

        // Log entry
        setSessionLog((prev) => [
            {
                timestamp: new Date().toLocaleTimeString('en-CA', { hour12: false }),
                clientName: selectedClientObj?.name ?? selectedClient,
                eventType: selectedEvent,
            },
            ...prev,
        ])
        setIsFiring(false)
    }, [canFire, selectedClient, selectedEvent, signalSummary, confidence, selectedClientObj])

    return (
        <div>
            {/* ============================================================ */}
            {/*  ACCOUNT SIGNAL MONITOR — AUTO SCAN                          */}
            {/* ============================================================ */}
            <div
                style={{
                    background: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: 10,
                    padding: 24,
                    marginBottom: 32,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>📡</span>
                    <span style={{ fontSize: 11, color: '#00C07B', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        ACCOUNT SIGNAL MONITOR
                    </span>
                </div>
                <div style={{ fontSize: 14, color: '#E0E0E0', fontFamily: 'monospace', marginBottom: 6 }}>
                    Scan all client transactions for life event patterns
                </div>
                <div style={{ fontSize: 12, color: '#6B6867', fontFamily: 'monospace', marginBottom: 16, lineHeight: 1.6 }}>
                    Runs 6 detectors (new baby, new job, lump sum deposit, debt payoff, home purchase, inheritance)
                    against every client&apos;s transaction history. Detected signals are classified and routed automatically.
                    Duplicate signals are skipped.
                </div>

                <button
                    onClick={handleScan}
                    disabled={isScanning}
                    style={{
                        background: isScanning ? '#2A2A2A' : '#00C07B',
                        color: isScanning ? '#6B6867' : '#0F0F0F',
                        border: 'none',
                        borderRadius: 6,
                        padding: '12px 28px',
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        cursor: isScanning ? 'not-allowed' : 'pointer',
                        opacity: isScanning ? 0.7 : 1,
                        transition: 'all 150ms ease',
                    }}
                >
                    {isScanning ? '⏳ Scanning transactions...' : '📡 Run Account Monitor'}
                </button>

                {/* Scan error */}
                {scanError && (
                    <div
                        style={{
                            marginTop: 14,
                            padding: '10px 14px',
                            background: 'rgba(232,68,58,0.1)',
                            border: '1px solid rgba(232,68,58,0.3)',
                            borderRadius: 6,
                            fontSize: 13,
                            fontFamily: 'monospace',
                            color: '#E8443A',
                        }}
                    >
                        {scanError}
                    </div>
                )}

                {/* Scan results */}
                {scanResult && (
                    <div style={{ marginTop: 16 }}>
                        {/* Summary banner */}
                        <div
                            style={{
                                display: 'flex',
                                gap: 24,
                                marginBottom: 14,
                                flexWrap: 'wrap',
                            }}
                        >
                            {[
                                { label: 'Clients Scanned', value: scanResult.clients_scanned, color: '#E0E0E0' },
                                { label: 'Signals Detected', value: scanResult.signals_detected, color: '#00C07B' },
                                { label: 'Events Created', value: scanResult.events_created, color: '#00C07B' },
                                { label: 'Duplicates Skipped', value: scanResult.results.filter((r) => r.skipped).length, color: '#6B6867' },
                            ].map((stat) => (
                                <div key={stat.label} style={{ fontFamily: 'monospace' }}>
                                    <div style={{ fontSize: 22, color: stat.color, fontWeight: 700 }}>{stat.value}</div>
                                    <div style={{ fontSize: 11, color: '#6B6867', marginTop: 2 }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Individual results */}
                        {scanResult.results.length > 0 && (
                            <div
                                style={{
                                    background: '#0F0F0F',
                                    border: '1px solid #2A2A2A',
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Header */}
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 140px 80px 120px',
                                        padding: '8px 12px',
                                        borderBottom: '1px solid #2A2A2A',
                                        fontSize: 10,
                                        color: '#6B6867',
                                        fontFamily: 'monospace',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    <span>CLIENT</span>
                                    <span>EVENT TYPE</span>
                                    <span>CONF.</span>
                                    <span>STATUS</span>
                                </div>

                                {/* Rows */}
                                {scanResult.results.map((r, i) => {
                                    const statusColor =
                                        r.status === 'routed' ? '#00C07B'
                                            : r.status === 'held' || r.status === 'pending_classification' ? '#F5A623'
                                                : r.skipped ? '#4A4A4A'
                                                    : '#E8443A'
                                    const statusLabel =
                                        r.status === 'skipped_duplicate' ? 'duplicate'
                                            : r.status === 'insert_error' ? 'error'
                                                : r.status
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 140px 80px 120px',
                                                padding: '8px 12px',
                                                borderBottom: i === scanResult.results.length - 1 ? 'none' : '1px solid #1A1A1A',
                                                fontSize: 12,
                                                fontFamily: 'monospace',
                                                opacity: r.skipped ? 0.5 : 1,
                                            }}
                                        >
                                            <span style={{ color: '#E0E0E0' }}>{r.client_name}</span>
                                            <span style={{ color: '#00C07B' }}>{r.event_type}</span>
                                            <span style={{ color: '#E0E0E0' }}>{r.confidence_score.toFixed(2)}</span>
                                            <span style={{ color: statusColor, fontWeight: 500 }}>{statusLabel}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {scanResult.results.length === 0 && scanResult.clients_scanned > 0 && (
                            <div style={{ fontSize: 13, color: '#6B6867', fontFamily: 'monospace' }}>
                                No patterns detected in current transaction data.
                            </div>
                        )}

                        {/* Clear button */}
                        <button
                            onClick={() => setScanResult(null)}
                            style={{
                                marginTop: 12,
                                background: 'none',
                                border: 'none',
                                color: '#6B6867',
                                fontFamily: 'monospace',
                                fontSize: 11,
                                cursor: 'pointer',
                                padding: '4px 0',
                            }}
                        >
                            Clear results
                        </button>
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/*  MANUAL SIGNAL TRIGGER (existing)                            */}
            {/* ============================================================ */}

            {/* ---- Title ---- */}
            <div style={{ fontSize: 11, color: '#6B6867', fontFamily: 'monospace', textTransform: 'uppercase' }}>
        // MANUAL SIGNAL TRIGGER
            </div>
            <div style={{ fontSize: 20, color: '#E0E0E0', fontFamily: 'monospace', marginTop: 4 }}>
                Fire a life event signal for any client
            </div>

            {/* ---- Client selector ---- */}
            <div style={{ marginTop: 24 }}>
                <span style={LABEL_STYLE}>CLIENT</span>
                {loading ? (
                    <div style={{ fontSize: 13, color: '#6B6867', fontFamily: 'monospace' }}>Loading clients...</div>
                ) : (
                    <select
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        style={{ ...INPUT_STYLE, cursor: 'pointer' }}
                    >
                        <option value="">Select a client...</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} — {c.province}, {c.age}, {c.income_bracket}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* ---- Event type grid ---- */}
            <div style={{ marginTop: 20 }}>
                <span style={LABEL_STYLE}>EVENT TYPE</span>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8,
                        maxWidth: 600,
                        marginTop: 6,
                    }}
                >
                    {EVENT_TYPES.map((evt) => {
                        const isActive = selectedEvent === evt
                        return (
                            <button
                                key={evt}
                                onClick={() => setSelectedEvent(evt)}
                                style={{
                                    background: isActive ? 'rgba(0,192,123,0.1)' : '#1A1A1A',
                                    border: `1px solid ${isActive ? '#00C07B' : '#2A2A2A'}`,
                                    color: isActive ? '#00C07B' : '#6B6867',
                                    borderRadius: 6,
                                    padding: '10px 14px',
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 150ms ease',
                                }}
                            >
                                {evt}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ---- Signal summary ---- */}
            <div style={{ marginTop: 20 }}>
                <span style={LABEL_STYLE}>SIGNAL SUMMARY</span>
                <textarea
                    value={signalSummary}
                    onChange={(e) => setSignalSummary(e.target.value)}
                    placeholder='Describe the signal detected (e.g. "Single deposit of $47,000 — source unconfirmed")'
                    style={{
                        ...INPUT_STYLE,
                        maxWidth: 600,
                        minHeight: 80,
                        resize: 'vertical' as const,
                        display: 'block',
                    }}
                />
            </div>

            {/* ---- Confidence score ---- */}
            <div style={{ marginTop: 20, maxWidth: 600 }}>
                <span style={LABEL_STYLE}>CONFIDENCE SCORE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                        type="range"
                        min={0.5}
                        max={0.99}
                        step={0.01}
                        value={confidence}
                        onChange={(e) => setConfidence(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: '#00C07B' }}
                    />
                    <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#00C07B', minWidth: 40 }}>
                        {confidence.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* ---- Fire button ---- */}
            <button
                onClick={handleFire}
                disabled={!canFire || isFiring}
                style={{
                    background: canFire ? '#00C07B' : '#2A2A2A',
                    color: canFire ? '#0F0F0F' : '#6B6867',
                    border: 'none',
                    borderRadius: 6,
                    padding: '12px 28px',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    marginTop: 20,
                    cursor: canFire && !isFiring ? 'pointer' : 'not-allowed',
                    opacity: isFiring ? 0.7 : 1,
                    transition: 'all 150ms ease',
                }}
            >
                {isFiring ? 'Firing...' : canFire ? '⚡ Fire Signal' : 'Select client and event type first'}
            </button>

            {/* ---- Result panel ---- */}
            {result !== null && (
                <div
                    style={{
                        background: '#1A1A1A',
                        border: '1px solid #2A2A2A',
                        borderRadius: 6,
                        padding: 16,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        maxWidth: 600,
                        marginTop: 16,
                        position: 'relative',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: '#6B6867' }}>// RESULT</span>
                        <button
                            onClick={() => setResult(null)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#6B6867',
                                fontFamily: 'monospace',
                                fontSize: 11,
                                cursor: 'pointer',
                            }}
                        >
                            Clear
                        </button>
                    </div>
                    <pre style={{ color: '#E0E0E0', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{result}</pre>
                </div>
            )}

            {/* ---- Session log ---- */}
            {sessionLog.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 11, color: '#6B6867', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>
            // SESSION LOG
                    </div>
                    {sessionLog.map((entry, i) => (
                        <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: '#6B6867', lineHeight: 1.8 }}>
                            <span style={{ color: '#4A4A4A' }}>{entry.timestamp}</span>{' '}
                            <span style={{ color: '#00C07B' }}>{entry.clientName}</span>{' '}
                            → {entry.eventType}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
