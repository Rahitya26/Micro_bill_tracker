import React, { useState } from 'react';
import { X, Sparkles, Send } from 'lucide-react';
import { api } from '../services/api';

export default function SimulatorModal({ isOpen, onClose, onSuccess, showToast }) {
  const [bankType, setBankType] = useState('bob');
  const [amount, setAmount] = useState('45.00');
  const [merchant, setMerchant] = useState('Chai Point');
  const [vpa, setVpa] = useState('q291013923@ybl');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.simulateSms({
        bankType,
        amount: parseFloat(amount) || 50,
        merchant,
        vpa
      });

      if (res.success) {
        showToast(`Simulated: ₹${amount} via ${bankType.toUpperCase()}`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast('Simulation failed', 'error');
      }
    } catch (err) {
      showToast('Error during simulation', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
            <Sparkles size={20} />
            <h3 className="modal-title">Bank SMS Simulator</h3>
          </div>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Test the webhook parser with authentic Indian bank SMS templates without needing your phone.
        </p>

        <form onSubmit={handleSimulate}>
          <div className="form-group">
            <label className="form-label">Select Bank SMS Template</label>
            <select
              className="form-input"
              value={bankType}
              onChange={(e) => setBankType(e.target.value)}
            >
              <option value="bob">Bank of Baroda (BOB) - Debit Template</option>
              <option value="gpay">Google Pay UPI Notification</option>
              <option value="phonepe">PhonePe UPI Notification</option>
              <option value="sbi">State Bank of India (SBI)</option>
              <option value="hdfc">HDFC Bank</option>
              <option value="icici">ICICI Bank</option>
              <option value="axis">Axis Bank</option>
              <option value="kotak">Kotak Mahindra Bank</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Merchant Name</label>
            <input
              type="text"
              className="form-input"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Recipient VPA / UPI ID</label>
            <input
              type="text"
              className="form-input"
              value={vpa}
              onChange={(e) => setVpa(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <Send size={16} />
              <span>{loading ? 'Simulating...' : 'Send Simulation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
