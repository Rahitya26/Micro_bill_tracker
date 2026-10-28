const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { parseUpiMessage } = require('../services/upiParser');
const { requireAuth } = require('../middleware/auth');

/**
 * POST /api/webhook/sms
 * Receives incoming SMS or Notification payload from Android automation apps
 * (MacroDroid, Tasker, SMS Forwarder, Automate)
 * 
 * Payload structure:
 * {
 *   "message": "HDFC Bank: Rs 340.00 debited from a/c **1234 on 27-10-26 to VPA swiggy@icici (UPI Ref No 429381928391)",
 *   "sender": "HDFCBK",
 *   "secret": "upi_tracker_secret_token_123" (optional or via header / query parameter)
 * }
 */
router.post('/sms', async (req, res) => {
    try {
        console.log(`\n[Webhook] 📥 Incoming HTTP POST from ${req.ip || 'phone'}`);
        const { message, text, body, sender = 'SMS', from = 'SMS', secret } = req.body || {};
        const rawText = message || text || body;

        // Strict Secret Verification: Protects webhook from fake public spam
        if (process.env.WEBHOOK_SECRET) {
            const incomingSecret = req.headers['x-webhook-secret']
                || req.query.secret
                || secret
                || (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, '').trim());

            if (!incomingSecret || incomingSecret !== process.env.WEBHOOK_SECRET) {
                console.warn(`[Webhook] ⚠️ Blocked unauthorized request from ${req.ip || 'unknown'}`);
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized: Missing or invalid webhook secret.'
                });
            }
        }

        if (!rawText) {
            console.log('[Webhook] ⚠️ Received request with empty message body (test action ping)');
            return res.status(400).json({ success: false, error: 'Missing "message" in request body.' });
        }

        console.log(`[Webhook] Sender: ${sender || from}`);
        console.log(`[Webhook] Text: "${rawText.substring(0, 120)}${rawText.length > 120 ? '...' : ''}"`);

        const upiData = parseUpiMessage(rawText, sender || from);
        if (!upiData) {
            console.log('[Webhook] ℹ️ Ignored: Message is not an active financial debit/credit (e.g. promo/OTP/irrelevant).');
            return res.status(200).json({
                success: false,
                message: 'Message received, but not recognized as an active UPI financial transaction. Ignored non-debit/credit message.'
            });
        }

        const insertSql = `
            INSERT INTO transactions (
                upi_ref, amount, type, merchant_name, merchant_vpa,
                category, bank_name, account_last4, description,
                raw_message, source, transaction_time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SMS_WEBHOOK', $11)
            ON CONFLICT (upi_ref) DO UPDATE
                SET description = EXCLUDED.description
            RETURNING *;
        `;

        const dbRes = await db.query(insertSql, [
            upiData.upi_ref,
            upiData.amount,
            upiData.type,
            upiData.merchant_name,
            upiData.merchant_vpa,
            upiData.category,
            upiData.bank_name,
            upiData.account_last4,
            upiData.description,
            upiData.raw_message,
            upiData.transaction_time
        ]);

        console.log(`[Webhook] ✅ Successfully tracked: ₹${upiData.amount} (${upiData.type}) -> ${upiData.merchant_name} [Ref: ${upiData.upi_ref}]`);

        res.status(201).json({
            success: true,
            message: `Successfully tracked ₹${upiData.amount} paid to ${upiData.merchant_name}`,
            transaction: dbRes.rows[0]
        });
    } catch (err) {
        console.error('[Webhook] SMS Parsing Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/webhook/simulate - Test simulator with pre-made Indian bank SMS templates (Guarded by auth)
router.post('/simulate', requireAuth, async (req, res) => {
    try {
        const { bankType, amount = 250, merchant = 'Swiggy', vpa = 'swiggy@icici' } = req.body;
        const randRef = Math.floor(100000000000 + Math.random() * 900000000000);
        let sampleMessage = '';
        let sender = '';

        switch (bankType) {
            case 'bob':
                sender = 'BOB';
                sampleMessage = `Rs.${amount}.00 Dr. from A/C XXXXXX0579 and Cr. to ${vpa}. Ref:${randRef}. AvlBal:Rs2645.25(2026:10:26 01:26:02). Not you? Call 18005700/5000-BOB`;
                break;
            case 'sbi':
                sender = 'SBIINB';
                sampleMessage = `Dear SBI User, your A/C XXXXX12345 debited by Rs ${amount}.00 on 27-Oct-26 transfer to ${merchant} Ref No ${randRef} via UPI.`;
                break;
            case 'icici':
                sender = 'ICICIB';
                sampleMessage = `ICICI Bank Acct XX456 debited for Rs ${amount}.00 on 27-Oct-26. UPI:${randRef}-${merchant}-${vpa}. Call 18002662 if not done by you.`;
                break;
            case 'axis':
                sender = 'AXISBK';
                sampleMessage = `INR ${amount}.00 debited from Axis Bank A/c no. XX789 on 27-10-26 via UPI. Ref ${randRef}. Info: ${merchant}.`;
                break;
            case 'kotak':
                sender = 'KOTAKB';
                sampleMessage = `Sent Rs. ${amount}.00 from Kotak Bank AC X9999 to ${vpa} on 27-10-2026. Ref no ${randRef}.`;
                break;
            case 'phonepe':
                sender = 'PhonePe';
                sampleMessage = `Paid Rs ${amount} to ${merchant} via PhonePe. Transaction ID T${randRef}`;
                break;
            case 'gpay':
                sender = 'GooglePay';
                sampleMessage = `Paid Rs. ${amount} to ${merchant} on Google Pay using A/C **1234. UPI Ref: ${randRef}`;
                break;
            case 'paytm':
                sender = 'PAYTM';
                sampleMessage = `Paid Rs. ${amount} to ${merchant} via Paytm UPI. Ref ${randRef}`;
                break;
            case 'hdfc':
            default:
                sender = 'HDFCBK';
                sampleMessage = `HDFC Bank: Rs ${amount}.00 debited from a/c **1234 on 27-10-26 to VPA ${vpa} (UPI Ref No ${randRef}). Not you? Call 18002583838.`;
                break;
        }

        const upiData = parseUpiMessage(sampleMessage, sender);
        const insertSql = `
            INSERT INTO transactions (
                upi_ref, amount, type, merchant_name, merchant_vpa,
                category, bank_name, account_last4, description,
                raw_message, source, transaction_time
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SIMULATOR', $11)
            RETURNING *;
        `;

        const dbRes = await db.query(insertSql, [
            upiData.upi_ref,
            upiData.amount,
            upiData.type,
            upiData.merchant_name,
            upiData.merchant_vpa,
            upiData.category,
            upiData.bank_name,
            upiData.account_last4,
            upiData.description,
            upiData.raw_message,
            upiData.transaction_time
        ]);

        res.status(201).json({
            success: true,
            simulatedMessage: sampleMessage,
            transaction: dbRes.rows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
