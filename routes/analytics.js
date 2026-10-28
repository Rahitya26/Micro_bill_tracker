const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { calculateAnalytics } = require('../services/analytics');

// GET /api/analytics - Get habit analysis, future projections, and smart tips
router.get('/', async (req, res) => {
    try {
        // Fetch user budget settings
        let monthlyBudget = 25000;
        let userSettings = {};
        try {
            const settingsRes = await db.query('SELECT * FROM user_settings WHERE id = 1');
            if (settingsRes.rows.length > 0) {
                userSettings = settingsRes.rows[0];
                if (userSettings.monthly_budget) {
                    monthlyBudget = parseFloat(userSettings.monthly_budget);
                }
            }
        } catch (_) {}

        // Fetch transactions for the past 60 days
        const txRes = await db.query(`
            SELECT * FROM transactions
            WHERE transaction_time >= NOW() - INTERVAL '60 days'
            ORDER BY transaction_time DESC
        `);

        const analytics = calculateAnalytics(txRes.rows, monthlyBudget, userSettings);
        res.json({
            success: true,
            analytics
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/analytics/export - Export transactions as CSV download
router.get('/export', async (req, res) => {
    try {
        const txRes = await db.query('SELECT * FROM transactions ORDER BY transaction_time DESC');
        
        let csvContent = 'ID,Date,Time,Amount,Type,Merchant,Category,Bank,Account,UPI Ref,Description\n';
        for (const t of txRes.rows) {
            const d = new Date(t.transaction_time);
            const dateStr = d.toISOString().split('T')[0];
            const timeStr = d.toTimeString().split(' ')[0];
            const cleanDesc = (t.description || '').replace(/"/g, '""');
            const cleanMerchant = (t.merchant_name || '').replace(/"/g, '""');

            csvContent += `"${t.id}","${dateStr}","${timeStr}","${t.amount}","${t.type}","${cleanMerchant}","${t.category}","${t.bank_name || ''}","${t.account_last4 || ''}","${t.upi_ref || ''}","${cleanDesc}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="upi-transactions-export.csv"');
        res.status(200).send(csvContent);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
