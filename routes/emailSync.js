const express = require('express');
const router = express.Router();
const { syncBankEmails } = require('../services/emailSync');
const db = require('../config/db');

// POST /api/sync/email - Trigger email sync on demand
router.post('/email', async (req, res) => {
    try {
        const result = await syncBankEmails();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/sync/logs - View sync history
router.get('/logs', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 20');
        res.json({ success: true, logs: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
