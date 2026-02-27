'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
    { label: 'Signals', href: '/dev' },
    { label: 'Clients', href: '/dev/clients' },
    { label: 'Transactions', href: '/dev/transactions' },
]

export default function DevNav() {
    const pathname = usePathname()

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {NAV_ITEMS.map((item) => {
                const isActive =
                    item.href === '/dev' ? pathname === '/dev' : pathname.startsWith(item.href)
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            fontSize: 13,
                            fontFamily: 'monospace',
                            color: isActive ? '#00C07B' : '#6B6867',
                            textDecoration: 'none',
                            transition: 'color 150ms ease',
                        }}
                    >
                        {item.label}
                    </Link>
                )
            })}
        </div>
    )
}
