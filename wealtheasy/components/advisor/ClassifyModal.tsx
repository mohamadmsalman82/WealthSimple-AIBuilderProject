'use client'

interface ClassifyModalProps {
    eventId: string
    clientName: string
    eventType: string
    decision: 'generate' | 'dismiss' | 'escalate'
    onClose: () => void
    onConfirm: () => void
    isLoading: boolean
}

const DECISION_CONFIG = {
    generate: {
        title: 'Generate Brief',
        bodyFn: (name: string, event: string) =>
            `This will send ${name}'s ${event} event to the AI pipeline. A brief will appear in the review queue within a few seconds.`,
        confirmLabel: 'Generate Brief',
        confirmBg: '#00C07B',
    },
    dismiss: {
        title: 'Dismiss Event',
        bodyFn: (name: string, _event: string) =>
            `This signal will be marked as dismissed. No brief will be generated and no action will be taken for ${name}.`,
        confirmLabel: 'Dismiss',
        confirmBg: '#32302F',
    },
    escalate: {
        title: 'Escalate to Compliance',
        bodyFn: (_name: string, _event: string) =>
            `This event will be escalated to the compliance team for manual review. No AI processing will begin until compliance clears it.`,
        confirmLabel: 'Escalate',
        confirmBg: '#F5A623',
    },
}

export default function ClassifyModal({
    eventId,
    clientName,
    eventType,
    decision,
    onClose,
    onConfirm,
    isLoading,
}: ClassifyModalProps) {
    const config = DECISION_CONFIG[decision]

    return (
        <div
            className="fade-in"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    padding: 28,
                    width: 440,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'none',
                        border: 'none',
                        color: '#6B6867',
                        fontSize: 20,
                        cursor: 'pointer',
                        lineHeight: 1,
                    }}
                >
                    ×
                </button>

                <h2
                    style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: 20,
                        color: '#32302F',
                        margin: '0 0 12px',
                        fontWeight: 400,
                    }}
                >
                    {config.title}
                </h2>

                <p style={{ color: '#6B6867', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
                    {config.bodyFn(clientName, eventType)}
                </p>

                {/* Confirm button */}
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 100,
                        border: 'none',
                        background: config.confirmBg,
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: 'all 150ms ease',
                        opacity: isLoading ? 0.7 : 1,
                    }}
                >
                    {isLoading ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span className="spin">⟳</span> Processing…
                        </span>
                    ) : (
                        config.confirmLabel
                    )}
                </button>

                {/* Cancel button */}
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 100,
                        border: '1px solid #EBEBEB',
                        background: '#FFFFFF',
                        color: '#6B6867',
                        fontSize: 14,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        marginTop: 8,
                        transition: 'all 150ms ease',
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}
