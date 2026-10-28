import React from 'react';
import { Lightbulb, AlertTriangle, CheckCircle, Info, ArrowRight } from 'lucide-react';

export default function SmartTipsTab({ tips = [] }) {
  const getTipIcon = (type) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle size={20} style={{ color: '#f43f5e' }} />;
      case 'warning':
        return <AlertTriangle size={20} style={{ color: '#f59e0b' }} />;
      case 'success':
        return <CheckCircle size={20} style={{ color: '#10b981' }} />;
      default:
        return <Info size={20} style={{ color: '#06b6d4' }} />;
    }
  };

  const getTipBorderColor = (type) => {
    switch (type) {
      case 'danger':
        return '#f43f5e';
      case 'warning':
        return '#f59e0b';
      case 'success':
        return '#10b981';
      default:
        return '#06b6d4';
    }
  };

  if (tips.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 1rem auto' }} />
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Active Spend Warnings</h3>
        <p style={{ fontSize: '0.88rem' }}>You are maintaining a healthy spending pace! As more UPI transactions occur, personalized recommendations will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>AI Financial Advice & Algorithmic Tips</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Actionable habit optimization derived from your real-time bank ledger.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {tips.map((tip, idx) => (
          <div 
            key={idx} 
            className="glass-card"
            style={{ 
              borderLeft: `4px solid ${getTipBorderColor(tip.type)}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
                {getTipIcon(tip.type)}
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{tip.title}</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                {tip.message}
              </p>
            </div>

            {tip.action && (
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: '#e2e8f0',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <ArrowRight size={14} style={{ color: '#06b6d4', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#06b6d4' }}>Action: </strong>
                  {tip.action}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
