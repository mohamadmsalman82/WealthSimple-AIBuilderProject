'use client'
import { useDemoMode } from '@/lib/demo-mode-context'

export default function DemoToggle() {
    const { demoMode, toggleDemoMode } = useDemoMode()

    return (
        <button
            onClick={toggleDemoMode}
            className="fade-in"
            style={{
                position: 'fixed',
                top: 16,
                right: 16,
                zIndex: 50,
                fontSize: 12,
                borderRadius: 100,
                padding: '6px 14px',
                cursor: 'pointer',
                border: demoMode ? 'none' : '1px solid #EBEBEB',
                background: demoMode ? '#00C07B' : '#FFFFFF',
                color: demoMode ? '#FFFFFF' : '#6B6867',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                transition: 'all 200ms ease',
            }}
        >
            {demoMode ? 'Demo ON' : 'Demo OFF'}
        </button>
    )
}
