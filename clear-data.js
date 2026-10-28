/**
 * Utility Script: Clear all transactions and test data
 * Usage: node clear-data.js
 * or:    npm run clear
 */
const { Pool } = require('pg');
require('dotenv').config();

async function clearData() {
    console.log('Connecting to PostgreSQL...');
    
    const pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        database: process.env.PGDATABASE || 'payment_tracker',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
    });

    try {
        const client = await pool.connect();
        console.log('Connected! Truncating transactions and sync logs...');
        
        await client.query('TRUNCATE transactions, sync_logs RESTART IDENTITY CASCADE;');
        
        const res = await client.query('SELECT count(*) FROM transactions;');
        client.release();
        await pool.end();

        console.log('====================================================');
        console.log('✅ All transactions and sync logs have been CLEARED.');
        console.log(`Current transaction count in database: ${res.rows[0].count} rows.`);
        console.log('====================================================');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to clear database:', err.message);
        console.error('Please check your PGPASSWORD in .env file.');
        process.exit(1);
    }
}

clearData();
