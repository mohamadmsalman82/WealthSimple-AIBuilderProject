'use client'
import { useDemoMode } from '@/lib/demo-mode-context'

export default function DisclaimerBanner() {
    const { demoMode } = useDemoMode()

    if (!demoMode) return null

    return (
        <div
            style={{
                width: '100%',
                height: 36,
                background: '#32302F',
                color: '#F7F6F4',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            WealthEasy is a fictional platform built to demonstrate the AI Builder
            system. Not affiliated with Wealthsimple.
        </div>
    )
}
