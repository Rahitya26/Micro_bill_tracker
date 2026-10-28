import React from 'react';
import { LayoutGrid, Receipt, Sliders } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'overview', label: 'Overview & Habits', shortLabel: 'Overview', icon: LayoutGrid },
    { id: 'transactions', label: 'Transaction History', shortLabel: 'History', icon: Receipt },
    { id: 'settings', label: 'Budget & Settings', shortLabel: 'Settings', icon: Sliders },
  ];

  return (
    <nav className="tabs-nav">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <div className="tab-icon-wrap">
              <Icon size={18} />
            </div>
            <span className="tab-label-full">{tab.label}</span>
            <span className="tab-label-short">{tab.shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}
