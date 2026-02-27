import ProductPageLayout from '@/components/client/ProductPageLayout'

export default function RRSPPage() {
    return (
        <ProductPageLayout
            title="RRSP"
            description="Your Registered Retirement Savings Plan reduces your taxable income today and grows tax-deferred until withdrawal. Best used when you expect to be in a lower tax bracket in retirement."
            accentColor="#32302F"
            backHref="/client/accounts"
            stats={[
                { label: 'Your room', value: '$22,400' },
                { label: 'Deadline', value: 'Mar 3, 2025' },
                { label: 'Balance', value: '$18,340' },
            ]}
            rules={[
                { label: 'Contribution limit', detail: '18% of prior year earned income up to $31,560 for 2024. Check your NOA or CRA My Account for your exact room.' },
                { label: 'Tax deduction', detail: 'Contributions reduce your taxable income dollar for dollar in the year you claim them.' },
                { label: 'Withdrawal tax', detail: 'Withdrawals are added to your income and taxed at your marginal rate. Withholding tax applies at source.' },
                { label: 'RRSP deadline', detail: 'March 3, 2025 for contributions to count against 2024 income. Contributions after this date apply to 2025.' },
                { label: 'RRIF conversion', detail: 'Must be converted to a RRIF or annuity by December 31 of the year you turn 71.' },
            ]}
            ctaLabel="Contribute to RRSP"
        />
    )
}
