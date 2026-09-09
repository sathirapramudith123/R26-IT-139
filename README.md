<div align="center">

# 🌿 SMART MERCHANT SUPPORT PLATFORM FOR AGENCY BANKING AND PROCUREMENT

**A Digital Platform with Explainable Machine Learning for Rural Sri Lankan Micro-Merchants**

*IT4010 Research Project · BSc (Hons) in Information Technology*

![Web](https://img.shields.io/badge/Web-Next.js%2014-black?style=for-the-badge&logo=next.js)
![Mobile](https://img.shields.io/badge/Mobile-Flutter-02569B?style=for-the-badge&logo=flutter)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js)
![Database](https://img.shields.io/badge/DB-Supabase-3ECF8E?style=for-the-badge&logo=supabase)
![ML](https://img.shields.io/badge/ML-FastAPI%20%2B%20SHAP-009688?style=for-the-badge&logo=fastapi)

</div>

## Smart Merchant Support Platform for Agency Banking & Procurement

A simple digital tool that helps small Sri Lankan shop owners ("kade" owners) run
their business — with AI that explains its advice in plain language.

Research Project · BSc (Hons) in Information Technology


---

## What is this? (In simple words)

Many small shop owners in rural Sri Lanka run their whole business **on paper**.
They have no records, no easy access to banking, and no way to know if the bank
will give them a loan.

**Lanka-Link** is an app (on **web and mobile**) that helps them:

- Keep records of **sales, stock, suppliers, and purchases**
- Do **banking for their customers** (deposits, withdrawals) as an agent
- Get **AI advice** — and the AI always explains **why** it gave that advice

Think of it as a **digital shop assistant** that also gives smart suggestions.


---

## The 4 problems it solves

| The shop owner's problem | What the app does |
|---|---|
| "I have no records, so no bank will give me a loan." | Tracks sales, then gives an **AI loan-readiness score** |
| "I keep running out of stock." | Tracks inventory, then **AI predicts how much you'll sell** |
| "I don't know the best time to buy stock." | **AI says buy now or wait** for a better price |
| "How do I spot a suspicious transaction?" | **AI flags unusual banking activity** |

Each AI answer comes with a **plain-language reason** — so the shop owner can trust it.


---

## What's inside the app? (The modules)

| Module | What it does |
|---|---|
| **Dashboard** | A friendly home screen showing income, expenses, profit, and stock — with an animated sky that changes by time of day |
| **Transactions** | Record every sale, purchase, and expense |
| **Journal** | An accountant-style double-entry ledger (Debit/Credit), with monthly reports and profit/loss |
| **Inventory** | Track stock and get low-stock alerts |
| **Suppliers** | Keep a list of suppliers, their prices, and locations on a map |
| **Procurement** | Order stock — the app recommends the best supplier (most items and nearest) |
| **Agency Banking** | Do deposits/withdrawals for customers, with float-account tracking |
| **My Banks** | Manage your bank float accounts and cash |
| **Predictions** | See all 4 AI insights in one place |


---

## The AI (Machine Learning) — explained simply

The app has **4 AI models**, each trained to help with one decision. Every model was
built by testing several algorithms and keeping the best one, then checking it on
data it had never seen before.

### Component 1 — Credit Readiness
- **What it does:** Answers "Is this shop ready for a loan?"
- **Type of problem:** Classification (Yes / No)
- **Best algorithm:** Logistic Regression
- **What it looks at:** How long in business, daily sales, profit margin, digital-payment use
- **Result:** A readiness score, plus the reasons behind it

### Component 2 — Demand Forecast
- **What it does:** Answers "How many units of this item will sell next week?"
- **Type of problem:** Regression (a number)
- **Best algorithm:** Random Forest
- **What it looks at:** Past sales trend, stock levels, seasonal patterns
- **Result:** A predicted number of units, plus a safe reorder level (using the
  safety-stock formula: buffer = Z × forecast error × √lead-time)

### Component 3 — Procurement (Buy or Wait)
- **What it does:** Answers "Should I buy this stock now, or wait?"
- **Type of problem:** Classification (Buy / Wait) plus a price forecast
- **Best algorithm:** XGBoost
- **What it looks at:** Price trend, price ups-and-downs, possible profit margin
- **Result:** A buy/wait decision with a confidence score. Business rules also apply —
  it won't tell you to over-buy or stock perishables you can't sell in time

### Component 4 — Banking Anomaly (Fraud Detection)
- **What it does:** Answers "Is this transaction suspicious?"
- **Type of problem:** Classification on rare events (fraud is uncommon)
- **Best algorithm:** XGBoost (combined with an Isolation Forest to catch new,
  never-seen patterns)
- **What it looks at:** Amount, time, channel, transaction type
- **Result:** Normal or Suspicious. Amounts near or above the CBSL limit are also flagged

**The special part (the research contribution):** every model doesn't just give an
answer — it **shows the reasons** behind it. So instead of a mysterious "black box,"
the shop owner sees *why* — which builds trust.

**Algorithms tested for each model:** Logistic Regression, Decision Tree,
Random Forest, Gradient Boosting, and XGBoost. The most accurate one (measured on
unseen test data) was kept as the final model.


---

## How the app is built (The 4 parts)

The app has 4 parts that work together:

- **Web + Mobile app** — what the shop owner sees and touches
- **Backend** — the middle "manager" that checks logins and moves data around
- **AI Service** — a separate program that runs the 4 AI models
- **Database** — where all the information is safely stored

The web and mobile apps never talk to the AI directly. Every request goes through the
backend "manager" first, which checks the login and then asks the AI service.

**Why keep the AI separate?** The AI models are Python files that the main backend
can't open directly. So they run in their own small program — keeping everything
clean and organized.


---

## What technology is used?

| Part | Technology |
|---|---|
| **Web app** | Next.js (React) + Tailwind CSS |
| **Mobile app** | Flutter (Dart) |
| **Backend** | Node.js + Express |
| **Database** | Supabase (PostgreSQL) |
| **AI service** | Python + FastAPI |
| **AI / Machine Learning** | scikit-learn, XGBoost, pandas (for the models); SHAP (for explanations) |
| **Login security** | JWT tokens + bcrypt password encryption |
| **Maps** | OpenStreetMap (free, no API key) |
| **Design** | Warm "kade" style, Nunito font, light + dark mode |


---

## How to run it (Setup)

You need: **Node.js 18+**, **Python 3.11+**, **Flutter SDK**, and a **Supabase account**.

**Step 1 — Database**
Create a Supabase project, open the SQL Editor, and run `backend/schema.sql`.
Then copy your service_role key from Settings → API.

**Step 2 — AI Service**
```
cd ml_service
pip install -r requirements.txt
python -m uvicorn app:app --port 8000 --reload
```

**Step 3 — Backend**
```
cd backend
npm install
npm run dev
```

**Step 4 — Web app**
```
cd frontend
npm install
npm run dev
```

**Step 5 — Mobile app**
```
cd mobile_app
flutter pub get
flutter run
```

You'll also need two small settings files with your database keys and secrets —
one in `backend` and one in `frontend`.


---

## How it stays safe (Security)

- **Login protection** — you must log in to reach the dashboard
- **Tokens** — every request is checked to make sure you're allowed
- **Passwords** — never stored as plain text (they're encrypted)
- **Input checks** — all data is validated before it's saved
- **Banking limits** — CBSL rules are enforced on agent transactions
- **AI kept separate** — the AI runs on its own, and secret keys stay on the server only

Follows Central Bank of Sri Lanka rules: Direction No. 02 of 2018 (Agent Banking)
and Direction No. 01 of 2021 (Mobile Payments).


---

## The look and feel

Both the web and mobile apps share one warm, friendly "kade" design — cream
backgrounds, deep teal with turmeric and terracotta touches, rounded shapes, and a
soft font. It's made to feel welcoming for rural shop owners, not cold and corporate.

The dashboard changes with the time of day — a sunrise over mountains in the morning,
a bright day, a sunset into the sea in the evening, and a starry night — with numbers
that count up smoothly. Both light and dark modes are available.


---

## What's planned next (Future work)

- Test the app with real shop owners in rural Sri Lanka
- Compare the AI's advice against a shop owner's current guesswork
- Show the AI's reasons live inside the app
- Offline mode — use the app without internet, sync later
- Sinhala and Tamil language support


---

## A note on the data

There's no single ready-made dataset with everything needed for Sri Lankan shop
owners. So this project uses real public data where it exists, and carefully
generated realistic data (based on real Sri Lankan prices) where it doesn't — and is
honest about this gap as part of the research. The final step is a real pilot with
actual merchants.


---

Built for real-world impact in rural Sri Lanka · Lanka-Link
