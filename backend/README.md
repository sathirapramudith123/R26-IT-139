# Backend — REST API (Node.js + Express)

The API used by the web and mobile apps. It stores data in Supabase (PostgreSQL), applies the business
rules (stock, double-entry journal, agency-banking limits) and calls the ML service for predictions.

## Run

```bash
npm install
npm run dev        # nodemon, http://localhost:5000
```

Health check: `GET http://localhost:5000/health` · all routes are under `/api/v1`.

## Environment (`backend/.env`, never committed)

| Key | Example | Purpose |
|---|---|---|
| `PORT` | `5000` | API port |
| `SUPABASE_URL`, `SUPABASE_KEY` | — | Supabase project and **service_role** key |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | `8h` | Login tokens |
| `CORS_ORIGINS` | `http://localhost:3000` | Web origins allowed to call the API |
| `APP_TIMEZONE` | `Asia/Colombo` | "Today" for daily limits, journal dates and ML features |
| `ML_URL` | `http://localhost:8000` | ML service |
| `SMTP_*`, `FRONTEND_URL` | — | Password-reset email (optional; without SMTP the link is printed to the console) |
| `TRUST_PROXY` | `1` | Only when running behind a hosting proxy |

## Database

`schema.sql` creates the tables; `sql/atomic_banking.sql` creates the Postgres functions that run each
agency-banking / float operation as one transaction. Run both in the Supabase SQL editor.

## Structure

```
server.js                 app setup: env, CORS, routes, error handler
src/
  config/supabase.js      Supabase client
  routes/                 one router per resource (auth, transactions, inventory, suppliers,
                          procurement, agency-banking, agent-banks, insights, predict, reports, ...)
  controllers/            request handlers for each router
  middlewares/            JWT auth, request validation, rate limiting, error handling
  validation/schemas.js   Joi schemas for request bodies
  utils/
    features.js           builds the ML inputs from a shop's own data (credit, demand, procurement, anomaly)
    mlClient.js           calls the ML service
    stock.js              FIFO stock batches
    float.js              agency-banking float / cash-pool operations (via the SQL functions)
    doubleEntry.js        double-entry journal lines
    time.js               Sri Lanka date helpers
```

## Where the ML is used

`GET /api/v1/insights` (`controllers/insights.controller.js`) builds the inputs with `utils/features.js`,
calls the four models and returns the credit score, weekly demand forecast, Buy / Wait advice (stock vs a
reorder point from the demand forecast) and the latest transaction's anomaly check.
