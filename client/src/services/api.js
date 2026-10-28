/**
 * API Service for UPI Payment Tracker React Frontend
 * Built with secure token authentication & Vercel serverless compatibility.
 */

const BASE_URL = '/api';
const TOKEN_KEY = 'upi_auth_token';

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && data.code === 'PIN_REQUIRED') {
    // Session expired or locked
    window.dispatchEvent(new CustomEvent('upi:auth-required'));
  }

  return data;
}

export const api = {
  getAuthToken,
  setAuthToken,

  async getAuthStatus() {
    return request('/auth/status');
  },

  async verifyPin(pin) {
    const data = await request('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
    if (data.success && data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  logout() {
    setAuthToken(null);
  },

  async getDbStatus() {
    const res = await fetch(`${BASE_URL}/db-status`);
    return res.json().catch(() => ({ connected: false }));
  },

  async getAnalytics() {
    return request('/analytics');
  },

  async getTransactions(params = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const query = new URLSearchParams(cleanParams).toString();
    return request(`/transactions?${query}`);
  },

  async addTransaction(data) {
    return request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteTransaction(id) {
    return request(`/transactions/${id}`, {
      method: 'DELETE'
    });
  },

  async updateTransaction(id, data) {
    return request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async simulateSms(payload) {
    return request('/webhook/simulate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getSettings() {
    return request('/settings');
  },

  async saveSettings(data) {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async clearData() {
    return request('/transactions/clear', {
      method: 'POST'
    });
  }
};
