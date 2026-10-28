-- =======================================================
-- UPI Payment Tracker PostgreSQL Schema
-- =======================================================

-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    monthly_budget NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    upi_ref VARCHAR(100) UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    type VARCHAR(10) NOT NULL DEFAULT 'DEBIT', -- 'DEBIT' or 'CREDIT'
    merchant_name VARCHAR(150),
    merchant_vpa VARCHAR(100),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    category VARCHAR(50) DEFAULT 'Others',
    bank_name VARCHAR(80),
    account_last4 VARCHAR(10),
    description TEXT,
    raw_message TEXT,
    source VARCHAR(30) DEFAULT 'MANUAL', -- 'SMS_WEBHOOK', 'EMAIL_SYNC', 'STATEMENT_IMPORT', 'MANUAL', 'SIMULATOR'
    transaction_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Index for fast date-range queries & analytics
CREATE INDEX IF NOT EXISTS idx_trans_time ON transactions(transaction_time DESC);
CREATE INDEX IF NOT EXISTS idx_trans_cat ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_trans_type ON transactions(type);

-- Create User Settings / Budget configuration
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    monthly_budget NUMERIC(12, 2) DEFAULT 25000.00,
    salary_date INTEGER DEFAULT 1,
    currency VARCHAR(10) DEFAULT 'INR',
    wishlist_name VARCHAR(100) DEFAULT 'Goa Flight / Weekend Trip',
    wishlist_target NUMERIC(12, 2) DEFAULT 6000.00,
    email_sync_active BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Safe migrations for existing databases
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS wishlist_name VARCHAR(100) DEFAULT 'Goa Flight / Weekend Trip';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS wishlist_target NUMERIC(12, 2) DEFAULT 6000.00;

-- Create Sync Logs Table
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    imported_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Categories if empty
INSERT INTO categories (name, icon, color, keywords, monthly_budget)
VALUES
    ('Food & Dining', 'utensils', '#f97316', ARRAY['swiggy', 'zomato', 'mcdonalds', 'kfc', 'burger', 'starbucks', 'cafe', 'restaurant', 'dhaba', 'biryani', 'tea', 'chai', 'coffee', 'dosa', 'bakery', 'pizza', 'dominos', 'eatclub'], 8000.00),
    ('Groceries & Essentials', 'shopping-cart', '#10b981', ARRAY['blinkit', 'zepto', 'instamart', 'bigbasket', 'dmart', 'kirana', 'supermarket', 'grofers', 'milk', 'vegetable', 'fruit', 'provision', 'spencer'], 6000.00),
    ('Shopping & E-Commerce', 'shopping-bag', '#8b5cf6', ARRAY['amazon', 'flipkart', 'myntra', 'meesho', 'nykaa', 'ajio', 'tata cliq', 'zara', 'h&m', 'retail', 'clothing', 'electronics', 'croma'], 4000.00),
    ('Bills & Utilities', 'zap', '#eab308', ARRAY['bescom', 'electricity', 'power', 'water', 'gas', 'airtel', 'jio', 'vi', 'vodafone', 'broadband', 'wifi', 'recharge', 'dth', 'tata play', 'postpaid', 'bill'], 3000.00),
    ('Travel & Commute', 'car', '#06b6d4', ARRAY['uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'diesel', 'iocl', 'bpcl', 'hpcl', 'irctc', 'railway', 'toll', 'fastag', 'makemytrip', 'indigo', 'flight'], 3500.00),
    ('Entertainment & Subs', 'tv', '#ec4899', ARRAY['netflix', 'spotify', 'hotstar', 'prime video', 'youtube', 'bookmyshow', 'pvr', 'inox', 'movie', 'cinema', 'game', 'playstation', 'steam', 'audible'], 1500.00),
    ('Health & Wellness', 'heart-pulse', '#ef4444', ARRAY['apollo', 'pharmeasy', '1mg', 'pharmacy', 'chemist', 'hospital', 'clinic', 'doctor', 'lab', 'gym', 'cult.fit', 'fitness', 'medplus'], 2000.00),
    ('Transfers & Rent', 'arrow-left-right', '#3b82f6', ARRAY['rent', 'deposit', 'house', 'landlord', 'maid', 'cook', 'transfer', 'sent to', 'p2p'], 15000.00),
    ('Others & General', 'help-circle', '#64748b', ARRAY['misc', 'general', 'atm', 'cash', 'fee'], 2000.00)
ON CONFLICT (name) DO NOTHING;

-- Seed Default User Settings if not present
INSERT INTO user_settings (id, monthly_budget, salary_date, currency)
VALUES (1, 30000.00, 1, 'INR')
ON CONFLICT (id) DO NOTHING;
