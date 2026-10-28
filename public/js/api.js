/**
 * API Client Module
 */

const API = {
    async getDbStatus() {
        const res = await fetch('/api/db-status');
        return res.json();
    },

    async reconnectDb() {
        const res = await fetch('/api/db-reconnect', { method: 'POST' });
        return res.json();
    },

    async getAnalytics() {
        const res = await fetch('/api/analytics');
        return res.json();
    },

    async getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`/api/transactions?${query}`);
        return res.json();
    },

    async addTransaction(data) {
        const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async deleteTransaction(id) {
        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
        return res.json();
    },

    async simulateWebhook(data) {
        const res = await fetch('/api/webhook/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async triggerEmailSync() {
        const res = await fetch('/api/sync/email', { method: 'POST' });
        return res.json();
    },

    async uploadStatement(formData) {
        const res = await fetch('/api/statement/upload', {
            method: 'POST',
            body: formData
        });
        return res.json();
    },

    async getSettings() {
        const res = await fetch('/api/settings');
        return res.json();
    },

    async saveSettings(data) {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async clearTransactions() {
        const res = await fetch('/api/transactions/clear', { method: 'POST' });
        return res.json();
    }
};
