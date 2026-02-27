import DevNav from '@/components/dev/DevNav'

export default function DevLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ background: '#0F0F0F', minHeight: '100vh', color: '#E0E0E0' }}>
            {/* ---- Top bar ---- */}
            <div
                style={{
                    background: '#1A1A1A',
                    borderBottom: '1px solid #2A2A2A',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                {/* Left: wordmark */}
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 14, color: '#00C07B' }}>
                    WealthEasy Dev
                </span>

                {/* Center: nav */}
                <DevNav />

                {/* Right: badge */}
                <span
                    style={{
                        color: '#F5A623',
                        background: 'rgba(245,166,35,0.1)',
                        borderRadius: 4,
                        padding: '3px 10px',
                        fontSize: 11,
                        fontFamily: 'monospace',
                    }}
                >
                    DEMO MODE
                </span>
            </div>

            {/* ---- Content ---- */}
            <div style={{ padding: '32px 24px' }}>{children}</div>
        </div>
    )
}
