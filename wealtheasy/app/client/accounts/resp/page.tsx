import ProductPageLayout from '@/components/client/ProductPageLayout'

export default function RESPPage() {
    return (
        <ProductPageLayout
            title="RESP"
            description="The Registered Education Savings Plan helps you save for a child's post-secondary education. The government matches 20% of your contributions through the Canada Education Savings Grant."
            accentColor="#00C07B"
            backHref="/client/accounts"
            stats={[
                { label: 'CESG match', value: '20%' },
                { label: 'Max grant/year', value: '$500' },
                { label: 'Lifetime grant', value: '$7,200' },
            ]}
            rules={[
                { label: 'Canada Education Savings Grant', detail: 'Government matches 20% of contributions up to $2,500 per year, for a maximum annual grant of $500 per child.' },
                { label: 'Lifetime contribution limit', detail: '$50,000 per beneficiary. No annual limit — but CESG is only paid on the first $2,500 contributed per year.' },
                { label: 'Lifetime grant limit', detail: '$7,200 per beneficiary. Grant room accumulates from birth and can be carried forward.' },
                { label: 'Additional CESG', detail: 'Families with income below ~$111,733 may qualify for an additional 10–20% grant on the first $500 contributed per year.' },
                { label: 'Withdrawal rules', detail: 'Educational Assistance Payments are taxed in the hands of the student, who typically has little to no income.' },
            ]}
            ctaLabel="Open RESP"
        />
    )
}
