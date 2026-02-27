'use client'
import { ReactNode } from 'react'
import { DemoModeProvider } from '@/lib/demo-mode-context'
import DisclaimerBanner from '@/components/demo/DisclaimerBanner'
import DemoToggle from '@/components/demo/DemoToggle'
import PhoneFrame from '@/components/demo/PhoneFrame'
import DevPanelLink from '@/components/demo/DevPanelLink'

export default function ClientLayout({ children }: { children: ReactNode }) {
    return (
        <DemoModeProvider>
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingTop: 24,
                    background: '#F7F6F4',
                }}
            >
                <DisclaimerBanner />
                <DemoToggle />
                <PhoneFrame>
                    {children}
                    <DevPanelLink />
                </PhoneFrame>
            </div>
        </DemoModeProvider>
    )
}
