import ProductPageLayout from '@/components/client/ProductPageLayout'

export default function TaxPage() {
    return (
        <ProductPageLayout
            title="Tax Filing"
            description="File your Canadian taxes directly through WealthEasy. Auto-fills from your investment accounts, handles TFSA and RRSP slips automatically, and finds deductions you might have missed."
            accentColor="#32302F"
            backHref="/client"
            stats={[
                { label: 'Filing deadline', value: 'Apr 30, 2025' },
                { label: 'Self-employed', value: 'Jun 15, 2025' },
                { label: 'Status', value: 'Not started' },
            ]}
            rules={[
                { label: 'T-slip auto-import', detail: 'TFSA, RRSP, and investment income slips are imported automatically from your Wealthsimple accounts.' },
                { label: 'RRSP deduction', detail: 'Contributions made in the first 60 days of 2025 can be claimed on your 2024 return.' },
                { label: 'Capital gains', detail: 'Realized gains and losses from your non-registered accounts are summarized automatically.' },
                { label: 'Filing deadline', detail: 'April 30, 2025 for most Canadians. June 15 if you or your spouse are self-employed — but any balance owing is still due April 30.' },
            ]}
            ctaLabel="Start filing"
        />
    )
}
