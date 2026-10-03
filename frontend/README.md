# Frontend — web app (Next.js)

The merchant's web app: transactions, journal and reports, inventory, procurement, suppliers, agency
banking and the Predictions dashboard.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint       # ESLint
```

## Environment (`frontend/.env.local`, never committed)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
```

## Structure

```
src/
  app/                      pages (Next.js app router)
    page.jsx                landing page
    auth/                   login, register, forgot / reset password
    dashboard/              one folder per module: transactions, journal, reports, inventory,
                            procurement, suppliers, agency-banking, my-banks, predictions, profile
  components/
    common/                 navbar, sidebar, dialogs, badges
    forms/                  create / edit forms for each module
    predictions/            Predictions dashboard parts (charts, gauge, "View all items" tables)
    procurement/            supplier ranking panels and the post-save summary
    dashboard/, inventory/, reports/, ui/
  hooks/                    data hooks per module (useInventory, useProcurement, ...)
  services/api/             one API client per backend resource
  lib/                      constants, formatters, validators, procurement helpers, PDF reports
```

Code style: Prettier (config in the repository root, `.prettierrc`).
