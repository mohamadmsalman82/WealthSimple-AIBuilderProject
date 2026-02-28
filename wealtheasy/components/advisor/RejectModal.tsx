'use client'
import { useState } from 'react'

interface RejectModalProps {
    briefId: string
    onClose: () => void
    onConfirm: (reason: string) => void
}

const REASONS = [
    { value: 'misclassified_event', label: 'Misclassified event' },
    { value: 'wrong_client_context', label: 'Wrong client context' },
    { value: 'outdated_rules', label: 'Outdated rules' },
    { value: 'tone_inappropriate', label: 'Tone inappropriate' },
    { value: 'other', label: 'Other' },
]

export default function RejectModal({ briefId, onClose, onConfirm }: RejectModalProps) {
    const [selected, setSelected] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const handleConfirm = async () => {
        if (!selected) return
        setSubmitting(true)
        onConfirm(selected)
    }

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
                        margin: '0 0 8px',
                        fontWeight: 400,
                    }}
                >
                    Reject Brief
                </h2>
                <p style={{ color: '#6B6867', fontSize: 14, margin: '0 0 20px' }}>
                    This brief will not be sent to the client. Select a reason.
                </p>

                {/* Reason pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {REASONS.map((reason) => {
                        const isSelected = selected === reason.value
                        return (
                            <button
                                key={reason.value}
                                onClick={() => setSelected(reason.value)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 100,
                                    fontSize: 13,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontWeight: 500,
                                    background: isSelected ? '#32302F' : '#F7F6F4',
                                    color: isSelected ? '#FFFFFF' : '#32302F',
                                    transition: 'all 150ms ease',
                                }}
                            >
                                {reason.label}
                            </button>
                        )
                    })}
                </div>

                {/* Confirm button */}
                <button
                    onClick={handleConfirm}
                    disabled={!selected || submitting}
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 100,
                        border: 'none',
                        background: !selected ? '#EBEBEB' : '#E8443A',
                        color: !selected ? '#6B6867' : '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: !selected ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: 'all 150ms ease',
                    }}
                >
                    {submitting ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
            </div>
        </div>
    )
}
