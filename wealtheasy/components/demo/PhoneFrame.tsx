'use client'
import { ReactNode } from 'react'
import { useDemoMode } from '@/lib/demo-mode-context'

export default function PhoneFrame({ children }: { children: ReactNode }) {
    const { demoMode, selectedClientId, selectedClientName, setSelectedClient, clientOptions } = useDemoMode()

    if (!demoMode) {
        return <>{children}</>
    }

    return (
        <div
            style={{
                width: 390,
                minHeight: 844,
                background: '#1A1A1A',
                borderRadius: 44,
                padding: 12,
                boxShadow:
                    '0 24px 80px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)',
                position: 'relative',
            }}
        >
            {/* Inner screen area */}
            <div
                style={{
                    borderRadius: 36,
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    minHeight: 820,
                    position: 'relative',
                }}
            >
                {/* Notch */}
                <div
                    style={{
                        width: 120,
                        height: 34,
                        background: '#1A1A1A',
                        borderRadius: '0 0 20px 20px',
                        margin: '0 auto',
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                    }}
                />

                {/* Content area — below the notch */}
                <div style={{ paddingTop: 44 }}>
                    {/* Client switcher bar */}
                    {demoMode && clientOptions.length > 0 && (
                        <div
                            style={{
                                background: '#F7F6F4',
                                padding: '6px 16px',
                                borderBottom: '1px solid #EBEBEB',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <span
                                style={{
                                    color: '#6B6867',
                                    fontSize: 11,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Viewing as
                            </span>
                            <select
                                value={selectedClientId}
                                onChange={(e) => {
                                    const option = clientOptions.find(c => c.id === e.target.value)
                                    if (option) {
                                        setSelectedClient(option.id, option.name)
                                    }
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: 11,
                                    color: '#00C07B',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    outline: 'none',
                                    fontFamily: "'DM Sans', sans-serif",
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
                    {children}
                </div>
            </div>
        </div>
    )
}
