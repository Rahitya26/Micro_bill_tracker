const fs = require('fs');
const csv = require('csv-parser');
const { parseUpiMessage } = require('./upiParser');
const db = require('../config/db');

async function parseCsvStatement(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        let importedCount = 0;
        let duplicateCount = 0;
        let failedCount = 0;

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => results.push(row))
            .on('end', async () => {
                for (const row of results) {
                    try {
                        // Find probable keys in row regardless of case
                        const keys = Object.keys(row);
                        const findKey = (candidates) => {
                            return keys.find(k => candidates.some(c => k.toLowerCase().includes(c.toLowerCase())));
                        };

                        const descKey = findKey(['narration', 'description', 'remarks', 'particulars', 'transaction details', 'details']);
                        const debitKey = findKey(['debit', 'withdrawal', 'dr', 'paid out']);
                        const creditKey = findKey(['credit', 'deposit', 'cr', 'paid in']);
                        const amountKey = findKey(['amount', 'txn amount', 'total']);
                        const dateKey = findKey(['date', 'txn date', 'value date', 'time']);
                        const refKey = findKey(['ref', 'utr', 'cheque', 'reference', 'txn id']);

                        const rawDesc = descKey ? row[descKey] : '';
                        let amount = 0;
                        let type = 'DEBIT';

                        if (debitKey && parseFloat(row[debitKey]?.replace(/,/g, '')) > 0) {
                            amount = parseFloat(row[debitKey].replace(/,/g, ''));
                            type = 'DEBIT';
                        } else if (creditKey && parseFloat(row[creditKey]?.replace(/,/g, '')) > 0) {
                            amount = parseFloat(row[creditKey].replace(/,/g, ''));
                            type = 'CREDIT';
                        } else if (amountKey) {
                            amount = parseFloat(row[amountKey]?.replace(/,/g, '')) || 0;
                            const typeKey = findKey(['type', 'cr/dr', 'd/c']);
                            if (typeKey && /cr|credit/i.test(row[typeKey])) {
                                type = 'CREDIT';
                            }
                        }

                        if (!amount || amount <= 0) {
                            failedCount++;
                            continue;
                        }

                        // Parse through UPI parser for categorization and merchant detection
                        const upiData = parseUpiMessage(`${rawDesc} Rs ${amount}`, 'Statement');
                        const merchantName = (upiData && upiData.merchant_name) ? upiData.merchant_name : (rawDesc.slice(0, 40) || 'UPI Payment');
                        const category = upiData ? upiData.category : 'Others & General';
                        const upiRef = (refKey && row[refKey]) ? row[refKey].trim() : (upiData ? upiData.upi_ref : `CSV-${Date.now()}-${Math.random().toString(36).substring(7)}`);
                        
                        let txTime = new Date();
                        if (dateKey && row[dateKey]) {
                            const d = new Date(row[dateKey]);
                            if (!isNaN(d.getTime())) txTime = d;
                        }

                        const insertSql = `
                            INSERT INTO transactions (
                                upi_ref, amount, type, merchant_name, merchant_vpa,
                                category, bank_name, description, raw_message,
                                source, transaction_time
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'STATEMENT_IMPORT', $10)
                            ON CONFLICT (upi_ref) DO NOTHING
                            RETURNING id;
                        `;

                        const res = await db.query(insertSql, [
                            upiRef,
                            amount,
                            type,
                            merchantName,
                            upiData ? upiData.merchant_vpa : null,
                            category,
                            upiData ? upiData.bank_name : 'Bank Statement',
                            `Statement: ${rawDesc}`,
                            JSON.stringify(row),
                            txTime
                        ]);

                        if (res.rowCount > 0) {
                            importedCount++;
                        } else {
                            duplicateCount++;
                        }
                    } catch (err) {
                        failedCount++;
                    }
                }

                // Clean up uploaded file
                try {
                    fs.unlinkSync(filePath);
                } catch (_) {}

                resolve({
                    success: true,
                    totalRows: results.length,
                    importedCount,
                    duplicateCount,
                    failedCount
                });
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

module.exports = {
    parseCsvStatement
};
