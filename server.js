const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

const { initDb, getStatus } = require('./config/db');
const { syncBankEmails } = require('./services/emailSync');
const { requireAuth } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const webhookRoutes = require('./routes/webhook');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const emailSyncRoutes = require('./routes/emailSync');
const statementRoutes = require('./routes/statement');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Protection Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets (prefer React client/dist if built, fallback to public)
const clientDist = path.join(__dirname, 'client', 'dist');
const publicDir = path.join(__dirname, 'public');

if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
} else {
    app.use(express.static(publicDir));
}

// Public Status & Auth Endpoints
app.use('/api/auth', authRoutes);

// Database connection status check endpoint (Sanitized output)
app.get('/api/db-status', (req, res) => {
    res.json(getStatus());
});

// Reconnect endpoint (Guarded by auth)
app.post('/api/db-reconnect', requireAuth, async (req, res) => {
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config({ override: true });
    const success = await initDb();
    res.json({ success, status: getStatus() });
});

// Webhook endpoint (SMS webhook is public, strictly validated via WEBHOOK_SECRET internally; /simulate is guarded)
app.use('/api/webhook', webhookRoutes);

// Private Application Routes (Guarded by App Lock PIN)
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/sync', requireAuth, emailSyncRoutes);
app.use('/api/statement', requireAuth, statementRoutes);

// Fallback route for SPA
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(clientDist, 'index.html'))) {
        res.sendFile(path.join(clientDist, 'index.html'));
    } else {
        res.sendFile(path.join(publicDir, 'index.html'));
    }
});

// Start background email polling if enabled (Disabled on Vercel serverless lambdas)
if (process.env.EMAIL_SYNC_ENABLED === 'true' && !process.env.VERCEL && require.main === module) {
    const intervalMins = parseInt(process.env.EMAIL_SYNC_INTERVAL_MINS || '15', 10);
    const cronSchedule = `*/${intervalMins} * * * *`;
    console.log(`[Scheduler] Automated bank email sync scheduled every ${intervalMins} minutes (${cronSchedule}).`);
    cron.schedule(cronSchedule, async () => {
        console.log('[Scheduler] Running automated bank email sync...');
        await syncBankEmails();
    });
}

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Start Server locally when executed directly
if (require.main === module) {
    app.listen(PORT, async () => {
        const localIp = getLocalIp();
        console.log(`\n=======================================================`);
        console.log(`🚀 UPI Payment Tracker Server Active!`);
        console.log(`💻 Local Dashboard:  http://localhost:${PORT}`);
        console.log(`📱 Phone Webhook:    http://${localIp}:${PORT}/api/webhook/sms`);
        console.log(`=======================================================\n`);
        const dbOk = await initDb();
        if (!dbOk) {
            console.warn(`[Server] PostgreSQL connection pending. You can update PGPASSWORD in .env`);
        }
    });
}

module.exports = app;
