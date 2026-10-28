import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Coffee, 
  Sparkles, 
  Calendar, 
  Train, 
  Utensils, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight,
  Lightbulb,
  Edit2,
  ChevronLeft,
  ChevronRight,
  X,
  Check
} from 'lucide-react';
import { api } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

export default function OverviewTab({ analytics, onWishlistUpdated, showToast }) {
  const [chartView, setChartView] = useState('daily'); // 'daily' or 'mom'

  // Smart Tips Auto-Rotation State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isTipFading, setIsTipFading] = useState(false);
  const [isTipsPaused, setIsTipsPaused] = useState(false);

  // Wishlist Customizer Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalNameInput, setGoalNameInput] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const tips = analytics?.tips || [];

  // Auto-fading timer for Smart Tips (rotates every 5.5 seconds, pauses on hover)
  // MUST be called unconditionally at top level!
  useEffect(() => {
    if (!tips || tips.length <= 1 || isTipsPaused) return;

    const interval = setInterval(() => {
      setIsTipFading(true);
      setTimeout(() => {
        setCurrentTipIndex(prev => (prev + 1) % tips.length);
        setIsTipFading(false);
      }, 300);
    }, 5500);

    return () => clearInterval(interval);
  }, [tips.length, isTipsPaused]);

  if (!analytics || !analytics.summary) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
        Loading financial analytics...
      </div>
    );
  }

  const { summary, categoryBreakdown = [], dailySpendMap = {}, timeSlots = {}, habits = {} } = analytics;

  const handleNextTip = () => {
    if (!tips || tips.length <= 1) return;
    setIsTipFading(true);
    setTimeout(() => {
      setCurrentTipIndex(prev => (prev + 1) % tips.length);
      setIsTipFading(false);
    }, 200);
  };

  const handlePrevTip = () => {
    if (!tips || tips.length <= 1) return;
    setIsTipFading(true);
    setTimeout(() => {
      setCurrentTipIndex(prev => (prev - 1 + tips.length) % tips.length);
      setIsTipFading(false);
    }, 200);
  };

  const activeTip = tips[currentTipIndex] || null;

  // Wishlist Goal Save Handler
  const handleSaveGoal = async (e) => {
    if (e) e.preventDefault();
    if (!goalNameInput.trim() || !goalTargetInput || parseFloat(goalTargetInput) <= 0) {
      if (showToast) showToast('Please enter a valid goal name and target price', 'error');
      return;
    }

    setSavingGoal(true);
    try {
      const res = await api.saveSettings({
        wishlist_name: goalNameInput.trim(),
        wishlist_target: parseFloat(goalTargetInput)
      });
      if (res.success) {
        if (showToast) showToast(`Goal updated to "${goalNameInput.trim()}" (₹${parseFloat(goalTargetInput).toLocaleString('en-IN')})`, 'success');
        setIsGoalModalOpen(false);
        if (onWishlistUpdated) onWishlistUpdated();
      } else {
        if (showToast) showToast('Failed to save goal', 'error');
      }
    } catch (err) {
      if (showToast) showToast('Error updating wishlist goal', 'error');
    } finally {
      setSavingGoal(false);
    }
  };

  const diffAmt = Math.abs(Math.round(summary.budgetVariance || 0));
  const isOverBudget = summary.projectedSpend > summary.monthlyBudget;
  const progressPercent = Math.min(100, Math.round(summary.budgetBurnPercent || 0));

  // 1. Daily Spend Chart Data
  const dailyLabels = Object.keys(dailySpendMap).map(d => `${d}th`);
  const dailyValues = Object.values(dailySpendMap);
  const dailyChartData = {
    labels: dailyLabels.length > 0 ? dailyLabels : ['No Data'],
    datasets: [
      {
        label: 'Daily Spend (₹)',
        data: dailyValues.length > 0 ? dailyValues : [0],
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        hoverBackgroundColor: '#10b981',
        borderRadius: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => `₹${item.raw.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { 
          color: '#94a3b8', 
          font: { size: 10 },
          autoSkip: true,
          maxTicksLimit: 12,
          maxRotation: 45
        }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          color: '#94a3b8',
          callback: (val) => `₹${val}`
        }
      }
    }
  };

  // 2. Month-over-Month (MoM) Cumulative Trajectory Line Chart
  const mom = habits.momTrajectory || {};
  const momLabels = Array.from({ length: summary.totalDaysInMonth }, (_, i) => `${i + 1}th`);
  const momChartData = {
    labels: momLabels,
    datasets: [
      {
        label: `This Month (${mom.monthNames?.current || 'Current'})`,
        data: mom.currentMonthCumulative || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        borderWidth: 2.5,
        tension: 0.3,
        pointRadius: (ctx) => (ctx.dataIndex === (summary.currentDay - 1) ? 6 : 0),
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      },
      {
        label: `Last Month (${mom.monthNames?.prev || 'Previous'})`,
        data: mom.prevMonthCumulative || [],
        borderColor: '#06b6d4',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 0
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1',
          boxWidth: 12,
          padding: 10,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (item) => `${item.dataset.label}: ₹${item.raw ? item.raw.toLocaleString('en-IN') : '0'}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { 
          color: '#94a3b8', 
          font: { size: 10 },
          autoSkip: true,
          maxTicksLimit: 12
        }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          color: '#94a3b8',
          callback: (val) => `₹${val.toLocaleString('en-IN')}`
        }
      }
    }
  };

  // 3. Category Donut Data
  const catColors = [
    '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', 
    '#f59e0b', '#f97316', '#14b8a6', '#64748b'
  ];
  const catLabels = categoryBreakdown.map(c => c.category);
  const catValues = categoryBreakdown.map(c => c.total);

  const donutChartData = {
    labels: catLabels.length > 0 ? catLabels : ['None'],
    datasets: [
      {
        data: catValues.length > 0 ? catValues : [1],
        backgroundColor: catColors.slice(0, catLabels.length),
        borderColor: '#0f172a',
        borderWidth: 2
      }
    ]
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          boxWidth: 10,
          padding: 8,
          font: { size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label: (item) => `₹${item.raw.toLocaleString('en-IN')}`
        }
      }
    },
    cutout: '70%'
  };

  // 4. Time of Day Chart
  const timeLabels = ['Morning (6-12)', 'Afternoon (12-5)', 'Evening (5-9)', 'Night (9-6)'];
  const timeDataVals = [
    timeSlots.morning?.total || 0,
    timeSlots.afternoon?.total || 0,
    timeSlots.evening?.total || 0,
    timeSlots.night?.total || 0
  ];

  const timeChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Spend (₹)',
        data: timeDataVals,
        backgroundColor: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'],
        borderRadius: 4
      }
    ]
  };

  // 5. Day-of-Week Bar Chart
  const dayOfWeekList = habits.dayOfWeekBreakdown || [];
  const peakDayName = habits.peakDay?.day || 'Sat';
  const dayOfWeekChartData = {
    labels: dayOfWeekList.map(d => d.day),
    datasets: [
      {
        label: 'Day Spend (₹)',
        data: dayOfWeekList.map(d => d.total),
        backgroundColor: dayOfWeekList.map(d => d.day === peakDayName ? '#f43f5e' : 'rgba(6, 182, 212, 0.75)'),
        borderRadius: 4
      }
    ]
  };

  const dayOfWeekOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => `₹${item.raw.toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        display: false
      }
    }
  };

  // Sub-items for micro-spends
  const microSpends = habits.microSpends || {};
  const commute = microSpends.commute || { total: 0, count: 0 };
  const snacks = microSpends.snacks || { total: 0, count: 0 };
  const pocket = microSpends.pocketMoney || { dailyLimit: 150, todaySpent: 0, todayRemaining: 150, spentPercent: 0, status: 'HEALTHY' };
  const sipSwap = microSpends.sipSwap || { futureValue3Yr: 0, projectedMonthly: 0, wishlistName: 'Goa Flight / Weekend Trip', wishlistTarget: 6000, wishlistPercent: 0 };

  // Helper for tip styling
  const getTipAccentColor = (type) => {
    switch (type) {
      case 'danger': return '#f43f5e';
      case 'warning': return '#f59e0b';
      case 'success': return '#10b981';
      default: return '#06b6d4';
    }
  };

  return (
    <div>
      {/* Hero Burn-Rate Projection Banner */}
      <div className="glass-card hero-card">
        <div className="hero-grid">
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`badge ${summary.projectionStatus === 'CRITICAL_OVERSPEND' || summary.projectionStatus === 'PROJECTED_OVERSPEND' ? 'badge-danger' : summary.projectionStatus === 'NEAR_LIMIT' ? 'badge-warning' : 'badge-connected'}`}>
                {summary.projectionStatus === 'CRITICAL_OVERSPEND' || summary.projectionStatus === 'PROJECTED_OVERSPEND' ? 'High Pace Alert' : summary.projectionStatus === 'NEAR_LIMIT' ? 'Pacing Close to Limit' : 'Healthy Pace'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Day {summary.currentDay} of {summary.totalDaysInMonth} ({summary.daysRemaining} days left)
              </span>
            </div>

            <h2 className="hero-title">
              Projected Month-End Spend: ₹{Math.round(summary.projectedSpend).toLocaleString('en-IN')}
            </h2>
            <p className="hero-sub">
              At your current daily average of ₹{Math.round(summary.dailyAverage)}/day, you are {isOverBudget ? `projected to exceed your ₹${summary.monthlyBudget.toLocaleString('en-IN')} budget by ₹${diffAmt.toLocaleString('en-IN')}` : `on track to stay comfortably within your ₹${summary.monthlyBudget.toLocaleString('en-IN')} budget with a ₹${diffAmt.toLocaleString('en-IN')} surplus`}.
            </p>

            <div className="progress-track">
              <div 
                className={`progress-fill ${isOverBudget ? 'warning' : ''}`} 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>Spent: ₹{Math.round(summary.totalSpentMonth).toLocaleString('en-IN')} ({progressPercent}%)</span>
              <span>Budget: ₹{Math.round(summary.monthlyBudget).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="remaining-budget-box">
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              Remaining Budget
            </div>
            <div className="remaining-budget-val" style={{ color: summary.remainingBudget > 0 ? '#10b981' : '#f43f5e' }}>
              ₹{Math.max(0, Math.round(summary.remainingBudget)).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Safe Daily Spend Target: <strong>₹{Math.round(summary.recommendedDailyBudget || 0)}/day</strong> for the remaining {summary.daysRemaining} days.
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Fading Smart Tips Banner */}
      {tips.length > 0 && activeTip && (
        <div 
          className="glass-card smart-tip-ticker"
          style={{ 
            marginBottom: '1.5rem', 
            borderLeft: `4px solid ${getTipAccentColor(activeTip.type)}`,
            padding: '1rem 1.25rem'
          }}
          onMouseEnter={() => setIsTipsPaused(true)}
          onMouseLeave={() => setIsTipsPaused(false)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lightbulb size={16} style={{ color: '#fbbf24', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-cyan)' }}>
                Smart AI Financial Tip
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                ({currentTipIndex + 1} of {tips.length})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div className="tip-dots">
                {tips.map((_, idx) => (
                  <span 
                    key={idx}
                    className={`tip-dot ${idx === currentTipIndex ? 'active' : ''}`}
                    onClick={() => setCurrentTipIndex(idx)}
                    title={`Jump to Tip ${idx + 1}`}
                  />
                ))}
              </div>
              <button 
                type="button" 
                className="btn-icon btn-secondary" 
                style={{ width: '24px', height: '24px' }} 
                onClick={handlePrevTip}
                title="Previous Tip"
              >
                <ChevronLeft size={13} />
              </button>
              <button 
                type="button" 
                className="btn-icon btn-secondary" 
                style={{ width: '24px', height: '24px' }} 
                onClick={handleNextTip}
                title="Next Tip"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          <div 
            className="tip-content-fade"
            style={{ 
              opacity: isTipFading ? 0 : 1, 
              transform: isTipFading ? 'translateY(4px)' : 'translateY(0)',
              transition: 'opacity 0.28s ease, transform 0.28s ease'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              {activeTip.title}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '0.4rem' }}>
              {activeTip.message}
            </div>
            {activeTip.action && (
              <div style={{ fontSize: '0.78rem', color: '#38bdf8', background: 'rgba(6, 182, 212, 0.08)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
                💡 <strong>Action:</strong> {activeTip.action}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-label">
            <span>Spent This Month</span>
            <TrendingUp size={16} style={{ color: '#10b981' }} />
          </div>
          <div className="metric-val">₹{Math.round(summary.totalSpentMonth).toLocaleString('en-IN')}</div>
          <div className="metric-sub">{summary.totalTransactionsMonth || 0} total transactions</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-label">
            <span>Daily Burn Rate</span>
            <Clock size={16} style={{ color: '#06b6d4' }} />
          </div>
          <div className="metric-val">₹{Math.round(summary.dailyAverage)}<span style={{ fontSize: '1rem', fontWeight: 400 }}>/day</span></div>
          <div className="metric-sub">Average daily consumption</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-label">
            <span>Micro-Spends (&lt; ₹100)</span>
            <Coffee size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div className="metric-val" style={{ color: '#f59e0b' }}>
            {microSpends.count ?? 0} <span style={{ fontSize: '1rem', fontWeight: 500 }}>txns</span>
          </div>
          <div className="metric-sub">₹{Math.round(microSpends.total ?? 0)} in quick QR taps</div>
        </div>
      </div>

      {/* Charts Grid with MoM Trajectory Toggle */}
      <div className="charts-grid">
        <div className="glass-card">
          <div className="chart-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 className="chart-title">
                {chartView === 'daily' ? 'Daily Spending Timeline' : 'Cumulative MoM Trajectory'}
              </h3>
              <p className="chart-sub">
                {chartView === 'daily' 
                  ? 'Daily UPI debit trend this month' 
                  : `${mom.monthNames?.current || 'This Month'} vs ${mom.monthNames?.prev || 'Last Month'} cumulative pace`}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {chartView === 'mom' && mom.prevSpentAtSameDay > 0 && (
                <span className={`badge ${mom.momDiff <= 0 ? 'badge-connected' : 'badge-warning'}`}>
                  {mom.momDiff <= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                  <span>Day {summary.currentDay}: {Math.abs(mom.momPercentDiff)}% {mom.momDiff <= 0 ? 'under' : 'above'} last month</span>
                </span>
              )}

              <div className="chart-toggle-group">
                <button
                  type="button"
                  className={`chart-toggle-btn ${chartView === 'daily' ? 'active' : ''}`}
                  onClick={() => setChartView('daily')}
                >
                  Daily Bar
                </button>
                <button
                  type="button"
                  className={`chart-toggle-btn ${chartView === 'mom' ? 'active' : ''}`}
                  onClick={() => setChartView('mom')}
                >
                  Cumulative MoM
                </button>
              </div>
            </div>
          </div>

          <div className="chart-container">
            {chartView === 'daily' ? (
              <Bar data={dailyChartData} options={barChartOptions} />
            ) : (
              <Line data={momChartData} options={lineChartOptions} />
            )}
          </div>
        </div>

        <div className="glass-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Category Breakdown</h3>
              <p className="chart-sub">Where your money goes</p>
            </div>
          </div>
          <div className="chart-container">
            {catValues.length > 0 ? (
              <Doughnut data={donutChartData} options={donutOptions} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No category data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row: Smart Micro-Spend Hub (< ₹100 Deep Dive) */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.25)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(15, 23, 42, 0.8) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 800, fontSize: '1.05rem' }}>
            <Coffee size={20} />
            <span>Smart Micro-Spend Hub (&lt; ₹100 Deep Dive)</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Total: ₹{Math.round(microSpends.total ?? 0)} across {microSpends.count ?? 0} scans
          </span>
        </div>

        <div className="micro-hub-grid">
          {/* 1. Commute vs Snack Split */}
          <div className="micro-hub-col">
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
              Necessary Commute vs. Discretionary Snacks
            </div>
            
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <div className="split-pill" style={{ borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#06b6d4', fontSize: '0.78rem', fontWeight: 700 }}>
                  <Train size={14} /> Work Commute
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  ₹{commute.total}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {commute.count} Metro & Auto trips
                </div>
              </div>

              <div className="split-pill" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700 }}>
                  <Utensils size={14} /> Snacks & Chai
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', margin: '0.2rem 0' }}>
                  ₹{snacks.total}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {snacks.count} discretionary taps
                </div>
              </div>
            </div>
          </div>

          {/* 2. Today's Pocket Money Envelope */}
          <div className="micro-hub-col">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Today's Snack Pocket Envelope
              </div>
              <span className={`badge ${pocket.status === 'EXCEEDED' ? 'badge-danger' : pocket.status === 'NEAR_LIMIT' ? 'badge-warning' : 'badge-connected'}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.68rem' }}>
                {pocket.status === 'EXCEEDED' ? 'Exceeded' : pocket.status === 'NEAR_LIMIT' ? 'Near Cap' : 'Within Budget'}
              </span>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{pocket.todaySpent} <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ ₹{pocket.dailyLimit} limit</span>
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: pocket.todayRemaining > 0 ? '#10b981' : '#f43f5e' }}>
                  ₹{pocket.todayRemaining} left today
                </span>
              </div>

              <div className="progress-track" style={{ height: '7px', margin: '0.6rem 0 0.35rem 0' }}>
                <div 
                  className={`progress-fill ${pocket.status === 'EXCEEDED' ? 'warning' : ''}`}
                  style={{ width: `${pocket.spentPercent}%` }}
                ></div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Only non-commute snacks count toward your daily ₹150 pocket envelope.
              </div>
            </div>
          </div>

          {/* 3. Compounding SIP & Wishlist Swap */}
          <div className="micro-hub-col">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Wealth & Goal Swap Reality Check
              </div>
              <button
                type="button"
                className="btn-rename-icon"
                style={{ fontSize: '0.72rem', gap: '3px', padding: '2px 6px', opacity: 0.9 }}
                title="Edit Your Wishlist Goal"
                onClick={() => {
                  setGoalNameInput(sipSwap.wishlistName || '');
                  setGoalTargetInput(sipSwap.wishlistTarget || 6000);
                  setIsGoalModalOpen(true);
                }}
              >
                <Edit2 size={11} />
                <span>Edit Goal</span>
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
                  <PiggyBank size={15} /> 3-Yr Nifty SIP Value
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  ₹{Math.round(sipSwap.futureValue3Yr).toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.45rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    🎯 {sipSwap.wishlistName} (₹{Number(sipSwap.wishlistTarget).toLocaleString('en-IN')})
                  </span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{sipSwap.wishlistPercent}% funded</span>
                </div>
                <div className="progress-track" style={{ height: '6px', margin: 0 }}>
                  <div className="progress-fill" style={{ width: `${sipSwap.wishlistPercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Weekend Surge & Day-of-Week Analyzer + Time-of-Day + Top Merchants */}
      <div className="habits-grid">
        {/* Card 1: Weekend Surge & Day-of-Week Pattern */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#06b6d4', fontWeight: 700 }}>
              <Calendar size={16} /> Weekend Surge & Habits
            </div>
            <span className={`badge ${habits.weekendMultiplier > 1.4 ? 'badge-danger' : 'badge-connected'}`} style={{ padding: '0.15rem 0.5rem', fontSize: '0.68rem' }}>
              {habits.weekendMultiplier > 1.0 ? `${habits.weekendMultiplier}x Weekend Surge` : 'Disciplined Weekend'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Weekday: </span>
              <strong style={{ color: 'var(--text-primary)' }}>₹{habits.weekdayAvg}/day</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Weekend: </span>
              <strong style={{ color: '#f43f5e' }}>₹{habits.weekendAvg}/day</strong>
            </div>
          </div>

          <div style={{ height: '110px' }}>
            <Bar data={dayOfWeekChartData} options={dayOfWeekOptions} />
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
            🔥 Peak spending day: <strong style={{ color: '#f43f5e' }}>{habits.peakDay?.day || 'Saturday'}</strong> (₹{habits.peakDay?.total || 0})
          </div>
        </div>

        {/* Card 2: Time-of-Day Pattern */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontWeight: 700 }}>
            <Clock size={16} /> Time-of-Day Pattern
          </div>
          <div className="chart-container-sm" style={{ height: '140px' }}>
            <Bar data={timeChartData} options={barChartOptions} />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
            Shows when your UPI QR codes get scanned across the 24-hour cycle.
          </div>
        </div>

        {/* Card 3: Top Merchants */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#ec4899', fontWeight: 700 }}>
            <Sparkles size={16} /> Top Merchants
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {analytics.topMerchants && analytics.topMerchants.length > 0 ? (
              analytics.topMerchants.slice(0, 4).map((m, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {m.merchant_name || m.merchant || 'UPI Merchant'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>₹{parseFloat(m.total).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No merchant spending yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Customize Wishlist Goal Modal */}
      {isGoalModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGoalModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Customize Wishlist Goal</h3>
              <button 
                type="button" 
                className="btn-icon btn-secondary" 
                onClick={() => setIsGoalModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGoal}>
              <div className="form-group">
                <label className="form-label">Goal / Item Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Goa Flight, PlayStation 5, AirPods Pro"
                  value={goalNameInput}
                  onChange={(e) => setGoalNameInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Amount (₹)</label>
                <input
                  type="number"
                  step="100"
                  min="500"
                  className="form-input"
                  placeholder="e.g. 6000"
                  value={goalTargetInput}
                  onChange={(e) => setGoalTargetInput(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Your monthly non-commute snack spending will calculate progress against this goal.
                </span>
              </div>

              {/* Quick Presets */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Quick Presets:
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { name: 'Goa Flight / Weekend Trip', target: 6000 },
                    { name: 'Sony WH-1000XM5 Headphones', target: 18000 },
                    { name: 'Cult.fit Annual Pass', target: 12000 },
                    { name: 'PlayStation 5 Console', target: 45000 },
                    { name: 'Emergency Rainy-Day Fund', target: 20000 }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="date-preset-btn"
                      onClick={() => {
                        setGoalNameInput(preset.name);
                        setGoalTargetInput(preset.target);
                      }}
                    >
                      {preset.name.split(' ')[0]} (₹{preset.target.toLocaleString('en-IN')})
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsGoalModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={savingGoal}
                >
                  <Check size={16} />
                  <span>{savingGoal ? 'Saving...' : 'Save Goal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
