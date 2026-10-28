const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const settingsRes = await db.query('SELECT * FROM user_settings WHERE id = 1');
        const categoriesRes = await db.query('SELECT * FROM categories ORDER BY name ASC');
        const dbStatus = db.getStatus();

        res.json({
            success: true,
            settings: settingsRes.rows[0] || { monthly_budget: 25000, salary_date: 1, currency: 'INR' },
            categories: categoriesRes.rows,
            dbStatus
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST or PUT /api/settings - Update monthly budget or settings
const updateSettings = async (req, res) => {
    try {
        const { monthly_budget, monthlyBudget, salary_date, salaryDate, wishlist_name, wishlistName, wishlist_target, wishlistTarget } = req.body;
        
        const finalBudget = monthly_budget !== undefined ? monthly_budget : monthlyBudget;
        const finalSalaryDate = salary_date !== undefined ? salary_date : salaryDate;
        const finalWishlistName = wishlist_name !== undefined ? wishlist_name : wishlistName;
        const finalWishlistTarget = wishlist_target !== undefined ? wishlist_target : wishlistTarget;

        const sql = `
            INSERT INTO user_settings (id, monthly_budget, salary_date, wishlist_name, wishlist_target, updated_at)
            VALUES (1, $1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE
                SET monthly_budget = COALESCE($1, user_settings.monthly_budget),
                    salary_date = COALESCE($2, user_settings.salary_date),
                    wishlist_name = COALESCE($3, user_settings.wishlist_name),
                    wishlist_target = COALESCE($4, user_settings.wishlist_target),
                    updated_at = NOW()
            RETURNING *;
        `;
        const result = await db.query(sql, [
            finalBudget !== undefined && finalBudget !== null ? parseFloat(finalBudget) : null,
            finalSalaryDate !== undefined && finalSalaryDate !== null ? parseInt(finalSalaryDate, 10) : null,
            finalWishlistName !== undefined && finalWishlistName !== null ? String(finalWishlistName).trim() : null,
            finalWishlistTarget !== undefined && finalWishlistTarget !== null ? parseFloat(finalWishlistTarget) : null
        ]);

        res.json({ success: true, settings: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

router.post('/', updateSettings);
router.put('/', updateSettings);

module.exports = router;
