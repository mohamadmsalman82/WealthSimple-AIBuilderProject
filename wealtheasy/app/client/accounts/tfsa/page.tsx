import ProductPageLayout from '@/components/client/ProductPageLayout'

export default function TFSAPage() {
    return (
        <ProductPageLayout
            title="TFSA"
            description="Your Tax-Free Savings Account lets your money grow completely tax-free. Withdrawals are tax-free too — and they restore your contribution room the following calendar year."
            accentColor="#00C07B"
            backHref="/client/accounts"
            stats={[
                { label: '2025 limit', value: '$7,000' },
                { label: 'Your room', value: '$18,500' },
                { label: 'Balance', value: '$24,150' },
            ]}
            rules={[
                { label: 'Annual contribution limit', detail: '$7,000 for 2025. Unused room carries forward indefinitely.' },
                { label: 'Tax on growth', detail: 'None. Interest, dividends, and capital gains inside a TFSA are completely tax-free.' },
                { label: 'Withdrawals', detail: 'Withdraw anytime for any reason. The amount withdrawn is added back to your room on January 1 of the following year.' },
                { label: 'Overcontribution penalty', detail: '1% per month on the excess amount. CRA tracks this automatically.' },
            ]}
            ctaLabel="Contribute to TFSA"
        />
    )
}
