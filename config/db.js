const { Pool, Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool = null;
let isConnected = false;
let lastError = null;

// In-Memory Fallback Store if PostgreSQL credentials aren't supplied yet
const memoryStore = {
    settings: {
        id: 1,
        monthly_budget: 25000.00,
        salary_date: 1,
        currency: 'INR',
        wishlist_name: 'Goa Flight / Weekend Trip',
        wishlist_target: 6000.00,
        email_sync_active: false
    },
    categories: [
        { id: 1, name: 'Food & Dining', icon: 'utensils', color: '#f97316', monthly_budget: 8000 },
        { id: 2, name: 'Groceries & Essentials', icon: 'shopping-cart', color: '#10b981', monthly_budget: 6000 },
        { id: 3, name: 'Shopping & E-Commerce', icon: 'shopping-bag', color: '#8b5cf6', monthly_budget: 4000 },
        { id: 4, name: 'Bills & Utilities', icon: 'zap', color: '#eab308', monthly_budget: 3000 },
        { id: 5, name: 'Travel & Commute', icon: 'car', color: '#06b6d4', monthly_budget: 3500 },
        { id: 6, name: 'Entertainment & Subs', icon: 'tv', color: '#ec4899', monthly_budget: 1500 },
        { id: 7, name: 'Health & Wellness', icon: 'heart-pulse', color: '#ef4444', monthly_budget: 2000 },
        { id: 8, name: 'Transfers & Rent', icon: 'arrow-left-right', color: '#3b82f6', monthly_budget: 15000 },
        { id: 9, name: 'Others & General', icon: 'help-circle', color: '#64748b', monthly_budget: 2000 }
    ],
    transactions: [],
    sync_logs: []
};

// Helper to get configuration
function getDbConfig(overrideDb) {
    if (process.env.DATABASE_URL) {
        const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
        return {
            connectionString: process.env.DATABASE_URL,
            ssl: isLocal ? false : { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: parseInt(process.env.PGMAX || '5', 10),
        };
    }
    return {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        database: overrideDb || process.env.PGDATABASE || 'payment_tracker',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 5
    };
}

// Ensure the database exists by briefly connecting to default 'postgres' database
async function ensureDatabaseExists() {
    const targetDb = process.env.PGDATABASE || 'payment_tracker';
    const maintenanceClient = new Client(getDbConfig('postgres'));
    try {
        await maintenanceClient.connect();
        const res = await maintenanceClient.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [targetDb]
        );
        if (res.rowCount === 0) {
            console.log(`[Database] Database "${targetDb}" does not exist. Creating it now...`);
            await maintenanceClient.query(`CREATE DATABASE "${targetDb}"`);
            console.log(`[Database] Successfully created database "${targetDb}".`);
        }
    } catch (err) {
        console.warn(`[Database] Database verification note: ${err.message}`);
    } finally {
        try {
            await maintenanceClient.end();
        } catch (_) {}
    }
}

// Initialize database schema
async function initializeSchema() {
    try {
        const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const sql = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(sql);
            console.log('[Database] Schema verified successfully.');
        }
    } catch (err) {
        console.warn('[Database] Schema verification note:', err.message);
    }
}

// Connect and initialize
async function initDb() {
    try {
        if (!process.env.DATABASE_URL) {
            await ensureDatabaseExists();
        }
        pool = new Pool(getDbConfig());
        
        const client = await pool.connect();
        const res = await client.query('SELECT NOW() as now, version()');
        client.release();

        isConnected = true;
        lastError = null;
        const providerName = (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')) ? 'Supabase' : 'PostgreSQL';
        console.log(`[Database] Connected to ${providerName} at ${res.rows[0].now}`);
        await initializeSchema();
        return true;
    } catch (err) {
        isConnected = false;
        lastError = err.message;
        console.warn(`[Database] Notice: Database not connected yet (${err.message}).`);
        console.warn(`[Database] Falling back to high-speed in-memory store until DATABASE_URL or PGPASSWORD is set in .env.`);
        return false;
    }
}

// Memory query handler for smooth zero-setup fallback
function memoryQuery(text, params = []) {
    const s = text.trim();

    // 1. SELECT monthly_budget FROM user_settings
    if (/SELECT.*FROM user_settings/i.test(s)) {
        return { rows: [memoryStore.settings], rowCount: 1 };
    }

    // 2. UPDATE user_settings
    if (/INSERT INTO user_settings|UPDATE user_settings/i.test(s)) {
        if (params[0]) memoryStore.settings.monthly_budget = parseFloat(params[0]);
        if (params[1]) memoryStore.settings.salary_date = parseInt(params[1], 10);
        return { rows: [memoryStore.settings], rowCount: 1 };
    }

    // 3. SELECT * FROM categories
    if (/SELECT.*FROM categories/i.test(s)) {
        return { rows: [...memoryStore.categories], rowCount: memoryStore.categories.length };
    }

    // 4. COUNT transactions
    if (/SELECT COUNT\(\*\).*FROM transactions/i.test(s)) {
        return { rows: [{ total: memoryStore.transactions.length }], rowCount: 1 };
    }

    // 5. SELECT transactions
    if (/SELECT.*FROM transactions/i.test(s)) {
        let list = [...memoryStore.transactions];
        list.sort((a, b) => new Date(b.transaction_time) - new Date(a.transaction_time));
        return { rows: list, rowCount: list.length };
    }

    // 6. INSERT INTO transactions
    if (/INSERT INTO transactions/i.test(s)) {
        let source = 'MANUAL';
        if (s.includes("'SIMULATOR'")) source = 'SIMULATOR';
        else if (s.includes("'SMS_WEBHOOK'")) source = 'SMS_WEBHOOK';
        else if (s.includes("'EMAIL_SYNC'")) source = 'EMAIL_SYNC';
        else if (s.includes("'STATEMENT_IMPORT'")) source = 'STATEMENT_IMPORT';

        const lastParam = params[params.length - 1];
        const txTime = (lastParam instanceof Date || typeof lastParam === 'string' && !isNaN(Date.parse(lastParam))) ? new Date(lastParam) : new Date();

        const newTx = {
            id: memoryStore.transactions.length + 1,
            upi_ref: params[0] || `MEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: parseFloat(params[1]),
            type: params[2] || 'DEBIT',
            merchant_name: params[3] || 'UPI Merchant',
            merchant_vpa: params[4] || null,
            category: params[5] || 'Others & General',
            bank_name: params[6] || 'UPI',
            account_last4: params[7] || null,
            description: params[8] || '',
            raw_message: params[9] || '',
            source: source,
            transaction_time: txTime,
            created_at: new Date()
        };

        const existing = memoryStore.transactions.find(t => t.upi_ref === newTx.upi_ref);
        if (!existing) {
            memoryStore.transactions.unshift(newTx);
            return { rows: [newTx], rowCount: 1 };
        }
        return { rows: [existing], rowCount: 0 };
    }

    // TRUNCATE
    if (/TRUNCATE/i.test(s)) {
        memoryStore.transactions = [];
        memoryStore.sync_logs = [];
        return { rows: [], rowCount: 0 };
    }

    // 7. DELETE FROM transactions
    if (/DELETE FROM transactions/i.test(s)) {
        const id = parseInt(params[0], 10);
        const idx = memoryStore.transactions.findIndex(t => t.id === id);
        if (idx !== -1) {
            const removed = memoryStore.transactions.splice(idx, 1);
            return { rows: removed, rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
    }

    // 8. UPDATE transactions
    if (/UPDATE transactions/i.test(s)) {
        const id = parseInt(params[params.length - 1], 10);
        const tx = memoryStore.transactions.find(t => t.id === id);
        if (tx) {
            if (params[0]) tx.category = params[0];
            if (params[1]) tx.merchant_name = params[1];
            if (params[2]) tx.description = params[2];
            return { rows: [tx], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
    }

    // 9. Sync logs
    if (/INSERT INTO sync_logs/i.test(s)) {
        memoryStore.sync_logs.push({ source: params[0], status: params[1], count: params[2], time: new Date() });
        return { rows: [], rowCount: 1 };
    }
    if (/SELECT.*FROM sync_logs/i.test(s)) {
        return { rows: memoryStore.sync_logs, rowCount: memoryStore.sync_logs.length };
    }

    return { rows: [], rowCount: 0 };
}

let connectingPromise = null;

// Ensure database pool is connected on serverless cold starts
async function ensureConnected() {
    if (isConnected && pool) return true;
    if (!connectingPromise) {
        connectingPromise = initDb().catch(err => {
            console.error('[Database] Connection initialization error:', err.message);
            return false;
        }).finally(() => {
            connectingPromise = null;
        });
    }
    return connectingPromise;
}

// Unified query helper: tries Postgres first, uses fallback if not connected
async function query(text, params) {
    if (!isConnected && (process.env.DATABASE_URL || process.env.PGPASSWORD)) {
        await ensureConnected();
    }
    if (isConnected && pool) {
        return pool.query(text, params);
    }
    return memoryQuery(text, params);
}

// Status check (Sanitized for public hosting security)
function getStatus() {
    const isSupabase = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase'));
    let maskedHost = 'localhost';
    if (process.env.DATABASE_URL) {
        try {
            const rawHost = (process.env.DATABASE_URL.split('@')[1] || '').split('/')[0];
            maskedHost = rawHost ? rawHost.replace(/^(.*?)(\.[^.]+\.[^.]+)$/, '***$2') : 'cloud-db';
        } catch (_) {
            maskedHost = 'cloud-db';
        }
    }
    return {
        connected: isConnected,
        error: isConnected ? null : (lastError ? 'Check database credentials' : null),
        mode: isConnected ? (isSupabase ? 'SUPABASE' : 'POSTGRESQL') : 'LOCAL_MEMORY_FALLBACK',
        provider: isSupabase ? 'Supabase (Cloud)' : (process.env.DATABASE_URL ? 'Cloud PostgreSQL' : 'Local PostgreSQL'),
        config: {
            host: maskedHost,
            database: process.env.DATABASE_URL ? 'postgres' : (process.env.PGDATABASE || 'payment_tracker'),
            hasConnectionString: Boolean(process.env.DATABASE_URL)
        }
    };
}

module.exports = {
    initDb,
    query,
    getPool: () => pool,
    getStatus
};
