import React from 'react';
import { Zap, RefreshCw, Plus, Database, Lock } from 'lucide-react';

export default function Header({ dbConnected, onRefresh, onOpenAddPayment, isRefreshing, pinRequired, onLock }) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon-box">
          <Zap size={22} />
        </div>
        <div>
          <h1 className="brand-title">UPI Flow</h1>
          <div className="brand-subtitle">Automated Financial Tracker</div>
        </div>
      </div>

      <div className="header-actions">
        <div className={`badge ${dbConnected ? 'badge-connected' : 'badge-danger'}`} title="Database Status">
          <span className="pulse-dot"></span>
          <Database size={13} />
          <span className="db-badge-text-full">{dbConnected ? 'DB: Connected' : 'DB: Disconnected'}</span>
          <span className="db-badge-text-short">{dbConnected ? 'Online' : 'Offline'}</span>
        </div>

        {pinRequired && onLock && (
          <button
            className="btn btn-secondary btn-icon"
            title="Lock Dashboard"
            onClick={onLock}
            style={{ color: '#10b981' }}
          >
            <Lock size={16} />
          </button>
        )}

        <button 
          className="btn btn-secondary btn-icon" 
          title="Refresh Data" 
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>

        <button className="btn btn-primary btn-add-payment" onClick={onOpenAddPayment}>
          <Plus size={16} />
          <span>Add Payment</span>
        </button>
      </div>
    </header>
  );
}
