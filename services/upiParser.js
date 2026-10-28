/**
 * UPI Transaction Parser Engine
 * Handles SMS and Email alerts from all major Indian banks & UPI apps
 * (HDFC, SBI, ICICI, Axis, Kotak, PNB, Canara, GPay, PhonePe, Paytm, CRED)
 */

// Category dictionary for auto-tagging
const CATEGORY_RULES = [
    {
        category: 'Food & Dining',
        keywords: [
            'swiggy', 'zomato', 'mcdonald', 'kfc', 'burger', 'starbucks', 'cafe', 
            'restaurant', 'dhaba', 'biryani', 'tea', 'chai', 'coffee', 'dosa', 
            'bakery', 'pizza', 'domino', 'eatclub', 'subway', 'haldiram', 'food'
        ]
    },
    {
        category: 'Groceries & Essentials',
        keywords: [
            'blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'kirana', 
            'supermarket', 'grofers', 'milk', 'vegetable', 'fruit', 'provision', 
            'spencer', 'more retail', 'nature basket', 'reliance fresh'
        ]
    },
    {
        category: 'Shopping & E-Commerce',
        keywords: [
            'amazon', 'flipkart', 'myntra', 'meesho', 'nykaa', 'ajio', 'tata cliq', 
            'zara', 'h&m', 'retail', 'clothing', 'electronics', 'croma', 'decathlon', 
            'uniqlo', 'trends', 'westside', 'lifestyle', 'shoppers stop'
        ]
    },
    {
        category: 'Bills & Utilities',
        keywords: [
            'bescom', 'electricity', 'power', 'water', 'gas', 'airtel', 'jio', 
            'vi', 'vodafone', 'broadband', 'wifi', 'recharge', 'dth', 'tata play', 
            'postpaid', 'bill', 'act fibernet', 'cylinder', 'indane', 'mahanagar'
        ]
    },
    {
        category: 'Travel & Commute',
        keywords: [
            'uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'diesel', 'iocl', 
            'bpcl', 'hpcl', 'irctc', 'railway', 'toll', 'fastag', 'makemytrip', 
            'indigo', 'flight', 'redbus', 'yulu', 'auto'
        ]
    },
    {
        category: 'Entertainment & Subs',
        keywords: [
            'netflix', 'spotify', 'hotstar', 'prime video', 'youtube', 'bookmyshow', 
            'pvr', 'inox', 'movie', 'cinema', 'game', 'playstation', 'steam', 'audible', 
            'apple.com', 'google play'
        ]
    },
    {
        category: 'Health & Wellness',
        keywords: [
            'apollo', 'pharmeasy', '1mg', 'pharmacy', 'chemist', 'hospital', 
            'clinic', 'doctor', 'lab', 'gym', 'cult.fit', 'fitness', 'medplus', 
            'diagnostic', 'dentist'
        ]
    },
    {
        category: 'Transfers & Rent',
        keywords: [
            'rent', 'deposit', 'landlord', 'maid', 'cook', 'transfer to', 'sent to', 
            'nobroker', 'mygate'
        ]
    }
];

function determineCategory(text, merchant) {
    // 1. Clean out gateway VPA handles like @rxairtel, @okhdfcbank, @ybl so telecom keywords (like airtel) don't misclassify rides or food
    const cleanText = (text || '').replace(/@[a-zA-Z0-9.\-_]+/g, '');
    const cleanMerchant = (merchant || '').toLowerCase();
    
    // 2. First check merchant name directly (e.g. Uber, Swiggy, Metro, Blinkit)
    for (const rule of CATEGORY_RULES) {
        for (const kw of rule.keywords) {
            if (cleanMerchant.includes(kw)) {
                return rule.category;
            }
        }
    }

    // 3. Check cleaned message text
    const combined = `${cleanText} ${cleanMerchant}`.toLowerCase();
    for (const rule of CATEGORY_RULES) {
        for (const kw of rule.keywords) {
            if (combined.includes(kw)) {
                return rule.category;
            }
        }
    }
    return 'Others & General';
}

function detectBank(text, sender = '') {
    // 1. Check trailing signature (e.g. -BOB, -HDFCBK) or sender first
    const signature = `${text.slice(-30)} ${sender}`.toUpperCase();
    if (signature.includes('BOB') || signature.includes('BARODA') || /Dear BOB/i.test(text)) return 'Bank of Baroda';
    if (signature.includes('HDFC')) return 'HDFC Bank';
    if (signature.includes('SBI')) return 'State Bank of India';
    if (signature.includes('ICICI')) return 'ICICI Bank';
    if (signature.includes('AXIS')) return 'Axis Bank';
    if (signature.includes('KOTAK')) return 'Kotak Mahindra Bank';

    // 2. Remove VPA domain to prevent recipient handles (@icici, @okhdfcbank) from overriding user bank
    const cleanText = text.replace(/@[a-zA-Z]{2,20}/g, '');
    const s = `${cleanText} ${sender}`.toUpperCase();

    if (s.includes('BOB') || s.includes('BARODA')) return 'Bank of Baroda';
    if (s.includes('HDFC')) return 'HDFC Bank';
    if (s.includes('SBI') || s.includes('STATE BANK')) return 'State Bank of India';
    if (s.includes('ICICI')) return 'ICICI Bank';
    if (s.includes('AXIS')) return 'Axis Bank';
    if (s.includes('KOTAK')) return 'Kotak Mahindra Bank';
    if (s.includes('PNB') || s.includes('PUNJAB NATIONAL')) return 'Punjab National Bank';
    if (s.includes('CANARA')) return 'Canara Bank';
    if (s.includes('PAYTM') || s.includes('PPBL')) return 'Paytm Payments Bank';
    if (s.includes('IDFC')) return 'IDFC FIRST Bank';
    if (s.includes('INDUSIND')) return 'IndusInd Bank';
    if (s.includes('PHONEPE')) return 'PhonePe';
    if (s.includes('GPAY') || s.includes('GOOGLE PAY')) return 'Google Pay';
    return 'Bank / UPI';
}

function parseUpiMessage(rawText, sender = '') {
    if (!rawText || typeof rawText !== 'string') return null;

    const text = rawText.trim();

    // 1. Strict Spam / Marketing Promo Filter
    const isPromo = /\b(?:use code|coupon|voucher|promo code|flat\s*(?:rs\.?|inr|₹)?\s*\d+\s*off|off on min|exclusive currency|cashback of up to|pre-approved loan|congratulations you won|apply now)\b/i.test(text);
    if (isPromo) {
        return null; // Reject marketing offers and promotional discounts
    }

    // 2. Determine DEBIT vs CREDIT accurately (must be a genuine financial transaction)
    let type = null;
    if (/(?:Dr\.?\s*(?:from)?\s*A\/C|debited\s*(?:from|by|for)?|sent\s+(?:Rs|INR|₹)|paid\s+(?:Rs|INR|₹)|transferred\s+to)/i.test(text)) {
        type = 'DEBIT';
    } else if (/(?:Cr\.?\s*(?:to)?\s*A\/C|credited\s*(?:with|to|by)?|received\s+(?:Rs|INR|₹)|deposited)/i.test(text)) {
        type = 'CREDIT';
    } else if (/(?:debited|dr\.\s*from)/i.test(text)) {
        type = 'DEBIT';
    } else if (/(?:credited|cr\.\s*to)/i.test(text)) {
        type = 'CREDIT';
    }

    // If message is not an authentic debit or credit (e.g. ticket receipt, balance check, OTP), reject it
    if (!type) {
        return null;
    }

    // 1. Amount Extraction (handles Rs. 150.00, Rs.30.00, Rs 500, INR 1,250.50, ₹450)
    let amount = null;
    const amountRegexes = [
        /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
        /(?:debited|credited|sent|paid|dr\.|cr\.|transfer(?:red)?\s*(?:of)?)\s*(?:by|for)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /([\d,]+(?:\.\d{1,2})?)\s*(?:debited|credited|dr\.|cr\.)/i
    ];

    for (const rx of amountRegexes) {
        const match = text.match(rx);
        if (match && match[1]) {
            const cleanNum = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(cleanNum) && cleanNum > 0) {
                amount = cleanNum;
                break;
            }
        }
    }

    if (!amount) {
        return null; // Not a valid financial debit/credit message
    }

    // 2. UPI Reference / UTR / Ref Number Extraction
    let upiRef = null;
    const refRegexes = [
        /(?:UPI\s*Ref(?:\s*No)?|Ref(?:\s*No)?|UTR|Txn(?:\s*ID)?|Ref)\s*[:.-]?\s*([A-Za-z0-9]{8,25})/i,
        /UPI\/([0-9]{12})/i,
        /(?:Ref\s*(?:No)?)\s*[:]?\s*([0-9]{12})/i,
        /\b([0-9]{12})\b/
    ];

    for (const rx of refRegexes) {
        const match = text.match(rx);
        if (match && match[1]) {
            upiRef = match[1].trim();
            break;
        }
    }

    if (!upiRef) {
        const cleanTimestamp = Date.now().toString(36);
        const rand = Math.floor(Math.random() * 10000).toString();
        upiRef = `GEN-${cleanTimestamp}-${rand}`;
    }

    // 3. VPA (Virtual Payment Address) extraction e.g. q291013923@ybl, swiggy@icici
    let merchantVpa = null;
    const vpaRegex = /([a-zA-Z0-9.\-_]{2,50}@[a-zA-Z]{2,20})/i;
    const vpaMatch = text.match(vpaRegex);
    if (vpaMatch) {
        merchantVpa = vpaMatch[1].toLowerCase();
    }

    // 4. Merchant / Payee Name extraction
    let merchantName = null;
    const merchantPatterns = [
        /(?:to|towards|transfer to|paid to|sent to|cr\.\s*to)\s+(?:VPA\s+)?([A-Za-z0-9\s&.'-]{2,40}?)(?=\s+(?:on|via|Ref|UPI|using|by|A\/c|\.|$))/i,
        /Info:\s*([A-Za-z0-9\s&.'-]{2,30})/i,
        /UPI\/[0-9]+\/([A-Za-z0-9\s&.'-]+?)\//i,
        /(?:from|received from)\s+([A-Za-z0-9\s&.'-]{2,40}?)(?=\s+(?:on|via|Ref|UPI|\.|$))/i
    ];

    for (const rx of merchantPatterns) {
        const match = text.match(rx);
        if (match && match[1]) {
            const rawM = match[1].trim();
            if (!/^(UPI|A\/C|AC|Account|Rs|INR)$/i.test(rawM)) {
                merchantName = rawM;
                break;
            }
        }
    }

    // If merchant deduced from VPA
    if ((!merchantName || merchantName.includes('@')) && merchantVpa) {
        const prefix = merchantVpa.split('@')[0];
        if (/^q\d+$/i.test(prefix)) {
            merchantName = `UPI QR Merchant (${prefix})`;
        } else if (/^paytmqr/i.test(prefix)) {
            merchantName = `Paytm QR (${prefix})`;
        } else {
            const cleanPrefix = prefix.replace(/[._-]/g, ' ');
            merchantName = cleanPrefix.charAt(0).toUpperCase() + cleanPrefix.slice(1);
        }
    }

    if (merchantName) {
        // Smart normalization for popular merchants so repeated purchases group together
        if (/landtmetrorail|metrorail|tsavaari|hyderabad\s*metro/i.test(merchantName)) {
            merchantName = 'Hyderabad Metro Rail';
        } else if (/uber/i.test(merchantName)) {
            merchantName = 'Uber';
        } else if (/ola/i.test(merchantName)) {
            merchantName = 'Ola Cabs';
        } else if (/rapido/i.test(merchantName)) {
            merchantName = 'Rapido';
        } else if (/swiggy/i.test(merchantName)) {
            merchantName = 'Swiggy';
        } else if (/zomato/i.test(merchantName)) {
            merchantName = 'Zomato';
        } else if (/blinkit|grofers/i.test(merchantName)) {
            merchantName = 'Blinkit';
        } else if (/zepto/i.test(merchantName)) {
            merchantName = 'Zepto';
        } else if (/instamart/i.test(merchantName)) {
            merchantName = 'Swiggy Instamart';
        } else if (/bigbasket/i.test(merchantName)) {
            merchantName = 'BigBasket';
        } else if (/amazon/i.test(merchantName)) {
            merchantName = 'Amazon Pay';
        } else if (/flipkart/i.test(merchantName)) {
            merchantName = 'Flipkart';
        } else if (/irctc/i.test(merchantName)) {
            merchantName = 'IRCTC';
        } else {
            // Strip common upi/pay prefix (e.g. upiswiggy -> Swiggy)
            merchantName = merchantName.replace(/^upi(?=[a-z]{3,})/i, '');
            // Strip trailing gateway and order numbers (e.g. 13195334 payu, rzp)
            merchantName = merchantName.replace(/\s+\d+\s*(?:payu|rzp|airtel)?$/i, '');
            merchantName = merchantName.charAt(0).toUpperCase() + merchantName.slice(1);
        }
    } else {
        merchantName = type === 'CREDIT' ? 'UPI Credit / Refund' : 'UPI Merchant';
    }

    // 5. Account Last 4 Digits (handles A/C XXXXXX0579 or A/C **1234)
    let accountLast4 = null;
    const accRegex = /(?:a\/c|acct|ac|card|account)\s*(?:no\.?)?\s*[*Xx]*(\d{3,5})/i;
    const accMatch = text.match(accRegex);
    if (accMatch) {
        accountLast4 = accMatch[1];
    }

    // 6. Bank Name
    const bankName = detectBank(text, sender);

    // 7. Auto Category
    const category = determineCategory(text, merchantName);

    // 8. Transaction Time (handles (2026:10:26 01:26:02), on 2026-10-21 12:08:53 PM, DD-MM-YYYY, etc.)
    let transactionTime = new Date();
    const bobDateMatch = text.match(/\((\d{4})[:/-](\d{1,2})[:/-](\d{1,2})\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?)\)/);
    const isoDateTimeMatch = text.match(/(?:on\s+)?(\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?(?:\s*[AP]M)?)?)/i);

    if (bobDateMatch) {
        const [_, y, m, d, t] = bobDateMatch;
        let [hh, mm, ss] = t.split(':').map(n => parseInt(n, 10));

        // Bank of Baroda formats timestamps in 12-hour clock without AM/PM (e.g. 01:28:31 for 1:28 PM)
        const now = new Date();
        const currentHour = now.getHours();

        // If transaction happened/arrived in afternoon/evening (>= 12) and hour is 1..11, resolve to PM
        if (hh < 12 && currentHour >= 12) {
            hh += 12;
        } else if (hh === 12 && currentHour < 12) {
            hh = 0;
        }

        const pad = (n) => String(n).padStart(2, '0');
        const parsed = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${pad(hh)}:${pad(mm)}:${pad(ss || 0)}`);
        if (!isNaN(parsed.getTime())) {
            transactionTime = parsed;
        }
    } else if (isoDateTimeMatch) {
        const parsed = new Date(isoDateTimeMatch[1]);
        if (!isNaN(parsed.getTime())) {
            transactionTime = parsed;
        }
    } else {
        const dateMatch = text.match(/(\d{1,2}[-/][A-Za-z0-9]{2,3}[-/]\d{2,4})/);
        if (dateMatch) {
            const parsedDate = new Date(dateMatch[1]);
            if (!isNaN(parsedDate.getTime())) {
                transactionTime = parsedDate;
            }
        }
    }

    return {
        upi_ref: upiRef,
        amount: amount,
        type: type,
        merchant_name: merchantName,
        merchant_vpa: merchantVpa,
        category: category,
        bank_name: bankName,
        account_last4: accountLast4,
        description: `${type === 'DEBIT' ? 'Paid to' : 'Received from'} ${merchantName} via UPI`,
        raw_message: text,
        transaction_time: transactionTime
    };
}

module.exports = {
    parseUpiMessage,
    determineCategory,
    detectBank,
    CATEGORY_RULES
};
