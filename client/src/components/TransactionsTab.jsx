import React, { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Download, Trash2, ArrowRight, Smartphone, Mail, FileText, Sparkles, Filter, Edit2, Receipt } from 'lucide-react';
import { api } from '../services/api';
import MerchantCombobox from './MerchantCombobox';

export default function TransactionsTab({ onTransactionChange, showToast }) {
  // Format today's date in local YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format first day of current month in local YYYY-MM-01
  const getMonthStartStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  };

  const todayStr = getTodayStr();
  const monthStartStr = getMonthStartStr();

  // State: Defaulted to THIS MONTH
  const [startDate, setStartDate] = useState(monthStartStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activePreset, setActivePreset] = useState('month');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [type, setType] = useState('ALL');

  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Combobox editing state
  const [editingMerchantId, setEditingMerchantId] = useState(null);

  // Presets + all existing merchants for the searchable combobox dropdown
  const POPULAR_PRESETS = [
    'Swiggy', 'Zomato', 'Uber', 'Ola Cabs', 'Rapido',
    'Hyderabad Metro Rail', 'Blinkit', 'Zepto', 'Swiggy Instamart',
    'BigBasket', 'Amazon Pay', 'Flipkart', 'IRCTC', 'Chai Point',
    'DMart', 'Apollo Pharmacy', 'Starbucks', 'Airtel', 'Jio'
  ];

  const knownMerchants = useMemo(() => {
    const fromTransactions = transactions
      .map(t => t.merchant_name)
      .filter(Boolean);
    const combined = Array.from(new Set([...fromTransactions, ...POPULAR_PRESETS]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Save edited or new merchant name via Combobox
  const handleSaveMerchantName = async (txId, newName) => {
    if (!newName || !newName.trim()) {
      setEditingMerchantId(null);
      return;
    }
    const cleanName = newName.trim();
    // Optimistic UI update
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, merchant_name: cleanName } : t));
    setEditingMerchantId(null);

    try {
      const res = await api.updateTransaction(txId, { merchant_name: cleanName });
      if (res.success) {
        showToast(`Merchant updated to "${cleanName}"`, 'success');
        if (onTransactionChange) onTransactionChange();
      } else {
        showToast('Failed to update merchant name', 'error');
        loadTransactions();
      }
    } catch (err) {
      showToast('Error updating merchant name', 'error');
      loadTransactions();
    }
  };

  // Fetch transactions based on active filters
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions({
        search,
        category,
        type,
        startDate,
        endDate,
        limit: 100
      });

      if (res.success) {
        setTransactions(res.transactions || []);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      showToast('Error loading transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [startDate, endDate, category, type, search]);

  // Handle Start Date change with strict validation
  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    setActivePreset('custom');

    // Strict rule: End Date cannot be before Start Date
    if (endDate && newEndIsBeforeStart(newStart, endDate)) {
      setEndDate(newStart);
    }
  };

  // Handle End Date change with strict validation
  const handleEndDateChange = (e) => {
    const newEnd = e.target.value;
    // Prevent selecting a date before Start Date
    if (startDate && newEndIsBeforeStart(startDate, newEnd)) {
      setEndDate(startDate);
    } else {
      setEndDate(newEnd);
    }
    setActivePreset('custom');
  };

  const newEndIsBeforeStart = (start, end) => {
    if (!start || !end) return false;
    return new Date(end) < new Date(start);
  };

  // Preset Handlers
  const setPresetToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
    setActivePreset('today');
  };

  const setPresetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setStartDate(yStr);
    setEndDate(yStr);
    setActivePreset('yesterday');
  };

  const setPresetThisMonth = () => {
    const d = new Date();
    const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    setStartDate(firstDay);
    setEndDate(todayStr);
    setActivePreset('month');
  };

  const setPresetAllTime = () => {
    setStartDate('');
    setEndDate('');
    setActivePreset('all');
  };

  const CATEGORIES = [
    'Food & Dining',
    'Groceries & Essentials',
    'Shopping & E-Commerce',
    'Bills & Utilities',
    'Travel & Commute',
    'Entertainment & Subs',
    'Health & Wellness',
    'Transfers & Rent',
    'Others & General'
  ];

  // Explicit Category Selection by User
  const handleCategoryChange = async (txId, newCategory) => {
    // Optimistic UI update
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, category: newCategory } : t));
    try {
      const res = await api.updateTransaction(txId, { category: newCategory });
      if (res.success) {
        showToast(`Category updated to "${newCategory}"`, 'success');
        if (onTransactionChange) onTransactionChange();
      } else {
        showToast('Failed to update category', 'error');
        loadTransactions();
      }
    } catch (err) {
      showToast('Error updating category', 'error');
      loadTransactions();
    }
  };

  // Delete transaction
  const handleDelete = async (id, merchant, amount) => {
    if (!window.confirm(`Delete payment of ₹${amount} to ${merchant}?`)) return;
    try {
      const res = await api.deleteTransaction(id);
      if (res.success) {
        showToast(`Transaction deleted successfully`, 'success');
        loadTransactions();
        if (onTransactionChange) onTransactionChange();
      }
    } catch (err) {
      showToast('Failed to delete transaction', 'error');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }
    const headers = ['ID', 'Date', 'Type', 'Amount', 'Merchant', 'VPA', 'Category', 'Bank', 'Account Last 4', 'UPI Ref', 'Source'];
    const rows = transactions.map(t => [
      t.id,
      new Date(t.transaction_time).toISOString(),
      t.type,
      t.amount,
      `"${(t.merchant_name || '').replace(/"/g, '""')}"`,
      t.merchant_vpa || '',
      t.category || '',
      t.bank_name || '',
      t.account_last4 || '',
      t.upi_ref || '',
      t.source || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `upi_transactions_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV successfully', 'success');
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'SMS_WEBHOOK':
        return <Smartphone size={12} />;
      case 'EMAIL_SYNC':
        return <Mail size={12} />;
      case 'STATEMENT_IMPORT':
        return <FileText size={12} />;
      default:
        return <Sparkles size={12} />;
    }
  };

  return (
    <div>
      {/* Filter & Date Range Toolbar */}
      <div className="filter-toolbar">
        {/* Search Input */}
        <div className="search-box">
          <Search size={16} className="search-icon-pos" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by merchant, UPI ref, VPA, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category & Type Filters */}
        <div className="select-filters-row">
          <select
            className="select-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
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

          <select
            className="select-filter"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="DEBIT">Debits Only</option>
            <option value="CREDIT">Credits / Refunds</option>
          </select>
        </div>

        {/* Strict Date Range Picker */}
        <div className="date-picker-wrap">
          <Calendar size={14} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <input
            type="date"
            className="date-input"
            value={startDate}
            title="Start Date"
            onChange={handleStartDateChange}
          />
          <span className="date-sep">to</span>
          <input
            type="date"
            className="date-input"
            value={endDate}
            min={startDate || undefined} // Strictly enforces End Date cannot be before Start Date
            title="End Date (Must be on or after Start Date)"
            onChange={handleEndDateChange}
          />
        </div>

        {/* Date Presets */}
        <div className="date-presets-group">
          <button
            type="button"
            className={`date-preset-btn ${activePreset === 'today' ? 'active' : ''}`}
            onClick={setPresetToday}
          >
            Today
          </button>
          <button
            type="button"
            className={`date-preset-btn ${activePreset === 'yesterday' ? 'active' : ''}`}
            onClick={setPresetYesterday}
          >
            Yesterday
          </button>
          <button
            type="button"
            className={`date-preset-btn ${activePreset === 'month' ? 'active' : ''}`}
            onClick={setPresetThisMonth}
          >
            This Month
          </button>
          <button
            type="button"
            className={`date-preset-btn ${activePreset === 'all' ? 'active' : ''}`}
            onClick={setPresetAllTime}
          >
            All Time
          </button>
        </div>

        {/* Export CSV */}
        <button className="btn btn-secondary btn-export" onClick={handleExportCsv} title="Download CSV">
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Date Status Sub-banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <div>
          Showing {transactions.length} of {totalCount} transactions
          {startDate && endDate && startDate === endDate && (
            <span style={{ marginLeft: '0.5rem', color: '#10b981', fontWeight: 600 }}>
              (Filtered to {startDate === todayStr ? "Today's transactions" : startDate})
            </span>
          )}
          {startDate && endDate && startDate !== endDate && (
            <span style={{ marginLeft: '0.5rem', color: '#38bdf8', fontWeight: 600 }}>
              ({startDate} to {endDate})
            </span>
          )}
          {!startDate && !endDate && (
            <span style={{ marginLeft: '0.5rem', color: '#a78bfa', fontWeight: 600 }}>
              (All Time History)
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.75rem' }}>
          Sorted: <strong>Newest First</strong>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-card table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
            <Receipt size={36} style={{ margin: '0 auto 1rem auto', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>No transactions found for this date range</p>
            <p style={{ fontSize: '0.85rem' }}>Try picking another date, clicking "All Time", or testing a payment via the UPI Simulator.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive tx-table-desktop">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Merchant & UPI Details</th>
                    <th>Category</th>
                    <th>Bank & Account</th>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const dateObj = new Date(t.transaction_time);
                    const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const isDebit = t.type === 'DEBIT';

                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dateStr}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{timeStr}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {editingMerchantId === t.id ? (
                              <MerchantCombobox
                                initialValue={t.merchant_name || ''}
                                knownMerchants={knownMerchants}
                                onSave={(newName) => handleSaveMerchantName(t.id, newName)}
                                onCancel={() => setEditingMerchantId(null)}
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.merchant_name || 'UPI Merchant'}</span>
                                <button
                                  type="button"
                                  className="btn-rename-icon"
                                  title="Rename or choose merchant"
                                  onClick={() => setEditingMerchantId(t.id)}
                                >
                                  <Edit2 size={13} />
                                </button>
                              </div>
                            )}
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {t.merchant_vpa || t.upi_ref || ''}
                            </span>
                          </div>
                        </td>
                        <td>
                          <select
                            className="tag-category-select"
                            value={t.category || 'Others & General'}
                            onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                            title="Click to change category"
                          >
                            {CATEGORIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t.bank_name || 'UPI'}</div>
                          {t.account_last4 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>A/C *{t.account_last4}</div>
                          )}
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                            {getSourceIcon(t.source)}
                            <span style={{ fontSize: '0.7rem' }}>{t.source}</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={isDebit ? 'tx-amount-debit' : 'tx-amount-credit'}>
                            {isDebit ? '-' : '+'}₹{parseFloat(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary btn-icon"
                            title="Delete Transaction"
                            onClick={() => handleDelete(t.id, t.merchant_name, t.amount)}
                            style={{ width: '30px', height: '30px' }}
                          >
                            <Trash2 size={14} style={{ color: '#fb7185' }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Optimized for Phones) */}
            <div className="tx-cards-mobile">
              {transactions.map(t => {
                const dateObj = new Date(t.transaction_time);
                const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                const isDebit = t.type === 'DEBIT';

                return (
                  <div key={t.id} className="mobile-tx-item">
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                      {editingMerchantId === t.id ? (
                        <div style={{ marginBottom: '0.45rem' }}>
                          <MerchantCombobox
                            initialValue={t.merchant_name || ''}
                            knownMerchants={knownMerchants}
                            onSave={(newName) => handleSaveMerchantName(t.id, newName)}
                            onCancel={() => setEditingMerchantId(null)}
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t.merchant_name || 'UPI Merchant'}</span>
                          <button
                            type="button"
                            className="btn-rename-icon"
                            title="Rename or choose merchant"
                            onClick={() => setEditingMerchantId(t.id)}
                          >
                            <Edit2 size={12} />
                          </button>
                          <select
                            className="tag-category-select"
                            style={{ fontSize: '0.68rem', padding: '0.15rem 1.4rem 0.15rem 0.5rem' }}
                            value={t.category || 'Others & General'}
                            onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                            title="Click to change category"
                          >
                            {CATEGORIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {dateStr} • {timeStr} • {t.bank_name || 'UPI'}
                      </div>
                      {t.upi_ref && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Ref: {t.upi_ref}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                      <span className={isDebit ? 'tx-amount-debit' : 'tx-amount-credit'} style={{ fontSize: '1.05rem' }}>
                        {isDebit ? '-' : '+'}₹{parseFloat(t.amount).toFixed(2)}
                      </span>
                      <button
                        className="btn btn-secondary btn-icon"
                        onClick={() => handleDelete(t.id, t.merchant_name, t.amount)}
                        style={{ width: '28px', height: '28px' }}
                      >
                        <Trash2 size={13} style={{ color: '#fb7185' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
