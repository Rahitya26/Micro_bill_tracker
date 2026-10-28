/**
 * Free Automated Email Sync for UPI Bank Alerts via IMAP
 */
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const { parseUpiMessage } = require('./upiParser');
const db = require('../config/db');

let isSyncRunning = false;

async function syncBankEmails() {
    if (isSyncRunning) {
        return { success: false, message: 'Sync already in progress.' };
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailHost = process.env.EMAIL_HOST || 'imap.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '993', 10);

    if (!emailUser || !emailPass || emailUser === 'your_email@gmail.com') {
        return {
            success: false,
            message: 'Email credentials not configured in .env. Please configure EMAIL_USER and EMAIL_PASS (Gmail App Password).'
        };
    }

    isSyncRunning = true;
    let importedCount = 0;
    let duplicateCount = 0;
    let errors = [];

    const config = {
        imap: {
            user: emailUser,
            password: emailPass,
            host: emailHost,
            port: emailPort,
            tls: true,
            authTimeout: 10000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };

    try {
        console.log(`[EmailSync] Connecting to ${emailHost}...`);
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Search for bank alert emails in the last 7 days
        const delay = 7 * 24 * 3600 * 1000;
        const yesterday = new Date();
        yesterday.setTime(Date.now() - delay);
        const searchCriteria = [
            'ALL',
            ['SINCE', yesterday.toISOString().split('T')[0]]
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`[EmailSync] Found ${messages.length} recent emails. Scanning for UPI alerts...`);

        for (const item of messages) {
            try {
                const all = item.parts.find(part => part.which === '');
                if (!all || !all.body) continue;

                const parsed = await simpleParser(all.body);
                const subject = parsed.subject || '';
                const sender = parsed.from ? parsed.from.text : '';
                const textContent = parsed.text || parsed.html || '';

                // Check if likely a bank or UPI transaction alert
                const isBankAlert = /(debited|credited|transferred|upi|vpa|hdfc|sbi|icici|axis|kotak|paytm|phonepe)/i.test(`${subject} ${sender}`);
                if (!isBankAlert) continue;

                const upiData = parseUpiMessage(`${subject}\n${textContent}`, sender);
                if (upiData && upiData.amount > 0) {
                    try {
                        const insertSql = `
                            INSERT INTO transactions (
                                upi_ref, amount, type, merchant_name, merchant_vpa,
                                category, bank_name, account_last4, description,
                                raw_message, source, transaction_time
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'EMAIL_SYNC', $11)
                            ON CONFLICT (upi_ref) DO NOTHING
                            RETURNING id;
                        `;
                        const res = await db.query(insertSql, [
                            upiData.upi_ref,
                            upiData.amount,
                            upiData.type,
                            upiData.merchant_name,
                            upiData.merchant_vpa,
                            upiData.category,
                            upiData.bank_name,
                            upiData.account_last4,
                            upiData.description,
                            upiData.raw_message.substring(0, 500),
                            upiData.transaction_time
                        ]);

                        if (res.rowCount > 0) {
                            importedCount++;
                        } else {
                            duplicateCount++;
                        }
                    } catch (dbErr) {
                        errors.push(dbErr.message);
                    }
                }
            } catch (pErr) {
                // Skip unparseable email part
            }
        }

        connection.end();

        // Log sync history
        try {
            await db.query(`
                INSERT INTO sync_logs (source, status, imported_count, duplicate_count, details)
                VALUES ('EMAIL_SYNC', 'SUCCESS', $1, $2, $3)
            `, [importedCount, duplicateCount, `Scanned ${messages.length} messages. New: ${importedCount}, Duplicates: ${duplicateCount}`]);
        } catch (_) {}

        return {
            success: true,
            importedCount,
            duplicateCount,
            message: `Email sync completed. ${importedCount} new UPI payments logged (${duplicateCount} existing ignored).`
        };
    } catch (err) {
        console.error('[EmailSync] Error syncing emails:', err.message);
        try {
            await db.query(`
                INSERT INTO sync_logs (source, status, imported_count, duplicate_count, details)
                VALUES ('EMAIL_SYNC', 'FAILED', 0, 0, $1)
            `, [err.message]);
        } catch (_) {}

        return {
            success: false,
            message: `Email sync error: ${err.message}`
        };
    } finally {
        isSyncRunning = false;
    }
}

module.exports = {
    syncBankEmails
};
