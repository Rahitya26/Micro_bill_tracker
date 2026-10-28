import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Lock, Delete, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function PinLockModal({ isOpen, onUnlock, showToast }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = useCallback((digit) => {
    setError('');
    setPin(prev => (prev.length < 6 ? prev + digit : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setError('');
    setPin(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setError('');
    setPin('');
  }, []);

  const handleSubmit = useCallback(async (pinToSubmit) => {
    const code = pinToSubmit || pin;
    if (!code || code.length < 4) {
      setError('Please enter at least a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.verifyPin(code);
      if (res.success) {
        setPin('');
        if (showToast) showToast('Dashboard unlocked successfully', 'success');
        onUnlock();
      } else {
        setError(res.error || 'Incorrect PIN. Try again.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }, [pin, onUnlock, showToast]);

  // Physical keyboard listener (0-9, Backspace, Enter, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (loading) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPin(prev => {
          if (prev.length < 6) {
            const next = prev + e.key;
            if (next.length === 4) {
              // Auto-submit on 4th digit
              setTimeout(() => handleSubmit(next), 100);
            }
            return next;
          }
          return prev;
        });
        setError('');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, handleSubmit, handleBackspace, handleClear]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(16, 24, 40, 0.94) 0%, rgba(9, 13, 22, 0.98) 100%)',
      backdropFilter: 'blur(16px)',
      padding: '1.25rem'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(23, 32, 54, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '380px',
        padding: '2rem 1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transform: shake ? 'translateX(0)' : 'none',
        animation: shake ? 'shake 0.4s ease-in-out' : 'none'
      }}>
        {/* Lock Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)'
        }}>
          <Lock size={30} style={{ color: '#10b981' }} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.35rem 0' }}>
          UPI Flow Protected
        </h2>
        <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: '0 0 1.5rem 0', lineHeight: 1.4 }}>
          Enter Master Passcode to unlock your personal ledger & habit insights
        </p>

        {/* PIN Indicators (4-6 dots) */}
        <div style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: error ? '0.75rem' : '1.75rem',
          height: '24px'
        }}>
          {[0, 1, 2, 3].map(idx => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                style={{
                  width: isFilled ? '18px' : '14px',
                  height: isFilled ? '18px' : '14px',
                  borderRadius: '50%',
                  background: isFilled
                    ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                    : 'transparent',
                  border: isFilled
                    ? 'none'
                    : '2px solid rgba(148, 163, 184, 0.3)',
                  boxShadow: isFilled ? '0 0 12px rgba(16, 185, 129, 0.6)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fb7185',
            fontSize: '0.8rem',
            marginBottom: '1.25rem',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(251, 113, 133, 0.1)',
            border: '1px solid rgba(251, 113, 133, 0.25)'
          }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          width: '100%',
          maxWidth: '280px',
          marginBottom: '1.25rem'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => {
                handleDigit(String(num));
                if (pin.length === 3) {
                  setTimeout(() => handleSubmit(pin + num), 100);
                }
              }}
              disabled={loading}
              style={{
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#f8fafc',
                fontSize: '1.35rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {num}
            </button>
          ))}

          {/* Clear button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            style={{
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
          >
            Clear
          </button>

          {/* 0 digit */}
          <button
            type="button"
            onClick={() => {
              handleDigit('0');
              if (pin.length === 3) {
                setTimeout(() => handleSubmit(pin + '0'), 100);
              }
            }}
            disabled={loading}
            style={{
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              fontSize: '1.35rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            0
          </button>

          {/* Backspace button */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={loading}
            style={{
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: '#94a3b8',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Unlock Button */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={loading || pin.length < 4}
          style={{
            width: '100%',
            maxWidth: '280px',
            padding: '12px 16px',
            borderRadius: '14px',
            border: 'none',
            background: pin.length >= 4 && !loading
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'rgba(51, 65, 85, 0.5)',
            color: pin.length >= 4 && !loading ? '#ffffff' : '#64748b',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: pin.length >= 4 && !loading ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: pin.length >= 4 && !loading ? '0 10px 20px -5px rgba(16, 185, 129, 0.4)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              <span>Unlock Dashboard</span>
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

