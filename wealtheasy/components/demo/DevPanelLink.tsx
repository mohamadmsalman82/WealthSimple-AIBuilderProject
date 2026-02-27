'use client'
import Link from 'next/link'
import { useDemoMode } from '@/lib/demo-mode-context'

export default function DevPanelLink() {
    const { demoMode } = useDemoMode()

    if (!demoMode) return null

    return (
        <div
            style={{
                textAlign: 'center',
                padding: '12px 0',
            }}
        >
            <Link
                href="/dev"
                style={{
                    fontSize: 11,
                    color: '#6B6867',
                    textDecoration: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                }}
            >
                → Dev Panel
            </Link>
        </div>
    )
}
