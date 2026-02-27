'use client'
import { useState } from 'react'

interface FlagModalProps {
    briefId: string
    onClose: () => void
    onConfirm: (reason: string) => void
}

export default function FlagModal({ briefId, onClose, onConfirm }: FlagModalProps) {
    const [text, setText] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleConfirm = async () => {
        if (!text.trim()) return
        setSubmitting(true)
        onConfirm(text.trim())
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
                    Flag for Compliance
                </h2>
                <p style={{ color: '#6B6867', fontSize: 14, margin: '0 0 20px' }}>
                    Describe the compliance concern. This will be reviewed by the compliance team.
                </p>

                {/* Textarea */}
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Describe the compliance concern…"
                    style={{
                        width: '100%',
                        border: '1px solid #EBEBEB',
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 14,
                        color: '#32302F',
                        fontFamily: "'DM Sans', sans-serif",
                        lineHeight: 1.6,
                        resize: 'vertical',
                        minHeight: 100,
                        outline: 'none',
                        marginBottom: 20,
                        boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#00C07B'
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,192,123,0.12)'
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#EBEBEB'
                        e.currentTarget.style.boxShadow = 'none'
                    }}
                />

                {/* Confirm button */}
                <button
                    onClick={handleConfirm}
                    disabled={!text.trim() || submitting}
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 100,
                        border: 'none',
                        background: !text.trim() ? '#EBEBEB' : '#F5A623',
                        color: !text.trim() ? '#6B6867' : '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: !text.trim() ? 'not-allowed' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: 'all 150ms ease',
                    }}
                >
                    {submitting ? 'Flagging…' : 'Submit Flag'}
                </button>
            </div>
        </div>
    )
}
