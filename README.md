<div align="center">

# 🌿 SMART MERCHANT SUPPORT PLATFORM FOR AGENCY BANKING AND PROCUREMENT

**A Digital Platform with Explainable Machine Learning for Rural Sri Lankan Micro-Merchants**

*IT4010 Research Project · BSc (Hons) in Information Technology · Project R26-IT-139*

![Web](https://img.shields.io/badge/Web-Next.js%2015-black?style=for-the-badge&logo=next.js)
![Mobile](https://img.shields.io/badge/Mobile-Flutter-02569B?style=for-the-badge&logo=flutter)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js)
![Database](https://img.shields.io/badge/DB-Supabase-3ECF8E?style=for-the-badge&logo=supabase)
![ML](https://img.shields.io/badge/ML-FastAPI%20%2B%20SHAP-009688?style=for-the-badge&logo=fastapi)

</div>

## Lanka-Link

A digital tool that helps small Sri Lankan shop owners ("kade" owners) and agency-banking agents run
their business — with AI that explains its advice in plain language.

---

## What is this? (In simple words)

Many small shop owners in rural Sri Lanka run their whole business **on paper**. They have no records,
no easy access to banking, and no way to know if a bank will give them a loan.

**Lanka-Link** is an app (on **web and mobile**) that helps them:

- Keep records of **sales, stock, suppliers and purchases**
- Do **banking for their customers** (deposits, withdrawals, transfers) as an agent
- Get **AI advice** — and the AI always shows **why** it gave that advice

---

## The 4 problems it solves

| The shop owner's problem | What the app does |
|---|---|
| "I have no records, so no bank will give me a loan." | Tracks sales and gives an **AI credit-readiness score** and a loan limit |
| "I keep running out of stock — or have too much." | **AI forecasts next week's sales** per item and sets when to restock |
| "I don't know the best time to buy." | **AI tells you whether prices are likely to rise** (buy now) or not (wait) |
| "How do I spot a suspicious transaction?" | **AI flags unusual banking activity** for the agent to check |

Each AI answer comes with the **factors that pushed it up or down**, so the shop owner can trust it.

---

## What's inside the app? (The modules)

| Module | What it does |
|---|---|
| **Dashboard** | Income, expenses, profit and stock at a glance |
| **Transactions** | Record every sale, purchase and expense |
| **Journal & Reports** | Double-entry ledger (debit / credit), goods movement and profit & loss, PDF reports |
| **Inventory** | Stock in FIFO batches, low-stock alerts, delivery lead time per item |
| **Suppliers** | Suppliers, the items they carry, and their location on a map |
| **Procurement** | Purchase orders — the app ranks suppliers by items covered, price and distance |
| **Agency Banking** | Deposits / withdrawals / transfers for customers, with CBSL daily limits |
| **My Banks** | Float account per partner bank and the shared cash pool |
| **Predictions** | All 4 AI insights in one place, each with its reasons |

---

## How the parts connect

```
Sales, purchases, stock and banking (one digital ledger)
        │
        ├──► Demand forecast (units next week) ──► Reorder point (lead time + safety stock) ──► Buy / Wait
        │                                                       ▲
        │                                    Procurement model: "good price now / prices may improve"
        ├──► Credit readiness (stock-outs, margin, digital payments, time in business)
        └──► Anomaly check on each banking transaction
```

What a shop records once feeds every insight: the demand forecast decides when to restock, and steady
stock improves the credit score.

---

## The AI (Machine Learning) — explained simply

The app has **4 AI models**. For each one, five algorithms were compared (Logistic Regression, Decision
Tree, Random Forest, Gradient Boosting, XGBoost); the winner was chosen by **cross-validation on the
training data only** and then tested **once** on data it had never seen. Every model is also compared
with **simple rules or naive forecasts**, with bootstrap confidence intervals, so the value of the AI is
measured honestly.

| Model | Answers | Algorithm | Key result |
|---|---|---|---|
| **Credit readiness** | "Is this shop ready for a loan?" | Logistic Regression | ROC-AUC 0.839 (99.9 % of the best possible on this data); better than bank rules (F1 0.75 vs 0.68) |
| **Weekly demand forecast** | "How many units will sell next week?" | Random Forest | 21.7 % lower error than "same as last week"; 64 % lower right after Avurudu |
| **Procurement (buy now / wait)** | "Will the price rise in 4 weeks?" | Random Forest | ROC-AUC 0.795 on future weeks; following it saves about 2.2 % of the purchase bill |
| **Banking anomaly detection** | "Is this transaction unusual?" | XGBoost (+ Isolation Forest input) | Threshold 0.87 cuts false alarms from 136 to 19 per 1,000 honest customers |

What the app does with them:

- **Credit:** score 0–100 → approved (≥ 70), conditional (50–69, loan capped at LKR 250,000) or rejected;
  hard blocks for debt-to-income above 85 % or under 3 months in business. Loan limit = **3.5 × monthly net
  cash flow**.
- **Demand:** next week's units per item; the **reorder point** = forecast × lead time + safety stock
  (1.65 × forecast error × √lead time) decides Buy / Wait.
- **Procurement:** adds price context to Buy / Wait ("Good price right now" / "Prices may improve soon").
- **Anomaly:** flags a transaction for the agent to verify. CBSL limits are **enforced** (over-limit
  transactions are refused), and the model detects what the limits cannot.

**The research contribution:** explainable decision support for micro-merchants, evaluated honestly —
time-based testing for time-series data, comparison with simple rules, and clear limits on what the
results claim. Details, charts and code for each model: [`ML model/README.md`](ML%20model/README.md)
(one notebook and one model card per model).

---

## How the app is built (The 4 parts)

- **Web + Mobile app** — what the shop owner sees and touches
- **Backend** — checks logins, applies the business rules and moves data
- **ML service** — a separate Python program that runs the 4 models and explains each prediction
- **Database** — Supabase (PostgreSQL), including SQL functions that run each banking operation as one transaction

The web and mobile apps never talk to the ML service directly: every request goes through the backend,
which checks the login and builds the model inputs from the shop's own data.

| Folder | What it is | README |
|---|---|---|
| `frontend/` | Web app (Next.js) | [frontend/README.md](frontend/README.md) |
| `mobile app/` | Android app (Flutter) | [mobile app/README.md](mobile%20app/README.md) |
| `backend/` | REST API (Node.js + Express) | [backend/README.md](backend/README.md) |
| `ml_service/` | ML API (FastAPI) | [ml_service/README.md](ml_service/README.md) |
| `ML model/` | Datasets, training notebooks, model cards | [ML model/README.md](ML%20model/README.md) |

---

## What technology is used?

| Part | Technology |
|---|---|
| **Web app** | Next.js 15 (React) + Tailwind CSS |
| **Mobile app** | Flutter (Dart) |
| **Backend** | Node.js + Express, Joi validation |
| **Database** | Supabase (PostgreSQL) |
| **ML service** | Python + FastAPI |
| **Machine learning** | scikit-learn, XGBoost, pandas; SHAP for explanations |
| **Login security** | JWT (8-hour sessions), bcrypt password hashing, login rate limiting |
| **Maps** | Google Maps (web and mobile) |
| **Code style** | Prettier (JS), Black (Python), dart format |

---

## How to run it (Setup)

You need: **Node.js 18+**, **Python 3.11+**, **Flutter SDK**, and a **Supabase project**.

**1. Database** — in the Supabase SQL Editor run `backend/schema.sql`, then `backend/sql/atomic_banking.sql`.

**2. ML service**
```bash
cd ml_service
pip install -r requirements.txt
python -m uvicorn app:app --port 8000
```

**3. Backend** — create `backend/.env` (keys listed in [backend/README.md](backend/README.md)), then:
```bash
cd backend
npm install
npm run dev
```

**4. Web app** — create `frontend/.env.local` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1`, then:
```bash
cd frontend
npm install
npm run dev
```

**5. Mobile app** — create `mobile app/.env` (Google Maps key) and add `MAPS_API_KEY` to
`android/local.properties`, then:
```bash
cd "mobile app"
flutter pub get
flutter run --dart-define-from-file=.env
```

Secret files (`.env`, `.env.local`, `local.properties`) are git-ignored and never committed.

---

## How it stays safe (Security)

- **Login protection** — every API request needs a valid token; sessions expire after 8 hours
- **Passwords** — hashed with bcrypt; secure, time-limited password-reset links
- **Rate limiting** — repeated login attempts are slowed down
- **CORS allowlist** — only the app's own web origin may call the API from a browser
- **Input validation** — every request body is checked before it is saved
- **Banking integrity** — float and cash-pool updates run inside one database transaction with a lock, so
  two requests at the same moment cannot corrupt a balance
- **Banking limits** — CBSL daily limits are enforced on agent transactions
- **Secrets on the server only** — the database key and ML service are never exposed to the apps

Follows Central Bank of Sri Lanka rules: Direction No. 02 of 2018 (Agent Banking) and Direction No. 01 of
2021 (Mobile Payments).

---

## The look and feel

Web and mobile share one warm "kade" design — teal with turmeric touches, rounded shapes and a friendly
font, made to feel welcoming for rural shop owners. Light and dark modes are available, and every screen
can be switched between **Sinhala and English** (සිංහල / English button in the top bar on web, Settings on
mobile).

---

## A note on the data

There is no ready-made dataset of Sri Lankan micro-merchants. The project uses real public data where it
exists (market prices for rice and vegetables) and generated or simulated data where it does not
(shop ledgers for credit readiness; PaySim for banking transactions). The model comparisons are valid
because every method uses the same data; the absolute numbers are **not** claims about real-world
performance. Each model card lists its limitations.

---

## What's planned next (Future work)

- A pilot with real shop owners: comprehension and trust in the explanations (user study)
- Retrain with real data — loan repayment outcomes, real shop sales, Sri Lankan agency-banking records
- Safety stock per item instead of one error figure for all items
- Count agency-banking commission as income in the credit score
- Full offline mode and Tamil language support

---

Built for real-world impact in rural Sri Lanka · Lanka-Link
