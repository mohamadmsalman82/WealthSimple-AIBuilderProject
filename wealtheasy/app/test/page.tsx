import { createClient } from '@/lib/supabase/server'

export default async function TestPage() {
    const supabase = await createClient()

    const { count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

    return (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 500, marginBottom: '1rem' }}>
                {error ? '❌ Error' : `✅ Client count: ${count}`}
            </h1>
            {error && (
                <pre style={{ color: '#E8443A', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(error, null, 2)}
                </pre>
            )}
            <p style={{ marginTop: '2rem', color: '#6B6867' }}>
                Delete this page before demo
            </p>
        </div>
    )
}
