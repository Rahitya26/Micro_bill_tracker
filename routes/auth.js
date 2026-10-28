const express = require('express');
const router = express.Router();
const { isPinConfigured, verifyPin, generateToken, verifyToken } = require('../middleware/auth');

// In-memory rate limiting map for brute-force protection
// Key: client IP, Value: { attempts: number, lockUntil: number }
const rateLimitMap = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 60 seconds

function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record) return { locked: false };

    if (record.lockUntil && record.lockUntil > now) {
        const remainingSec = Math.ceil((record.lockUntil - now) / 1000);
        return { locked: true, remainingSec };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
        record.lockUntil = now + LOCKOUT_MS;
        record.attempts = 0;
        return { locked: true, remainingSec: Math.ceil(LOCKOUT_MS / 1000) };
    }

    return { locked: false };
}

function recordFailedAttempt(ip) {
    const record = rateLimitMap.get(ip) || { attempts: 0, lockUntil: 0 };
    record.attempts += 1;
    rateLimitMap.set(ip, record);
}

function resetRateLimit(ip) {
    rateLimitMap.delete(ip);
}

/**
 * GET /api/auth/status
 * Check whether PIN authentication is required and whether the current session is valid.
 */
router.get('/status', (req, res) => {
    const pinRequired = isPinConfigured();

    let authenticated = false;
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
    }

    if (token && verifyToken(token)) {
        authenticated = true;
    } else if (!pinRequired) {
        authenticated = true;
    }

    res.json({
        success: true,
        pinRequired,
        authenticated
    });
});

/**
 * POST /api/auth/verify-pin
 * Verify Master PIN and generate a signed session token.
 */
router.post('/verify-pin', (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const limitStatus = checkRateLimit(clientIp);

    if (limitStatus.locked) {
        return res.status(429).json({
            success: false,
            error: `Too many incorrect attempts. Security lock active. Please wait ${limitStatus.remainingSec}s.`
        });
    }

    const { pin } = req.body;
    if (!pin) {
        return res.status(400).json({ success: false, error: 'PIN is required.' });
    }

    if (verifyPin(pin)) {
        resetRateLimit(clientIp);
        const token = generateToken({ ip: clientIp });
        return res.json({
            success: true,
            token,
            message: 'Dashboard unlocked successfully.'
        });
    }

    recordFailedAttempt(clientIp);
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - (rateLimitMap.get(clientIp)?.attempts || 0));

    return res.status(401).json({
        success: false,
        error: attemptsLeft > 0 
            ? `Incorrect PIN. ${attemptsLeft} attempts remaining before temporary lockout.`
            : 'Incorrect PIN. Security lock engaged for 60 seconds.'
    });
});

module.exports = router;

