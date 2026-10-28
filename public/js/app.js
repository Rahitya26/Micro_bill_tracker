/**
 * Main Application Controller
 */

let currentTab = 'analytics';
let searchDebounceTimer = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkDatabaseConnection();
    await loadDashboard();
    await fetchTransactions();
    await loadSettings();
});

// Toast notification helper
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.remove();
    }, 4500);
}

// Database Status Check
async function checkDatabaseConnection() {
    try {
        const res = await API.getDbStatus();
        const pill = document.getElementById('db-status-pill');
        const text = document.getElementById('db-status-text');
        const banner = document.getElementById('db-alert-banner');
        const modalText = document.getElementById('db-modal-status-text');
        const settingsBadge = document.getElementById('db-settings-status-badge');
        const settingsDetails = document.getElementById('db-settings-details');

        if (res.connected) {
            pill.className = 'db-pill connected';
            text.textContent = 'PostgreSQL: Connected';
            banner.style.display = 'none';
            if (modalText) modalText.innerHTML = `<span style="color: #34d399;">✓ Connected to database "${res.config.database}" as "${res.config.user}"</span>`;
            if (settingsBadge) {
                settingsBadge.className = 'prediction-badge';
                settingsBadge.textContent = 'Connected (PostgreSQL 18)';
            }
            if (settingsDetails) {
                settingsDetails.innerHTML = `
                    Database: <strong>${res.config.database}</strong><br>
                    Host: <strong>${res.config.host}:${res.config.port}</strong><br>
                    User: <strong>${res.config.user}</strong><br>
                    Password Set: <strong>${res.config.hasPassword ? 'Yes' : 'No'}</strong>
                `;
            }
        } else {
            pill.className = 'db-pill error';
            text.textContent = 'PostgreSQL: Disconnected';
            banner.style.display = 'flex';
            if (modalText) {
                modalText.innerHTML = `
                    <span style="color: #f87171;">✕ Not Connected:</span> ${res.error || 'Check credentials'}<br><br>
                    <em>Open <code>d:/PaymentTracker/.env</code>, enter your <code>PGPASSWORD</code>, and click Reconnect.</em>
                `;
            }
            if (settingsBadge) {
                settingsBadge.className = 'prediction-badge danger';
                settingsBadge.textContent = 'Connection Required';
            }
            if (settingsDetails) {
                settingsDetails.innerHTML = `
                    <span style="color: #f87171;">Connection error: ${res.error || 'Password needed'}</span><br>
                    Please update <code>d:/PaymentTracker/.env</code> and click Reconnect.
                `;
            }
        }
    } catch (e) {
        console.error('Failed to query db status', e);
    }
}

async function reconnectDb() {
    showToast('Attempting to connect to PostgreSQL...', 'info');
    try {
        const res = await API.reconnectDb();
        if (res.success) {
            showToast('PostgreSQL connected successfully!', 'success');
            closeModal('modal-db');
            await checkDatabaseConnection();
            await loadDashboard();
            await fetchTransactions();
        } else {
            showToast(`Connection failed: ${res.status.error || 'Check password in .env'}`, 'error');
            await checkDatabaseConnection();
        }
    } catch (err) {
        showToast(`Error reconnecting: ${err.message}`, 'error');
    }
}

// Load Dashboard Analytics & Visualizations
async function loadDashboard() {
    try {
        const res = await API.getAnalytics();
        if (!res.success || !res.analytics) return;

        const { summary, categoryBreakdown, topMerchants, habits, dailySpendMap, timeSlots, tips } = res.analytics;

        // 1. Update Hero Projection & Spend Pace
        const badge = document.getElementById('prediction-badge');
        const headline = document.getElementById('hero-headline');
        const message = document.getElementById('hero-message');
        const fill = document.getElementById('budget-progress-fill');
        const percentText = document.getElementById('budget-progress-percent');
        const burnIndicator = document.getElementById('burn-rate-indicator');

        document.getElementById('month-elapsed-text').textContent = `Day ${summary.currentDay} of ${summary.totalDaysInMonth} (${summary.daysRemaining} days left)`;
        document.getElementById('val-daily-avg').textContent = `₹${Math.round(summary.dailyAverage)}`;
        document.getElementById('val-projected-spend').textContent = `₹${Math.round(summary.projectedSpend)}`;
        const remBudgetElem = document.getElementById('val-remaining-budget');
        if (remBudgetElem) remBudgetElem.textContent = `₹${Math.round(Math.max(0, summary.remainingBudget))}`;
        document.getElementById('val-hero-spent').textContent = `₹${Math.round(summary.totalSpentMonth)}`;
        document.getElementById('val-hero-budget').textContent = `₹${Math.round(summary.monthlyBudget)}`;

        const diffAmt = Math.abs(Math.round(summary.budgetVariance));
        if (summary.projectedSpend > summary.monthlyBudget) {
            document.getElementById('val-projected-diff').innerHTML = `<span style="color: #f87171;">+₹${diffAmt} over budget</span>`;
        } else {
            document.getElementById('val-projected-diff').innerHTML = `<span style="color: #34d399;">₹${diffAmt} surplus</span>`;
        }

        // Set status badge and message
        if (summary.projectionStatus === 'CRITICAL_OVERSPEND' || summary.projectionStatus === 'PROJECTED_OVERSPEND') {
            badge.className = 'prediction-badge danger';
            badge.textContent = 'High Pace Alert';
            headline.textContent = `Projected Spend: ₹${Math.round(summary.projectedSpend)} (Exceeds Budget)`;
            message.textContent = `At your current burn rate of ₹${Math.round(summary.dailyAverage)}/day, you will overshoot your ₹${summary.monthlyBudget} budget by ~₹${diffAmt}. You have ₹${Math.max(0, Math.round(summary.remainingBudget))} remaining for the month.`;
            fill.className = 'budget-progress-fill warning';
            burnIndicator.textContent = `⚠ Burning budget faster than planned pace`;
            burnIndicator.style.color = '#f87171';
        } else if (summary.projectionStatus === 'NEAR_LIMIT') {
            badge.className = 'prediction-badge warning';
            badge.textContent = 'Pacing Close to Target';
            headline.textContent = `Projected Spend: ₹${Math.round(summary.projectedSpend)}`;
            message.textContent = `You're tracking near your ₹${summary.monthlyBudget} target with ₹${Math.round(summary.remainingBudget)} remaining for the next ${summary.daysRemaining} days.`;
            fill.className = 'budget-progress-fill';
            burnIndicator.textContent = 'Balanced pace';
            burnIndicator.style.color = '#fbbf24';
        } else {
            badge.className = 'prediction-badge';
            badge.textContent = 'Healthy Pace';
            headline.textContent = `Projected Spend: ₹${Math.round(summary.projectedSpend)} (Safe)`;
            message.textContent = `You're spending comfortably within your target. You have ₹${Math.round(summary.remainingBudget)} remaining for the next ${summary.daysRemaining} days.`;
            fill.className = 'budget-progress-fill';
            burnIndicator.textContent = '✓ Healthy budget consumption rate';
            burnIndicator.style.color = '#34d399';
        }

        const clampedPercent = Math.min(100, summary.budgetBurnPercent || 0);
        fill.style.width = `${clampedPercent}%`;
        percentText.textContent = `${Math.round(summary.budgetBurnPercent)}%`;

        // 2. Update KPI Grid
        document.getElementById('kpi-total-spent').textContent = `₹${Math.round(summary.totalSpentMonth)}`;
        document.getElementById('kpi-debit-count').textContent = `${summary.debitCount} debits this month`;

        document.getElementById('kpi-total-received').textContent = `₹${Math.round(summary.totalReceivedMonth)}`;
        document.getElementById('kpi-credit-count').textContent = `${summary.creditCount} refunds / credits`;

        document.getElementById('kpi-micro-total').textContent = `₹${Math.round(habits.microTotal)}`;
        document.getElementById('kpi-micro-count').textContent = `${habits.microCount} transactions under ₹100`;

        document.getElementById('kpi-weekend-stat').textContent = `${habits.weekendMultiplier}x`;
        document.getElementById('kpi-weekend-desc').textContent = habits.weekendMultiplier > 1 
            ? `Weekend daily avg: ₹${habits.weekendAvg} vs ₹${habits.weekdayAvg} weekdays`
            : `Consistent spending across week`;

        // 3. Render Charts
        window.Charts.initDailySpendChart(dailySpendMap);
        window.Charts.initCategoryDonutChart(categoryBreakdown);
        window.Charts.initTimeSlotChart(timeSlots);

        // 4. Render Top Merchants
        const merchantContainer = document.getElementById('top-merchants-list');
        if (topMerchants && topMerchants.length > 0) {
            merchantContainer.innerHTML = topMerchants.map((m, idx) => `
                <div class="merchant-item">
                    <div class="merchant-info">
                        <div class="merchant-badge">${idx + 1}</div>
                        <div>
                            <div class="merchant-name">${m.merchant}</div>
                            <div class="merchant-cat">${m.category || 'General'}</div>
                        </div>
                    </div>
                    <div>
                        <div class="merchant-amount">₹${Math.round(m.total)}</div>
                        <div class="merchant-count">${m.count} ${m.count === 1 ? 'payment' : 'payments'}</div>
                    </div>
                </div>
            `).join('');
        } else {
            merchantContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">No merchant data available yet.</p>`;
        }

        // 5. Render Detected Subscriptions
        const subContainer = document.getElementById('subscriptions-container');
        if (habits.recurring && habits.recurring.length > 0) {
            subContainer.innerHTML = habits.recurring.map(sub => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle);">
                    <div>
                        <div style="font-weight: 600; font-size: 0.88rem;">${sub.merchant}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">Recurring monthly charge</div>
                    </div>
                    <div style="font-weight: 700; color: #f43f5e; font-size: 0.95rem;">
                        ₹${Math.round(sub.total)}
                    </div>
                </div>
            `).join('');
        } else {
            subContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">No active recurring subscriptions detected.</p>`;
        }

        // 6. Render Tips
        const tipsBadge = document.getElementById('tips-badge');
        tipsBadge.textContent = tips ? tips.length : 0;
        const tipsContainer = document.getElementById('tips-container');
        if (tips && tips.length > 0) {
            tipsContainer.innerHTML = tips.map(tip => `
                <div class="tip-card ${tip.type}">
                    <div class="tip-header">
                        <i data-lucide="${tip.icon || 'lightbulb'}" class="tip-icon" style="color: ${tip.type === 'warning' ? '#f59e0b' : tip.type === 'danger' ? '#f43f5e' : tip.type === 'success' ? '#10b981' : '#06b6d4'}"></i>
                        <h4 class="tip-title">${tip.title}</h4>
                    </div>
                    <p class="tip-message">${tip.message}</p>
                    <div class="tip-action-box">
                        <strong style="color: #38bdf8;">Recommended Action:</strong> ${tip.action}
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        } else {
            tipsContainer.innerHTML = `
                <div style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 3rem;">
                    <i data-lucide="check-circle" style="font-size: 2.5rem; margin-bottom: 1rem; color: #10b981;"></i>
                    <p>No active spend warnings! Log more UPI payments to receive personalized habit suggestions.</p>
                </div>
            `;
            lucide.createIcons();
        }

    } catch (err) {
        console.error('Error loading dashboard analytics:', err);
    }
}

// Fetch and display transactions
async function fetchTransactions() {
    try {
        const search = document.getElementById('tx-search-input')?.value.trim() || '';
        const category = document.getElementById('tx-category-filter')?.value || 'ALL';
        const type = document.getElementById('tx-type-filter')?.value || 'ALL';

        const res = await API.getTransactions({ search, category, type, limit: 100 });
        const tbody = document.getElementById('tx-table-body');

        if (!res.success || !res.transactions || res.transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">
                        No UPI transactions found yet. Test with Postman or the UPI Simulator to start tracking!
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = res.transactions.map(t => {
            const dateObj = new Date(t.transaction_time);
            const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const isDebit = t.type === 'DEBIT';

            return `
                <tr>
                    <td>
                        <div style="font-weight: 500;">${dateStr}</div>
                        <div style="font-size: 0.74rem; color: var(--text-muted);">${timeStr}</div>
                    </td>
                    <td>
                        <div class="tx-merchant-col">
                            <span class="tx-merchant-name">${t.merchant_name || 'UPI Merchant'}</span>
                            <span class="tx-vpa-ref">${t.merchant_vpa || t.upi_ref || ''}</span>
                        </div>
                    </td>
                    <td>
                        <span class="cat-tag">${t.category || 'General'}</span>
                    </td>
                    <td>
                        <span style="font-size: 0.82rem; color: var(--text-secondary);">${t.bank_name || 'UPI'}</span>
                        ${t.account_last4 ? `<span style="font-size: 0.72rem; color: var(--text-muted);"> (A/C *${t.account_last4})</span>` : ''}
                    </td>
                    <td>
                        <span class="source-badge">
                            <i data-lucide="${t.source === 'SMS_WEBHOOK' ? 'smartphone' : t.source === 'EMAIL_SYNC' ? 'mail' : t.source === 'STATEMENT_IMPORT' ? 'file-text' : 'sparkles'}" style="width: 12px; height: 12px;"></i>
                            ${t.source}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <span class="tx-amount ${isDebit ? 'debit' : 'credit'}">
                            ${isDebit ? '-' : '+'}₹${parseFloat(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <button class="tx-action-btn" title="Delete payment" onclick="deleteTx(${t.id})">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons();
    } catch (err) {
        console.error('Error fetching transactions:', err);
    }
}

// Debounced Search Handler
function handleSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        fetchTransactions();
    }, 350);
}

// Delete transaction
async function deleteTx(id) {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    try {
        const res = await API.deleteTransaction(id);
        if (res.success) {
            showToast('Transaction removed', 'success');
            await fetchTransactions();
            await loadDashboard();
        } else {
            showToast(res.error || 'Failed to delete', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Add manual payment form submission
async function handleAddPayment(e) {
    e.preventDefault();
    const amount = document.getElementById('add-amount').value;
    const type = document.getElementById('add-type').value;
    const merchant_name = document.getElementById('add-merchant').value;
    const category = document.getElementById('add-category').value;
    const bank_name = document.getElementById('add-bank').value;
    const description = document.getElementById('add-desc').value;

    try {
        const res = await API.addTransaction({
            amount,
            type,
            merchant_name,
            category: category || undefined,
            bank_name,
            description
        });

        if (res.success) {
            showToast(`₹${amount} payment to ${merchant_name} added!`, 'success');
            closeModal('modal-add');
            e.target.reset();
            await fetchTransactions();
            await loadDashboard();
        } else {
            showToast(res.error || 'Failed to add', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Simulator Submit
async function handleSimulatorSubmit(e) {
    e.preventDefault();
    const bankType = document.getElementById('sim-bank').value;
    const merchant = document.getElementById('sim-merchant').value;
    const amount = document.getElementById('sim-amount').value;
    const vpa = document.getElementById('sim-vpa').value;

    try {
        const res = await API.simulateWebhook({ bankType, merchant, amount, vpa });
        const box = document.getElementById('sim-result-box');
        if (res.success) {
            box.style.display = 'block';
            box.innerHTML = `
                <strong>✓ Simulated & Parsed Successfully!</strong><br>
                <span>Raw Alert: "${res.simulatedMessage}"</span><br>
                <span>Category: <strong>${res.transaction.category}</strong> | Ref: <code>${res.transaction.upi_ref}</code></span>
            `;
            showToast(`Simulated ₹${amount} payment to ${merchant}!`, 'success');
            await fetchTransactions();
            await loadDashboard();
        } else {
            showToast(res.error || 'Simulation failed', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// Trigger IMAP Bank Email Sync
async function triggerEmailSync() {
    showToast('Checking bank emails for UPI debit alerts...', 'info');
    try {
        const res = await API.triggerEmailSync();
        if (res.success) {
            showToast(res.message, 'success');
            await fetchTransactions();
            await loadDashboard();
        } else {
            showToast(res.message, 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Bank Statement Upload
async function handleStatementUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('statement', file);

    showToast(`Uploading and parsing ${file.name}...`, 'info');
    try {
        const res = await API.uploadStatement(formData);
        if (res.success) {
            showToast(res.message, 'success');
            await fetchTransactions();
            await loadDashboard();
        } else {
            showToast(res.error || 'Failed to parse statement', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Load Settings
async function loadSettings() {
    try {
        const res = await API.getSettings();
        if (res.success && res.settings) {
            const bInput = document.getElementById('input-monthly-budget');
            const sInput = document.getElementById('input-salary-date');
            if (bInput) bInput.value = res.settings.monthly_budget || 25000;
            if (sInput) sInput.value = res.settings.salary_date || 1;
        }
    } catch (err) {
        console.error('Failed to load settings', err);
    }
}

// Save Budget Settings
async function saveSettings(e) {
    e.preventDefault();
    const monthly_budget = document.getElementById('input-monthly-budget').value;
    const salary_date = document.getElementById('input-salary-date').value;

    try {
        const res = await API.saveSettings({ monthly_budget, salary_date });
        if (res.success) {
            showToast('Budget settings updated successfully!', 'success');
            await loadDashboard();
        } else {
            showToast(res.error || 'Failed to save', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Export CSV
function exportCsv() {
    window.location.href = '/api/analytics/export';
}

// Tab Switching
function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabName));
    if (btn) btn.classList.add('active');

    const pane = document.getElementById(`tab-${tabName}`);
    if (pane) pane.classList.add('active');

    if (tabName === 'analytics') {
        loadDashboard();
    } else if (tabName === 'transactions') {
        fetchTransactions();
    }
}

// Modals management
function openAddModal() {
    document.getElementById('modal-add').classList.add('active');
}

function openSimulatorModal() {
    document.getElementById('modal-simulator').classList.add('active');
}

function openDbModal() {
    document.getElementById('modal-db').classList.add('active');
    checkDatabaseConnection();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Reset & Clear Data
async function clearAllData() {
    if (!confirm('Are you sure you want to clear all transactions? This cannot be undone.')) {
        return;
    }
    showToast('Clearing all transactions...', 'info');
    try {
        const res = await API.clearTransactions();
        if (res.success) {
            showToast('All transactions cleared successfully!', 'success');
            await fetchTransactions();
            await loadDashboard();
        } else {
            showToast(res.error || 'Failed to clear data', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Close modal on click outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});
