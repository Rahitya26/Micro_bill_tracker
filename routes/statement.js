const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { parseCsvStatement } = require('../services/statementParser');
const { requireAuth } = require('../middleware/auth');

// Configure upload directory (safe for both local dev and Vercel serverless /tmp)
const isServerless = Boolean(process.env.VERCEL);
const uploadDir = isServerless ? os.tmpdir() : path.join(__dirname, '..', 'uploads');
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (_) {}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `statement-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(csv|txt)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV or text files are supported.'), false);
        }
    }
});

// POST /api/statement/upload (Guarded by auth)
router.post('/upload', requireAuth, upload.single('statement'), async (req, res) => {
    let filePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }
        filePath = req.file.path;

        const parseResult = await parseCsvStatement(filePath);
        res.json({
            success: true,
            message: `Bank statement imported successfully! ${parseResult.importedCount} new transactions added.`,
            result: parseResult
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        // Always clean up temp file from disk / serverless container
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (_) {}
        }
    }
});

module.exports = router;
