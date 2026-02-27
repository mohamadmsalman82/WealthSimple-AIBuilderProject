import ProductPageLayout from '@/components/client/ProductPageLayout'

export default function CashPage() {
    return (
        <ProductPageLayout
            title="Cash"
            description="Wealthsimple Cash is your everyday spending and saving account. No monthly fees, no minimum balance, and a competitive interest rate on every dollar."
            accentColor="#6B6867"
            backHref="/client/accounts"
            stats={[
                { label: 'Balance', value: '$5,342.54' },
                { label: 'Interest', value: '4.0% APY' },
                { label: 'Fees', value: 'None' },
            ]}
            rules={[
                { label: 'No fees', detail: 'No monthly fees, no minimum balance, no transfer fees.' },
                { label: 'Interest', detail: 'Earn interest on every dollar. Rate is variable and may change.' },
                { label: 'CDIC insured', detail: 'Eligible deposits are protected up to $100,000 through CDIC member institutions.' },
                { label: 'Instant transfers', detail: 'Move money between your Wealthsimple accounts instantly at any time.' },
            ]}
            ctaLabel="Add funds"
        />
    )
}
