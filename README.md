# ⚡ UPI Flow - Automated UPI Payment Tracker & Habit Analytics

A full-stack, completely free financial web application built with **PostgreSQL**, **Express (Node.js)**, and a **modern glassmorphic fintech design**.

Automatically tracks your UPI debit and credit alerts, visualizes your spending habits, predicts future month-end expenses based on your daily burn rate, and delivers algorithmic savings tips.

---

## 🌟 Key Features

### 1. Automated UPI Payment Tracking (100% Free)
- **Real-Time Android SMS Webhook**:
  - Endpoint: `POST http://localhost:5000/api/webhook/sms`
  - Works with free Android automation apps (**MacroDroid**, **Tasker**, or **SMS Forwarder**).
  - Listens to incoming bank debit alerts (HDFC, SBI, ICICI, Axis, Kotak, PhonePe, Google Pay, Paytm) and pushes them instantly to the server.
- **Automated Bank Email IMAP Sync**:
  - Automated recurring sync using Gmail App Passwords (no paid API keys).
  - Periodically scans inbox for bank debit emails, extracts UPI Ref / UTR, amount, and payee, and auto-categorizes them.
- **Bank Statement CSV / Text Import**:
  - Drag-and-drop monthly bank statements to import past transactions in bulk.
- **Live UPI Simulator**:
  - Test runner built right into the UI to simulate live alerts from any Indian bank.

### 2. Spend Forecast & Run-Rate Projections
- **"If you continue at your current pace..."**:
  - Computes real-time **Daily Burn Rate** ($\text{Total Spent} / \text{Days Elapsed}$).
  - Forecasts **Projected Month-End Spend** ($\text{Daily Burn Rate} \times \text{Days in Month}$).
  - Compares forecast against your monthly budget with a dynamic variance meter (+₹/under budget).
  - Calculates **Target Daily Cap** for remaining days so you never accidentally overshoot your budget.

### 3. Spending Habits & Visual Analytics
- **Category Breakdown**: Interactive donut chart mapping your flow of money (Food & Dining, Groceries, Shopping, Travel, Bills, Entertainment, Health, Transfers).
- **Daily Spending Curve**: Smooth area chart tracking day-by-day spikes.
- **Time-of-Day Pattern**: Pinpoints whether you spend most in the Morning, Afternoon, Evening, or Late Night.
- **Micro-transaction Tracker**: Identifies and tallies quick QR code scans under ₹100 (chai, snacks, sodas) that secretly drain budgets.
- **Weekend Surge Analysis**: Calculates weekend inflation multiplier (e.g. 1.8x higher daily spend on Saturdays/Sundays).
- **Subscription Detector**: Automatically identifies recurring monthly services like Netflix, Spotify, Gym, broadband, etc.

### 4. Smart Tips & Actionable Financial Insights
- **Budget Overrun Warning**: Warns when your burn rate exceeds budget and provides exact daily reduction targets.
- **Category Domination**: Flags when a single category eats up >35% of total spend and calculates potential savings.
- **Night-Time Impulse Alerts**: Flags late-night food deliveries or shopping spree spikes between 9 PM and 6 AM.
- **Micro-Transaction Awareness**: Calculates how much you can save by setting a fixed weekly snack allowance.

---

## 🛠️ Technology Stack

- **Backend**: Node.js & Express
- **Database**: PostgreSQL 18 (Local instance)
- **Database Client**: `pg` (Connection Pooling, Auto-DB creation, resilient memory-fallback)
- **Frontend**: Vanilla CSS Design System with dark fintech aesthetics, Chart.js, Lucide Icons, Google Fonts (Outfit, Inter, JetBrains Mono)
- **Zero Third-Party Paid APIs**: Completely free and private.

---

## 🚀 Quick Start Guide

### 1. Configure PostgreSQL
1. Open [`.env`](file:///d:/PaymentTracker/.env) in the root directory.
2. Replace `your_postgres_password_here` with your PostgreSQL password:
   ```env
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=payment_tracker
   PGUSER=postgres
   PGPASSWORD=your_actual_password
   ```
3. The server will automatically create the `payment_tracker` database and initialize all tables and seed categories!

### 2. Run Server
```bash
npm start
```
Open your browser at: **[http://localhost:5000](http://localhost:5000)**

### 3. Test Immediately with Demo Data
Click **"Load Demo Data"** in the top navigation bar to populate 25 realistic Indian UPI payments (Swiggy, Blinkit, Uber, chai tapris, Netflix, Rent, electricity bills) and explore the charts, forecasts, and tips!
