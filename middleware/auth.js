const crypto = require('crypto');
require('dotenv').config();

// Resolve secret key for signing session tokens
function getSecretKey() {
    return process.env.SESSION_SECRET 
        || process.env.WEBHOOK_SECRET 
        || process.env.APP_PIN 
        || 'upi-payment-tracker-session-salt-2026';
}

/**
 * Generate a cryptographically signed HMAC token for the dashboard session.
 * Token expires in 30 days.
 */
function generateToken(data = {}) {
    const payload = {
        auth: true,
        iat: Date.now(),
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        ...data
    };
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const hmac = crypto.createHmac('sha256', getSecretKey());
    hmac.update(b64Payload);
    const signature = hmac.digest('base64url');
    return `${b64Payload}.${signature}`;
}

/**
 * Verify HMAC signed session token with timing-safe comparison.
 */
function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [b64Payload, signature] = parts;
    try {
        const hmac = crypto.createHmac('sha256', getSecretKey());
        hmac.update(b64Payload);
        const expectedSignature = hmac.digest('base64url');

        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSignature);

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return null;
        }

        const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
        if (payload.exp && payload.exp < Date.now()) {
            return null; // Expired token
        }

        return payload;
    } catch (_) {
        return null;
    }
}

/**
 * Check if the Master PIN is configured in the environment.
 */
function isPinConfigured() {
    return Boolean(process.env.APP_PIN && process.env.APP_PIN.trim() !== '');
}

/**
 * Verify user-provided PIN against the configured APP_PIN.
 */
function verifyPin(inputPin) {
    if (!isPinConfigured()) return true;
    if (!inputPin) return false;

    const actualPin = String(process.env.APP_PIN).trim();
    const providedPin = String(inputPin).trim();

    const actualBuf = Buffer.from(actualPin);
    const providedBuf = Buffer.from(providedPin);

    if (actualBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, providedBuf);
}

/**
 * Express middleware to guard sensitive private routes.
 * If APP_PIN is not configured, allows open access (local/dev mode).
 * If APP_PIN is set, requires a valid session token in Authorization header.
 */
function requireAuth(req, res, next) {
    if (!isPinConfigured()) {
        return next();
    }

    // Check Authorization header: "Bearer <token>"
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    // Direct PIN header bypass for headless clients
    const directPin = req.headers['x-app-pin'];
    if (directPin && verifyPin(directPin)) {
        return next();
    }

    if (token) {
        const payload = verifyToken(token);
        if (payload) {
            req.user = payload;
            return next();
        }
    }

    return res.status(401).json({
        success: false,
        code: 'PIN_REQUIRED',
        error: 'Unauthorized: Enter Master PIN to access this dashboard.'
    });
}

module.exports = {
    generateToken,
    verifyToken,
    isPinConfigured,
    verifyPin,
    requireAuth
};

