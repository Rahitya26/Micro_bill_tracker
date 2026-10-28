import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { api } from '../services/api';

export default function AddPaymentModal({ isOpen, onClose, onSuccess, showToast }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('DEBIT');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Others & General');
  const [vpa, setVpa] = useState('');
  const [bank, setBank] = useState('Bank of Baroda');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.addTransaction({
        amount: parseFloat(amount),
        type,
        merchantName: merchant.trim() || (type === 'DEBIT' ? 'UPI Merchant' : 'UPI Credit / Refund'),
        merchantVpa: vpa.trim(),
        category,
        bankName: bank,
        description: `${type === 'DEBIT' ? 'Paid to' : 'Received from'} ${merchant || 'UPI'} via Manual Entry`
      });

      if (res.success) {
        showToast(`Successfully added ₹${amount}`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast(res.error || 'Failed to add payment', 'error');
      }
    } catch (err) {
      showToast('Error creating transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Record Manual Payment</h3>
          <button className="btn-icon btn-secondary" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn ${type === 'DEBIT' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setType('DEBIT')}
              >
                Debit (Spent)
              </button>
              <button
                type="button"
                className={`btn ${type === 'CREDIT' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setType('CREDIT')}
              >
                Credit (Received)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              placeholder="e.g. 150.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Merchant / Payee Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Swiggy, Chai Point, Ramesh"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">UPI ID / VPA (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. swiggy@icici or 9102405864@ybl"
              value={vpa}
              onChange={(e) => setVpa(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Food & Dining">Food & Dining</option>
              <option value="Groceries & Essentials">Groceries & Essentials</option>
              <option value="Shopping & E-Commerce">Shopping & E-Commerce</option>
              <option value="Bills & Utilities">Bills & Utilities</option>
              <option value="Travel & Commute">Travel & Commute</option>
              <option value="Entertainment & Subs">Entertainment & Subs</option>
              <option value="Health & Wellness">Health & Wellness</option>
              <option value="Transfers & Rent">Transfers & Rent</option>
              <option value="Others & General">Others & General</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Bank Name</label>
            <input
              type="text"
              className="form-input"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              <Plus size={16} />
              <span>{loading ? 'Saving...' : 'Add Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
