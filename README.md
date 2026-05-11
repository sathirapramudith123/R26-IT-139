<div align="center">

# 🌿 Lanka-Link

**Offline-First Digital Agency Banking & Smart Procurement Support System for Rural Micro-Merchants**

*IT4010 Research Proposal · BSc in Information Technology*

[![Status](https://img.shields.io/badge/Status-Research%20Prototype-green?style=for-the-badge)](.)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=for-the-badge&logo=next.js)](.)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%200.115-009688?style=for-the-badge&logo=fastapi)](.)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)](.)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](.)
[![ML](https://img.shields.io/badge/ML-scikit--learn-F7931E?style=for-the-badge&logo=scikitlearn)](.)

</div>

---

## 📌 Project Overview

**Lanka-Link** is a modular, offline-first digital platform designed for rural micro-merchants in Sri Lanka who currently manage their businesses using paper records and have no access to formal banking infrastructure or digital tools.

It addresses five real-world problems:

| Problem | Module that solves it |
|---|---|
| No financial records or accounting knowledge | Digital Financial Ledger |
| Stock-outs and no supplier visibility | Inventory & Supplier Management + ML Demand Forecasting |
| No access to banking services in rural areas | Simulated Agency Banking |
| Difficulty choosing the right supplier at the right price | Smart Procurement DSS + ML Price Analytics |
| Unreliable internet connectivity | Offline-first sync (IndexedDB) |

---

## 🧩 Four Research Modules

### Module 1 — Digital Financial Ledger 📒

Records all shop financial activity and automatically converts it into structured double-entry accounting entries — without requiring any accounting knowledge from the merchant.

- Income, expense, cash balance, and net profit updated in real time
- Double-entry journal auto-generated on every transaction (debit + credit)
- Trial balance verification — total debits always equal total credits
- Payment split breakdown by method (cash, QR, bank)
- Bill creation with quantity × unit price auto-calculation
- Auto inventory stock deduction on sale transactions
- PDF report export via ReportLab

---

### Module 2 — Offline Inventory & Supplier Management with ML Demand Forecasting 📦

Offline-first stock tracking with machine learning demand forecasting. Works without internet by storing operations in IndexedDB and syncing when connectivity is restored.

- Add, edit, and track all inventory items with reorder levels
- Auto low-stock notification when quantity falls below threshold
- Supplier register — merchant enters only what they know (name, item, unit price, delivery cost)
- **Supplier performance scores calculated automatically** — never manually entered:
  - Reliability score = completed orders ÷ total orders (builds from history)
  - Delivery score = on-time delivery rate from saved procurement decisions
  - New suppliers default to 50/100 neutral — fair from day one
- Offline sync queue — operations stored in IndexedDB and posted to `/sync/submit` on reconnect

#### ML Models in Module 2

| Model | Algorithm | Output |
|---|---|---|
| Demand Forecasting | Linear Regression (scikit-learn) | Average daily demand per item |
| Stock Runout Prediction | Linear Regression on daily sales | Days until stock runs out + predicted runout date |
| Reorder Recommendation | Demand × cover days formula | Exact quantity to order to cover next 14 days |

> **ML endpoint:** `GET /api/v1/inventory/ml/demand`
> **Data source:** Sale transactions with item_name and quantity fields from the ledger

> **Main Research Contribution** — offline-first architecture for low-connectivity rural environments + ML-driven proactive stock management

---

### Module 3 — Simulated Agency Banking 🏦

Authorised merchants act as rural banking touchpoints, processing basic financial services on behalf of a bank. All transactions validated against CBSL regulatory limits.

- 4 transaction types: cash deposit, cash withdrawal, fund transfer, balance inquiry
- Customer bank account number and bank name captured for each transaction
- Customer NIC field for KYC verification
- CBSL daily limits enforced: Deposit LKR 50,000 · Withdrawal LKR 25,000 · Transfer LKR 100,000
- Agent commission auto-calculated and posted to the ledger on every transaction
- Unique reference number and status tracking (pending / completed / failed)
- Role-restricted: only `bank_agent` and `admin` can access this module

> Bank agent accounts are created by an admin after the real bank verifies the merchant offline.

**Regulatory reference:** Central Bank of Sri Lanka, Direction No. 01 of 2021 on Mobile Payment Systems, Payment and Settlement Systems Department. Available at: https://www.cbsl.gov.lk

---

### Module 4 — Smart Procurement Decision Engine with ML Price Analytics 🛒

Two-layer decision support system combining a rule-based supplier scoring engine with machine learning price analytics from the Hector Kobbekaduwa Agrarian Research and Training Institute (HARTI).

#### Layer 1 — Rule-Based Supplier Scoring

Merchant enters what they need — the system scores all matching suppliers and returns a ranked list with a clear explanation.

| Criterion | Weight | How calculated |
|---|---|---|
| Cost score | 40% | Normalised against all active suppliers — lowest price = 100 |
| Profit score | 30% | (selling price × qty) − total cost, normalised |
| Reliability score | 20% | Built automatically from completed/total orders per supplier |
| Delivery score | 10% | On-time delivery rate from saved procurement decisions |

- Suppliers filtered by `item_name` — only suppliers who carry the requested item are scored
- New suppliers start at 50/100 neutral — scores improve automatically with every order
- Only 2 database calls regardless of supplier count — O(n) score computation in memory

#### Layer 2 — ML Price Analytics (HARTI Data)

Powered by 128 days of daily wholesale price bulletins (Jan 01 – May 08, 2026) from the Hector Kobbekaduwa Agrarian Research and Training Institute. Admin uploads PDFs — system auto-parses and stores structured price records.

| Model | Algorithm | Output |
|---|---|---|
| Price Prediction | Linear Regression (scikit-learn) | Next 4 weeks price forecast per commodity · R² score shown |
| Market Trend Analysis | 7-day and 14-day Moving Average | Rising / stable / falling trend per commodity |
| Demand Forecasting | Price Velocity Index | High / moderate / low demand signal · buy now or wait advice |
| Delivery Optimisation | K-Means Clustering (k=3, scikit-learn) | 3 market clusters by price level and volatility |
| Seasonal Price Patterns | Monthly Decomposition | Cheapest and most expensive month per commodity |
| Market Comparison | Cross-market Mean Price Analysis | Cheapest market per item · saving percentage |

> **Data:** 128 PDFs · 10 wholesale markets · 40+ commodities · 5,120+ price records
> **ML endpoint:** `GET /api/v1/ml/analytics`

All 6 models include a **"How this works"** transparency panel showing the algorithm, formula, data used, and confidence level — supporting the research claim of explainable, auditable decision support.

**HARTI data source:** Hector Kobbekaduwa Agrarian Research and Training Institute, Daily Wholesale Price Bulletin. Available at: https://www.harti.gov.lk

---

## 🤖 Machine Learning Summary

| Component | Model | Library | Data source |
|---|---|---|---|
| Module 2 | Linear Regression — demand forecasting | scikit-learn | Sale transactions |
| Module 2 | Stock runout prediction | scikit-learn | Sale transactions |
| Module 2 | Reorder quantity recommendation | Formula | Predicted demand |
| Module 4 | Linear Regression — price prediction | scikit-learn | HARTI daily PDFs |
| Module 4 | Moving Average — market trend | pandas | HARTI daily PDFs |
| Module 4 | K-Means — delivery optimisation | scikit-learn | HARTI daily PDFs |
| Module 4 | Price Velocity — demand signal | numpy | HARTI daily PDFs |
| Module 4 | Monthly decomposition — seasonal | pandas | HARTI daily PDFs |
| Module 4 | Cross-market comparison | pandas | HARTI daily PDFs |

---

## ⚙️ Technology Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| FastAPI | 0.115.0 | REST API framework |
| Python | 3.11 | Runtime |
| Motor | 3.5.1 | Async MongoDB driver |
| PyMongo | 4.8.0 | MongoDB sync driver |
| Pydantic | 2.9.2 | Data validation |
| pydantic-settings | 2.5.2 | Environment config |
| python-jose | 3.3.0 | JWT authentication |
| bcrypt | 4.2.0 | Password hashing |
| passlib | 1.7.4 | Password utilities |
| ReportLab | 4.2.2 | PDF report generation |
| pdfplumber | latest | HARTI PDF parsing |
| scikit-learn | 1.3.2 | ML models — Linear Regression, K-Means |
| pandas | 2.1.3 | Data processing and moving averages |
| numpy | 1.26.0 | Numerical computation |
| certifi | latest | Windows TLS fix for Atlas |
| python-dotenv | 1.0.1 | .env file loading |

### Frontend

| Technology | Purpose |
|---|---|
| Next.js 14 | React framework with server-side routing |
| React 18 | Component-based UI |
| Tailwind CSS | Utility-first styling |
| IndexedDB | Offline-first local storage |
| JWT (localStorage) | Authentication token storage |

---

## 👥 User Roles

| Role | How created | Access |
|---|---|---|
| **Merchant** | Default on register | Inventory, Ledger, Transactions, Suppliers, Procurement, Market Prices, Notifications |
| **Bank Agent** | Promoted by admin after bank verification | All merchant modules + Agency Banking |
| **Admin** | Register with `"role": "admin"` in body | Full access + User Management + Price Data Upload + System Dashboard |

> Suppliers are **data**, not user accounts. They are managed by merchants through the supplier module.

---

## 🚀 Setup Guide

### Prerequisites

```
Python 3.11+
Node.js 18+
MongoDB Atlas account (free tier)
```

### Backend

```bash
cd E:\project\backend\backend

# Activate virtual environment
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python run.py
```

Backend runs at: `http://localhost:8000`
Swagger docs at: `http://localhost:8000/docs`

### Frontend

```bash
cd E:\project\frontend

npm install

npm run dev
```

Frontend runs at: `http://localhost:3000`

### Environment Configuration (.env)

```env
APP_NAME=Lanka-Link Backend
APP_ENV=development
APP_HOST=127.0.0.1
APP_PORT=8000

MONGODB_URL=your-mongodb-atlas-connection-string
MONGODB_DB=lankalink

JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

> **Note:** The `lankalink` database is created automatically in MongoDB Atlas on first user registration. No manual setup needed.

### Uploading HARTI Price Data (required for ML analytics)

1. Log in as **admin**
2. Go to `/dashboard/admin/price-data`
3. Click **Drop all PDFs here** and select all daily price bulletin PDFs
4. System auto-detects format (daily or weekly) and parses all records
5. ML analytics activate automatically once data is uploaded

---

# File Tree: frontend

```
├── public
│   ├── icons
│   │   └── .gitkeep
│   ├── images
│   │   ├── .gitkeep
│   │   └── lankalinklogo.png
│   ├── logos
│   │   ├── .gitkeep
│   │   └── lankalinklogo.png
│   └── manifest.json
├── src
│   ├── app
│   │   ├── auth
│   │   │   ├── forgot-password
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   ├── login
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   ├── register
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   └── .gitkeep
│   │   ├── dashboard
│   │   │   ├── agency-banking
│   │   │   │   ├── [agencyId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── summary
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   ├── inventory
│   │   │   │   ├── [inventoryId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   ├── .gitkeep
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── alerts
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   ├── ledger
│   │   │   │   ├── [ledgerId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   ├── .gitkeep
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── journal
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── reports
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   ├── notifications
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   ├── procurement
│   │   │   │   ├── [procurementId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   ├── .gitkeep
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── .gitkeep
│   │   │   │   ├── AdminProcurementPage.jsx
│   │   │   │   ├── MerchantProcurementPage.jsx
│   │   │   │   └── page.jsx
│   │   │   ├── profile
│   │   │   │   └── page.jsx
│   │   │   ├── suppliers
│   │   │   │   ├── [supplierId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   ├── .gitkeep
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── compare
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   ├── transactions
│   │   │   │   ├── [transactionId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── history
│   │   │   │   │   ├── .gitkeep
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── .gitkeep
│   │   │   │   └── page.jsx
│   │   │   ├── .gitkeep
│   │   │   ├── layout.jsx
│   │   │   └── page.jsx
│   │   ├── .gitkeep
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.jsx
│   │   └── page.jsx
│   ├── components
│   │   ├── common
│   │   │   ├── EmptyState.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ModuleNavigation.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── PageHeader.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── dashboard
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminPriceUploadWidget.jsx
│   │   │   ├── BankAgentDashboard.jsx
│   │   │   ├── MLAnalyticsWidget.jsx
│   │   │   ├── MarketPriceWidget.jsx
│   │   │   └── MerchantDashboard.jsx
│   │   ├── forms
│   │   │   ├── .gitkeep
│   │   │   ├── AgencyBankingForm.jsx
│   │   │   ├── AuthForm.jsx
│   │   │   ├── FormField.jsx
│   │   │   ├── InventoryForm.jsx
│   │   │   ├── LedgerForm.jsx
│   │   │   ├── ProcurementForm.jsx
│   │   │   ├── SupplierForm.jsx
│   │   │   └── TransactionForm.jsx
│   │   ├── inventory
│   │   │   ├── .gitkeep
│   │   │   ├── InventoryCard.jsx
│   │   │   └── InventoryTable.jsx
│   │   ├── ledger
│   │   │   ├── .gitkeep
│   │   │   ├── JournalTable.jsx
│   │   │   ├── LedgerCard.jsx
│   │   │   └── LedgerTable.jsx
│   │   ├── notifications
│   │   │   ├── .gitkeep
│   │   │   ├── NotificationCard.jsx
│   │   │   └── NotificationList.jsx
│   │   ├── procurement
│   │   │   ├── .gitkeep
│   │   │   ├── ProcurementCard.jsx
│   │   │   ├── ProcurementTable.jsx
│   │   │   ├── RecommendationPanel.jsx
│   │   │   └── SupplierRecommendationTable.jsx
│   │   ├── suppliers
│   │   │   ├── .gitkeep
│   │   │   ├── SupplierCard.jsx
│   │   │   └── SupplierTable.jsx
│   │   ├── transactions
│   │   │   ├── .gitkeep
│   │   │   ├── TransactionCard.jsx
│   │   │   └── TransactionTable.jsx
│   │   └── ui
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Input.jsx
│   │       ├── Select.jsx
│   │       └── Table.jsx
│   ├── hooks
│   │   ├── .gitkeep
│   │   ├── useAgencyBanking.js
│   │   ├── useAuth.js
│   │   ├── useAuthGuard.js
│   │   ├── useDashboard.js
│   │   ├── useInventory.js
│   │   ├── useJournal.js
│   │   ├── useLedger.js
│   │   ├── useNotifications.js
│   │   ├── useProcurement.js
│   │   ├── useSuppliers.js
│   │   └── useTransactions.js
│   ├── lib
│   │   ├── auth
│   │   │   └── authHelpers.js
│   │   ├── constants
│   │   │   └── index.js
│   │   ├── formatters
│   │   │   └── index.js
│   │   ├── helpers
│   │   │   └── index.js
│   │   ├── validators
│   │   │   └── index.js
│   │   ├── agencyBankingLinks.js
│   │   ├── constants.js
│   │   ├── inventoryLinks.js
│   │   ├── ledgerLinks.js
│   │   └── procurementLinks.js
│   ├── services
│   │   ├── api
│   │   │   ├── .gitkeep
│   │   │   ├── agencyBanking.api.js
│   │   │   ├── auth.api.js
│   │   │   ├── client.js
│   │   │   ├── dashboard.api.js
│   │   │   ├── inventory.api.js
│   │   │   ├── journal.api.js
│   │   │   ├── ledger.api.js
│   │   │   ├── notification.api.js
│   │   │   ├── priceData.api.js
│   │   │   ├── procurement.api.js
│   │   │   ├── supplier.api.js
│   │   │   └── transaction.api.js
│   │   ├── auth
│   │   │   └── tokenService.js
│   │   ├── storage
│   │   │   └── indexedDb.js
│   │   └── sync
│   │       └── syncManager.js
│   ├── store
│   │   ├── .gitkeep
│   │   ├── authStore.js
│   │   ├── inventoryStore.js
│   │   ├── ledgerStore.js
│   │   ├── notificationStore.js
│   │   ├── procurementStore.js
│   │   ├── supplierStore.js
│   │   └── transactionStore.js
│   ├── styles
│   │   └── index.css
│   └── middleware.js
├── .eslintrc.json
├── .gitignore
├── .gitkeep
├── README.md
├── jsconfig.json
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
└── tailwind.config.js
```

# File Tree: backend


```
├── app
│   ├── api
│   │   ├── v1
│   │   │   ├── endpoints
│   │   │   │   ├── .gitkeep
│   │   │   │   ├── __init__.py
│   │   │   │   ├── agency_banking_routes.py
│   │   │   │   ├── auth_routes.py
│   │   │   │   ├── dashboard_routes.py
│   │   │   │   ├── inventory_routes.py
│   │   │   │   ├── journal_routes.py
│   │   │   │   ├── ledger_routes.py
│   │   │   │   ├── ml_routes.py
│   │   │   │   ├── notification_routes.py
│   │   │   │   ├── price_data_routes.py
│   │   │   │   ├── procurement_routes.py
│   │   │   │   ├── supplier_routes.py
│   │   │   │   ├── sync_routes.py
│   │   │   │   └── transaction_routes.py
│   │   │   ├── .gitkeep
│   │   │   ├── __init__.py
│   │   │   └── router.py
│   │   ├── .gitkeep
│   │   ├── __init__.py
│   │   └── deps.py
│   ├── core
│   │   ├── .gitkeep
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models
│   │   ├── .gitkeep
│   │   ├── __init__.py
│   │   ├── agency_banking_model.py
│   │   ├── inventory_model.py
│   │   ├── journal_model.py
│   │   ├── ledger_model.py
│   │   ├── notification_model.py
│   │   ├── procurement_model.py
│   │   ├── supplier_model.py
│   │   ├── sync_model.py
│   │   ├── transaction_model.py
│   │   └── user_model.py
│   ├── repositories
│   │   ├── .gitkeep
│   │   ├── __init__.py
│   │   ├── agency_banking_repository.py
│   │   ├── inventory_repository.py
│   │   ├── journal_repository.py
│   │   ├── ledger_repository.py
│   │   ├── notification_repository.py
│   │   ├── price_data_repository.py
│   │   ├── procurement_repository.py
│   │   ├── supplier_repository.py
│   │   ├── sync_repository.py
│   │   ├── transaction_repository.py
│   │   └── user_repository.py
│   ├── schemas
│   │   ├── .gitkeep
│   │   ├── __init__.py
│   │   ├── agency_banking_schema.py
│   │   ├── auth_schema.py
│   │   ├── inventory_schema.py
│   │   ├── journal_schema.py
│   │   ├── ledger_schema.py
│   │   ├── notification_schema.py
│   │   ├── procurement_schema.py
│   │   ├── supplier_schema.py
│   │   └── transaction_schema.py
│   ├── services
│   │   ├── .gitkeep
│   │   ├── __init__.py
│   │   ├── agency_banking_service.py
│   │   ├── auth_service.py
│   │   ├── dashboard_service.py
│   │   ├── inventory_ml_service.py
│   │   ├── inventory_service.py
│   │   ├── journal_service.py
│   │   ├── ledger_service.py
│   │   ├── ml_service.py
│   │   ├── notification_service.py
│   │   ├── price_data_service.py
│   │   ├── procurement_service.py
│   │   ├── supplier_service.py
│   │   ├── sync_service.py
│   │   └── transaction_service.py
│   ├── utils
│   │   ├── .gitkeep
│   │   ├── __init__.py
│   │   └── helpers.py
│   ├── .gitkeep
│   ├── __init__.py
│   └── main.py
├── .gitignore
├── .gitkeep
├── README.md
├── requirements.txt
└── run.py
```

---

## 🔌 API Reference

### Authentication

```
POST   /api/v1/auth/register          Create account (role field optional)
POST   /api/v1/auth/login             Login — returns JWT with role + actual_role
POST   /api/v1/auth/switch-role       Switch session role (no password needed)
GET    /api/v1/auth/me                Get current user info
GET    /api/v1/auth/users             List all users (admin only)
PUT    /api/v1/auth/users/{id}/role   Promote/demote user (admin only)
```

### Ledger & Transactions

```
GET    /api/v1/ledger                 List entries
POST   /api/v1/ledger                 Create entry
GET    /api/v1/ledger/summary         Income, expense, profit, cash balance
GET    /api/v1/ledger/payment-split   Breakdown by payment method
GET    /api/v1/ledger/export/pdf      PDF report
GET    /api/v1/journal                Journal entries
GET    /api/v1/journal/trial-balance  Trial balance
POST   /api/v1/transactions           Create transaction (auto-deducts inventory)
GET    /api/v1/transactions           List transactions
```

### Inventory & Suppliers

```
GET    /api/v1/inventory              List items
POST   /api/v1/inventory              Add item
PUT    /api/v1/inventory/{id}         Update item
DELETE /api/v1/inventory/{id}         Delete item
GET    /api/v1/inventory/ml/demand    ML demand forecast + reorder recommendations
GET    /api/v1/suppliers              List suppliers
POST   /api/v1/suppliers              Add supplier
PUT    /api/v1/suppliers/{id}         Update supplier
DELETE /api/v1/suppliers/{id}         Delete supplier
POST   /api/v1/sync/submit            Submit offline queue on reconnect
GET    /api/v1/sync/status            Check sync status
```

### Agency Banking (bank_agent + admin only)

```
GET    /api/v1/agency-banking         List transactions
POST   /api/v1/agency-banking         Create transaction (CBSL limit enforced)
PUT    /api/v1/agency-banking/{id}    Update transaction
DELETE /api/v1/agency-banking/{id}    Delete transaction
GET    /api/v1/agency-banking/summary Daily volume and commission totals
```

### Procurement DSS

```
POST   /api/v1/procurement/recommend  Run supplier scoring — returns ranked list
GET    /api/v1/procurement            List saved decisions
POST   /api/v1/procurement            Save a decision
PUT    /api/v1/procurement/{id}       Update decision
DELETE /api/v1/procurement/{id}       Delete decision
```

### ML Price Analytics

```
GET    /api/v1/ml/analytics           Full analytics — all 6 ML models
GET    /api/v1/ml/predict/{item}      Price prediction for a single item
GET    /api/v1/ml/summary             Data summary — date range, item count
GET    /api/v1/ml/export/csv          Download all price data as CSV (admin)
POST   /api/v1/price-data/upload      Upload HARTI PDF — auto-parsed
GET    /api/v1/price-data/latest      Latest price data per item
GET    /api/v1/price-data/export/csv  Export price data as CSV
```

---

## 🔐 Security

- **Server-side guard** — `middleware.js` intercepts all `/dashboard/*` routes before rendering
- **Client-side guard** — `useAuthGuard()` hook on all dashboard pages
- **API guard** — `require_bank_agent` on agency banking, `require_admin` on user management
- **JWT** — tokens carry both `role` (session) and `actual_role` (database) to support role switching
- **CBSL enforcement** — transaction limits validated on every agency banking request

---

## 📊 Research Claims

| Claim | How it is met |
|---|---|
| Offline-first for low connectivity | IndexedDB + syncManager.js + POST /sync/submit |
| No accounting knowledge needed | Double-entry posted automatically — merchant sees income/expense only |
| ML-powered demand forecasting | Linear Regression on sale transactions predicts stock runout per item |
| ML-powered price analytics | 6 models on 128 days of HARTI government wholesale price data |
| Explainable ML recommendations | Every model shows algorithm, formula, R² score, and confidence level |
| CBSL-aligned agency banking | Per-transaction limits enforced front and back |
| Supplier reliability grows over time | Auto-built from completed/total orders — never manually entered |
| Transparent supplier scoring | score_breakdown returned with every recommendation |

---

## 🌍 CORS Configuration

```python
# main.py
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]
```

---

## 🔮 Future Enhancements

- Real bank API integration (beyond simulated agency banking)
- Mobile app (React Native)
- Fraud / anomaly detection for agency banking (requires labelled transaction data)
- Cash flow forecasting for the ledger (requires 6+ months of transaction history)
- ARIMA time-series forecasting (requires 30+ weeks of HARTI data)
- Multi-language support (Sinhala, Tamil)

---

## 👨‍💻 Development Team

| Member | GitHub |
|---|---|
| Team Member 1 | [@MaheshaJayaruwani](https://github.com/MaheshaJayaruwani) |
| Team Member 2 | [@ParameeAponsu](https://github.com/ParameeAponsu) |
| Team Member 3 | [@Leshvi](https://github.com/Leshvi) |
| Team Member 4 | [@sathirapramudith123](https://github.com/sathirapramudith123) |

---

## 📜 License

This project is developed for academic research purposes only as part of an undergraduate BSc in Information Technology programme.

---

<div align="center">
🌱 Built for real-world impact in rural Sri Lanka
</div>
