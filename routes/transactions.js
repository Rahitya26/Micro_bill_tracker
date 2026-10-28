const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { parseUpiMessage, determineCategory } = require('../services/upiParser');

// GET /api/transactions - Fetch transactions with search, category, and date filtering
router.get('/', async (req, res) => {
    try {
        const { search, category, type, startDate, endDate, limit = 100, offset = 0 } = req.query;

        let conditions = [];
        let params = [];
        let idx = 1;

        if (search) {
            conditions.push(`(merchant_name ILIKE $${idx} OR description ILIKE $${idx} OR upi_ref ILIKE $${idx} OR merchant_vpa ILIKE $${idx})`);
            params.push(`%${search}%`);
            idx++;
        }

        if (category && category !== 'ALL') {
            conditions.push(`category = $${idx}`);
            params.push(category);
            idx++;
        }

        if (type && type !== 'ALL') {
            conditions.push(`type = $${idx}`);
            params.push(type.toUpperCase());
            idx++;
        }

        if (startDate) {
            conditions.push(`transaction_time >= $${idx}`);
            params.push(startDate.includes(' ') || startDate.includes('T') ? startDate : `${startDate} 00:00:00`);
            idx++;
        }

        if (endDate) {
            conditions.push(`transaction_time <= $${idx}`);
            params.push(endDate.includes(' ') || endDate.includes('T') ? endDate : `${endDate} 23:59:59.999`);
            idx++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) as total FROM transactions ${whereClause}`;
        const dataQuery = `
            SELECT * FROM transactions
            ${whereClause}
            ORDER BY transaction_time DESC, id DESC
            LIMIT $${idx} OFFSET $${idx + 1}
        `;
        params.push(parseInt(limit, 10), parseInt(offset, 10));

        const countRes = await db.query(countQuery, params.slice(0, idx - 1));
        const dataRes = await db.query(dataQuery, params);

        res.json({
            success: true,
            total: parseInt(countRes.rows[0].total, 10),
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            transactions: dataRes.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/transactions - Quick manual add
router.post('/', async (req, res) => {
    try {
        const { amount, type = 'DEBIT', merchant_name, category, description, transaction_time, bank_name } = req.body;
        if (!amount || isNaN(parseFloat(amount))) {
            return res.status(400).json({ success: false, error: 'Valid amount is required.' });
        }

        const resolvedCategory = category || determineCategory(merchant_name || description || '', merchant_name || '');
        const upiRef = req.body.upi_ref || `MAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const sql = `
            INSERT INTO transactions (
                upi_ref, amount, type, merchant_name, merchant_vpa,
                category, bank_name, description, source, transaction_time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'MANUAL', $9)
            RETURNING *;
        `;

        const result = await db.query(sql, [
            upiRef,
            parseFloat(amount),
            type.toUpperCase(),
            merchant_name || 'UPI Merchant',
            req.body.merchant_vpa || null,
            resolvedCategory,
            bank_name || 'Manual Entry',
            description || `Payment of ₹${amount} to ${merchant_name || 'UPI Merchant'}`,
            transaction_time ? new Date(transaction_time) : new Date()
        ]);

        res.status(201).json({ success: true, transaction: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/transactions/:id - Edit category or details
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { category, merchant_name, description, amount } = req.body;

        const sql = `
            UPDATE transactions
            SET category = COALESCE($1, category),
                merchant_name = COALESCE($2, merchant_name),
                description = COALESCE($3, description),
                amount = COALESCE($4, amount)
            WHERE id = $5
            RETURNING *;
        `;

        const result = await db.query(sql, [category, merchant_name, description, amount ? parseFloat(amount) : null, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found.' });
        }
        res.json({ success: true, transaction: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM transactions WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Transaction not found.' });
        }
        res.json({ success: true, message: 'Transaction deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/transactions/clear - Wipe all transactions for fresh testing
router.post('/clear', async (req, res) => {
    try {
        await db.query('TRUNCATE transactions, sync_logs RESTART IDENTITY CASCADE;');
        res.json({ success: true, message: 'All transactions and sync logs have been successfully cleared.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
