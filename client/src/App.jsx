import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import OverviewTab from './components/OverviewTab';
import TransactionsTab from './components/TransactionsTab';
import SettingsTab from './components/SettingsTab';
import AddPaymentModal from './components/AddPaymentModal';
import PinLockModal from './components/PinLockModal';
import { api } from './services/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [dbConnected, setDbConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Security Lock State
  const [pinRequired, setPinRequired] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Modals
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Fetch Analytics & DB Status
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const [statusRes, analyticsRes] = await Promise.all([
        api.getDbStatus().catch(() => ({ connected: false })),
        api.getAnalytics().catch(() => ({ success: false }))
      ]);

      setDbConnected(!!statusRes.connected);

      if (analyticsRes.success && analyticsRes.analytics) {
        setAnalytics(analyticsRes.analytics);
      }
    } catch (err) {
      console.error('Error refreshing app data:', err);
    } finally {
      if (showIndicator) setIsRefreshing(false);
    }
  }, []);

  // Verify PIN Auth Status on startup
  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await api.getAuthStatus();
      if (res && res.success) {
        setPinRequired(!!res.pinRequired);
        if (res.pinRequired && !res.authenticated) {
          setIsLocked(true);
          return false;
        } else {
          setIsLocked(false);
          return true;
        }
      }
    } catch (err) {
      console.warn('Auth check notice:', err.message);
    }
    return true;
  }, []);

  useEffect(() => {
    let interval = null;
    checkAuthStatus().then(authed => {
      if (authed) {
        loadData();
        // Polling every 8 seconds for newly incoming transactions
        interval = setInterval(() => {
          loadData();
        }, 8000);
      }
    });

    // Listen for unauthorized 401 events from any API call
    const handleAuthRequired = () => {
      setIsLocked(true);
    };
    window.addEventListener('upi:auth-required', handleAuthRequired);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('upi:auth-required', handleAuthRequired);
    };
  }, [checkAuthStatus, loadData]);

  // Handle successful PIN unlock
  const handleUnlock = () => {
    setIsLocked(false);
    loadData(true);
  };

  // Handle Manual Lock from Header
  const handleLock = () => {
    api.logout();
    setIsLocked(true);
    showToast('Dashboard locked', 'info');
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <Header
        dbConnected={dbConnected}
        onRefresh={() => loadData(true)}
        onOpenAddPayment={() => setIsAddPaymentOpen(true)}
        isRefreshing={isRefreshing}
        pinRequired={pinRequired}
        onLock={handleLock}
      />

      {/* Navigation Tabs */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Tab Panels */}
      <main>
        {activeTab === 'overview' && (
          <OverviewTab
            analytics={analytics}
            onWishlistUpdated={() => loadData()}
            showToast={showToast}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            onTransactionChange={() => loadData()}
            showToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            showToast={showToast}
            onSettingsChanged={() => loadData()}
          />
        )}
      </main>

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
        onSuccess={() => loadData()}
        showToast={showToast}
      />

      {/* Master PIN Lock Screen Overlay */}
      <PinLockModal
        isOpen={isLocked}
        onUnlock={handleUnlock}
        showToast={showToast}
      />

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type === 'error' ? 'toast-error' : 'toast-success'}`}>
            {t.type === 'error' ? (
              <AlertCircle size={18} style={{ color: '#fb7185' }} />
            ) : (
              <CheckCircle2 size={18} style={{ color: '#34d399' }} />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
