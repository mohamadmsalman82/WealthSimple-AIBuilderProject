'use client'
import { ReactNode } from 'react'
import { useDemoMode } from '@/lib/demo-mode-context'

export default function PhoneFrame({ children }: { children: ReactNode }) {
    const { demoMode } = useDemoMode()

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
                <div style={{ paddingTop: 44 }}>{children}</div>
            </div>
        </div>
    )
}
