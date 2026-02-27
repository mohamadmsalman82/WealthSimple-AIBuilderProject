import ProductPageLayout from '@/components/client/ProductPageLayout'

export default function FHSAPage() {
    return (
        <ProductPageLayout
            title="FHSA"
            description="The First Home Savings Account combines the best of the TFSA and RRSP. Contributions are tax-deductible and qualifying withdrawals for a first home purchase are completely tax-free."
            accentColor="#00C07B"
            backHref="/client/accounts"
            stats={[
                { label: 'Annual limit', value: '$8,000' },
                { label: 'Lifetime limit', value: '$40,000' },
                { label: 'Max years', value: '15 years' },
            ]}
            rules={[
                { label: 'Annual contribution limit', detail: '$8,000 per year. Unused room carries forward by one year only — maximum $16,000 in a single year.' },
                { label: 'Lifetime limit', detail: '$40,000 total across all FHSAs you hold.' },
                { label: 'Eligibility', detail: 'Must be a Canadian resident, at least 18, and a first-time home buyer (no owned home in the current year or prior 4 calendar years).' },
                { label: 'Qualifying withdrawal', detail: 'Must have a written agreement to buy or build a qualifying home before October 1 of the year after withdrawal.' },
                { label: 'Account lifespan', detail: 'Must be closed by December 31 of the 15th year after opening, or the year you turn 71, whichever comes first.' },
            ]}
            ctaLabel="Open FHSA"
        />
    )
}
