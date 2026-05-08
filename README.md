<div align="center">

# 🌿 Lanka-Link

**Offline-First Digital Agency Banking & Smart Procurement Support System for Rural Micro-Merchants**

*IT4010 Research Proposal · BSc in Information Technology*

[![Status](https://img.shields.io/badge/Status-Research%20Prototype-green?style=for-the-badge)](.)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=for-the-badge&logo=next.js)](.)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%200.115-009688?style=for-the-badge&logo=fastapi)](.)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)](.)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](.)

</div>

---

## 📌 Project Overview

**Lanka-Link** is a modular, offline-first digital platform designed for rural micro-merchants in Sri Lanka who currently manage their businesses using paper records and have no access to formal banking infrastructure or digital tools.

It addresses five real-world problems:

| Problem | Module that solves it |
|---|---|
| No financial records or accounting knowledge | Digital Financial Ledger |
| Stock-outs and no supplier visibility | Inventory & Supplier Management |
| No access to banking services in rural areas | Simulated Agency Banking |
| Difficulty choosing the right supplier | Smart Procurement DSS |
| Unreliable internet connectivity | Offline-first sync (IndexedDB) |

---

## 🧩 Four Research Modules

### Module 1 — Digital Financial Ledger 📒

Records all shop financial activity and automatically converts it into structured double-entry accounting entries — without requiring any accounting knowledge from the merchant.

- Income, expense, cash balance, and net profit updated in real time
- Double-entry journal auto-generated on every transaction (debit + credit)
- Trial balance verification — total debits always equal total credits
- Payment split breakdown by method (cash, QR, bank)
- PDF report export via ReportLab

---

### Module 2 — Offline Inventory & Supplier Management 📦

Offline-first stock tracking. Works without internet by storing operations in IndexedDB and syncing when connectivity is restored.

- Add, edit, and track all inventory items with reorder levels
- Auto low-stock notification when quantity falls below threshold
- Supplier register with contact details, pricing, and delivery information
- Supplier performance scores calculated **automatically** — merchant enters facts only (unit price, delivery date, available quantity)
- Offline sync queue — operations stored in IndexedDB and posted to `/sync/submit` on reconnect

> **Main Research Contribution** — offline-first architecture for low-connectivity rural environments

---

### Module 3 — Simulated Agency Banking 🏦

Authorised merchants act as rural banking touchpoints, processing basic financial services on behalf of a bank. All transactions validated against CBSL regulatory limits.

- 4 transaction types: cash deposit, cash withdrawal, fund transfer, balance inquiry
- CBSL daily limits enforced: Deposit LKR 50,000 · Withdrawal LKR 25,000 · Transfer LKR 100,000
- Agent commission auto-calculated and posted to the ledger on every transaction
- Unique reference number and status tracking (pending / completed / failed)
- Role-restricted: only `bank_agent` and `admin` can access this module

> Bank agent accounts are created by an admin after the real bank verifies the merchant offline.

---

### Module 4 — Smart Procurement Decision Engine 🛒

Rule-based decision support system. Merchant enters what they need — the system scores all suppliers automatically and returns a ranked list with a clear explanation of why each supplier is recommended.

**No machine learning** — pure weighted arithmetic. scikit-learn, numpy, and pandas are intentionally excluded.

| Criterion | Weight | How calculated |
|---|---|---|
| Cost (price score) | 40% | Relative to all active suppliers — lowest price = 100 |
| Profit margin | 30% | (selling price × qty) − total cost, normalised |
| Reliability | 20% | Past completed orders +10, cancelled −15, new suppliers default 70 |
| Delivery speed | 10% | Estimated delivery date vs required date, relative |

Each result includes a `score_breakdown` field that explains exactly why a supplier is ranked where it is — supporting the research claim of explainable, auditable procurement decisions.

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
| certifi | latest | Windows TLS fix for Atlas |
| python-dotenv | 1.0.1 | .env file loading |

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 | React framework with server-side routing |
| React 18 | Component-based UI |
| Tailwind CSS | Utility-first styling |
| IndexedDB | Offline-first local storage |
| JWT (localStorage + cookie) | Authentication token storage |

---

## 👥 User Roles

| Role | How created | Access |
|---|---|---|
| **Merchant** | Default on register | Inventory, Ledger, Transactions, Suppliers, Procurement, Notifications |
| **Bank Agent** | Promoted by admin after bank verification | All merchant modules + Agency Banking |
| **Admin** | Register with `"role": "admin"` in body | Full access + User Management + System Dashboard |

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

# Configure environment
# Edit .env with your MongoDB Atlas connection string (see below)

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

MONGODB_URL= monogo db atlas URL
MONGODB_DB=lankalink

JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES= 
```

> **Note:** The `lankalink` database is created automatically in MongoDB Atlas on first user registration. No manual setup needed.

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

### Ledger

```
GET    /api/v1/ledger                 List entries
POST   /api/v1/ledger                 Create entry
PUT    /api/v1/ledger/{id}            Update entry
DELETE /api/v1/ledger/{id}            Delete entry
GET    /api/v1/ledger/summary         Income, expense, profit, cash balance
GET    /api/v1/ledger/payment-split   Breakdown by payment method
GET    /api/v1/ledger/export/pdf      PDF report
GET    /api/v1/journal                Journal entries
GET    /api/v1/journal/trial-balance  Trial balance
```

### Inventory & Suppliers

```
GET    /api/v1/inventory              List items
POST   /api/v1/inventory              Add item (triggers low-stock check)
PUT    /api/v1/inventory/{id}         Update item
DELETE /api/v1/inventory/{id}         Delete item
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
GET    /api/v1/procurement            List procurement decisions
POST   /api/v1/procurement            Save decision (audit trail)
PUT    /api/v1/procurement/{id}       Update decision
DELETE /api/v1/procurement/{id}       Delete decision
POST   /api/v1/procurement/recommend  Run DSS — returns ranked supplier list
```

---

## 🔐 Security

- **Server-side guard** — `middleware.js` intercepts all `/dashboard/*` routes before rendering
- **Client-side guard** — `useAuthGuard()` hook on all 34 dashboard pages
- **API guard** — `require_bank_agent` on agency banking, `require_admin` on user management
- **JWT** — tokens carry both `role` (session) and `actual_role` (database) to support role switching
- **CBSL enforcement** — daily transaction limits validated on every agency banking request

---

## 📊 Research Claims

| Claim | How it is met |
|---|---|
| Offline-first for low connectivity | IndexedDB storage + syncManager.js + POST /sync/submit |
| No accounting knowledge needed | Double-entry posted automatically — merchant sees only income/expense |
| Rule-based DSS — no ML | No scikit-learn, numpy, or pandas in requirements |
| Explainable recommendations | `score_breakdown` field returned with every recommendation |
| CBSL-aligned agency banking | Per-transaction and daily limits enforced front and back |
| Reliability grows over time | Reliability score built from past completed order history |

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
- Real-time market price data feed
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
