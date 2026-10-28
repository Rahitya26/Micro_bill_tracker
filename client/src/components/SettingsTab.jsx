import React, { useState, useEffect } from 'react';
import { Save, AlertOctagon, Smartphone, Target, ShieldCheck, KeyRound } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsTab({ showToast, onSettingsChanged }) {
  const [budget, setBudget] = useState(25000);
  const [salaryDate, setSalaryDate] = useState(1);
  const [wishlistName, setWishlistName] = useState('Goa Flight / Weekend Trip');
  const [wishlistTarget, setWishlistTarget] = useState(6000);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [settingsRes, authRes] = await Promise.all([
          api.getSettings(),
          api.getAuthStatus()
        ]);
        if (settingsRes.success && settingsRes.settings) {
          setBudget(settingsRes.settings.monthly_budget || 25000);
          setSalaryDate(settingsRes.settings.salary_date || 1);
          setWishlistName(settingsRes.settings.wishlist_name || 'Goa Flight / Weekend Trip');
          setWishlistTarget(settingsRes.settings.wishlist_target || 6000);
        }
        if (authRes) {
          setAuthStatus(authRes);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.saveSettings({
        monthlyBudget: parseFloat(budget),
        salaryDate: parseInt(salaryDate, 10),
        wishlistName: wishlistName.trim(),
        wishlistTarget: parseFloat(wishlistTarget)
      });
      if (res.success) {
        showToast('Settings saved successfully', 'success');
        if (onSettingsChanged) onSettingsChanged();
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch (_) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      'WARNING: This will permanently delete ALL recorded transactions and sync logs from your database. Are you sure?'
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const res = await api.clearData();
      if (res.success) {
        showToast('All transaction data cleared successfully', 'success');
        if (onSettingsChanged) onSettingsChanged();
      } else {
        showToast('Failed to clear data', 'error');
      }
    } catch (_) {
      showToast('Failed to clear data', 'error');
    } finally {
      setClearing(false);
    }
  };

  const isVercel = window.location.hostname.includes('vercel.app');
  const currentOrigin = window.location.origin;

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Monthly Budget Form */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>Monthly Budget & Salary Cycle</h3>
        
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Monthly Budget Target (₹)</label>
            <input
              type="number"
              className="form-input"
              value={budget}
              min="1000"
              step="500"
              onChange={(e) => setBudget(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Used to calculate daily burn rate, remaining budget, and pace projections.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Salary / Cycle Reset Day (1 - 31)</label>
            <input
              type="number"
              className="form-input"
              value={salaryDate}
              min="1"
              max="31"
              onChange={(e) => setSalaryDate(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Day of month when your income arrives and budget resets.
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '1.25rem 0 1rem 0', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Target size={16} /> Wishlist Reality Check Goal
            </h4>

            <div className="form-group">
              <label className="form-label">Wishlist Goal / Item Name</label>
              <input
                type="text"
                className="form-input"
                value={wishlistName}
                onChange={(e) => setWishlistName(e.target.value)}
                placeholder="e.g. Goa Flight, PlayStation 5, AirPods Pro"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Price (₹)</label>
              <input
                type="number"
                className="form-input"
                value={wishlistTarget}
                min="500"
                step="100"
                onChange={(e) => setWishlistTarget(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Your non-commute impulse snack spends are compared against this goal in your Smart Micro-Spend Hub.
              </span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </form>
      </div>

      {/* Security & Access Protection Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontWeight: 700 }}>
          <ShieldCheck size={18} /> Public Security & App Lock
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: authStatus?.pinRequired ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
            border: `1px solid ${authStatus?.pinRequired ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
            color: authStatus?.pinRequired ? '#34d399' : '#facc15',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <KeyRound size={14} />
            <span>{authStatus?.pinRequired ? 'Master PIN Gate: ACTIVE' : 'Master PIN Gate: NOT CONFIGURED'}</span>
          </div>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          When hosted on Vercel, the dashboard is protected by your Master PIN (set via <code>APP_PIN</code> in Vercel Environment Variables). Visitors cannot view transactions or analytics without entering your PIN.
        </p>
      </div>

      {/* Webhook Info for MacroDroid */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#06b6d4', fontWeight: 700 }}>
          <Smartphone size={18} /> Mobile Automation & Webhook Info
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
          In MacroDroid HTTP Request action, forward incoming bank SMS messages to this protected endpoint:
        </p>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#38bdf8', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
          POST {currentOrigin}/api/webhook/sms?secret=upi_tracker_secret_token_123
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Method: <strong>POST</strong> | Content Type: <code>application/json</code><br/>
          Payload: <code>{`{"message": "{sms_message}", "sender": "{sms_number}"}`}</code>
        </div>
      </div>

      {/* Reset Data Danger Zone */}
      <div className="glass-card" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#fb7185', fontWeight: 700 }}>
          <AlertOctagon size={18} /> Danger Zone: Reset Database
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Wipe all transactions and sync logs to start fresh with a clean slate whenever testing is complete.
        </p>
        <button className="btn btn-danger" onClick={handleClearData} disabled={clearing}>
          <AlertOctagon size={16} />
          <span>{clearing ? 'Clearing Data...' : 'Reset & Clear All Transactions'}</span>
        </button>
      </div>
    </div>
  );
}
