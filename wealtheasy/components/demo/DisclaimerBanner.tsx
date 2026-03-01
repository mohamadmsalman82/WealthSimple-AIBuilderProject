'use client'
import { useDemoMode } from '@/lib/demo-mode-context'

export default function DisclaimerBanner() {
    const { demoMode, selectedClientId, selectedClientName, setSelectedClient, clientOptions } = useDemoMode()

    if (!demoMode) return null

    return (
        <div
            style={{
                width: '100%',
                background: '#32302F',
                color: '#F7F6F4',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                height: 40,
                gap: 12,
                boxSizing: 'border-box',
            }}
        >
            <span style={{ opacity: 0.6, whiteSpace: 'nowrap' }}>
                Demo — not affiliated with Wealthsimple
            </span>

            {clientOptions.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ opacity: 0.5, whiteSpace: 'nowrap' }}>Viewing as</span>
                    <select
                        value={selectedClientId}
                        onChange={(e) => {
                            const opt = clientOptions.find((c) => c.id === e.target.value)
                            if (opt) setSelectedClient(opt.id, opt.name)
                        }}
                        style={{
                            background: '#4A4846',
                            color: '#F7F6F4',
                            border: '1px solid #5A5856',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontFamily: "'DM Sans', sans-serif",
                            cursor: 'pointer',
                            outline: 'none',
                            maxWidth: 160,
                        }}
                    >
                        {clientOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    )
}
