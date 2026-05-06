
## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

## Environment
Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```


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
│   │   │   │   └── page.jsx
│   │   │   ├── login
│   │   │   │   └── page.jsx
│   │   │   └── register
│   │   │       └── page.jsx
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
│   │   │   │   └── page.jsx
│   │   │   ├── inventory
│   │   │   │   ├── [inventoryId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── alerts
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   └── page.jsx
│   │   │   │   └── page.jsx
│   │   │   ├── ledger
│   │   │   │   ├── [ledgerId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── journal
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── reports
│   │   │   │   │   └── page.jsx
│   │   │   │   └── page.jsx
│   │   │   ├── notifications
│   │   │   │   └── page.jsx
│   │   │   ├── procurement
│   │   │   │   ├── [procurementId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   └── page.jsx
│   │   │   │   └── page.jsx
│   │   │   ├── profile
│   │   │   │   └── page.jsx
│   │   │   ├── smart-agent
│   │   │   │   ├── [agentId]
│   │   │   │   │   └── page.jsx
│   │   │   │   └── page.jsx
│   │   │   ├── suppliers
│   │   │   │   ├── [supplierId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── compare
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   └── page.jsx
│   │   │   │   └── page.jsx
│   │   │   ├── transactions
│   │   │   │   ├── [transactionId]
│   │   │   │   │   ├── edit
│   │   │   │   │   │   └── page.jsx
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── create
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── history
│   │   │   │   │   └── page.jsx
│   │   │   │   └── page.jsx
│   │   │   ├── layout.jsx
│   │   │   └── page.jsx
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
│   │   │   ├── OfflineBanner.jsx
│   │   │   ├── PageHeader.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── index.jsx
│   │   ├── forms
│   │   │   ├── AgencyBankingForm.jsx
│   │   │   ├── AuthForm.jsx
│   │   │   ├── InventoryForm.jsx
│   │   │   ├── LedgerForm.jsx
│   │   │   ├── ProcurementForm.jsx
│   │   │   ├── ProcurementRecommendationForm.jsx
│   │   │   ├── SupplierForm.jsx
│   │   │   └── TransactionForm.jsx
│   │   ├── inventory
│   │   │   ├── InventoryCard.jsx
│   │   │   └── InventoryTable.jsx
│   │   ├── ledger
│   │   │   ├── JournalTable.jsx
│   │   │   ├── LedgerCard.jsx
│   │   │   └── LedgerTable.jsx
│   │   ├── notifications
│   │   │   ├── NotificationCard.jsx
│   │   │   └── NotificationList.jsx
│   │   ├── procurement
│   │   │   ├── ProcurementCard.jsx
│   │   │   ├── ProcurementTable.jsx
│   │   │   ├── RecommendationPanel.jsx
│   │   │   └── SupplierRecommendationTable.jsx
│   │   ├── savings
│   │   │   ├── SavingsCard.jsx
│   │   │   └── SavingsTable.jsx
│   │   ├── smart-agent
│   │   │   ├── RecommendationPanel.jsx
│   │   │   └── SmartAgentCard.jsx
│   │   ├── suppliers
│   │   │   ├── SupplierCard.jsx
│   │   │   └── SupplierTable.jsx
│   │   ├── transactions
│   │   │   ├── TransactionCard.jsx
│   │   │   └── TransactionTable.jsx
│   │   └── ui
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── Input.jsx
│   │       ├── Modal.jsx
│   │       ├── Select.jsx
│   │       └── Table.jsx
│   ├── hooks
│   │   ├── useAgencyBanking.js
│   │   ├── useAuth.js
│   │   ├── useDashboard.js
│   │   ├── useInventory.js
│   │   ├── useJournal.js
│   │   ├── useLedger.js
│   │   ├── useNotifications.js
│   │   ├── useOffline.js
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
│   │   ├── inventoryLinks.js
│   │   ├── ledgerLinks.js
│   │   └── procurementLinks.js
│   ├── services
│   │   ├── api
│   │   │   ├── agencyBanking.api.js
│   │   │   ├── auth.api.js
│   │   │   ├── client.js
│   │   │   ├── dashboard.api.js
│   │   │   ├── inventory.api.js
│   │   │   ├── journal.api.js
│   │   │   ├── ledger.api.js
│   │   │   ├── notification.api.js
│   │   │   ├── procurement.api.js
│   │   │   ├── smartAgent.api.js
│   │   │   ├── supplier.api.js
│   │   │   └── transaction.api.js
│   │   ├── auth
│   │   │   └── tokenService.js
│   │   ├── storage
│   │   │   └── indexedDb.js
│   │   └── sync
│   │       └── syncManager.js
│   ├── store
│   │   ├── authStore.js
│   │   ├── inventoryStore.js
│   │   ├── ledgerStore.js
│   │   ├── notificationStore.js
│   │   ├── procurementStore.js
│   │   ├── savingsStore.js
│   │   ├── smartAgentStore.js
│   │   ├── supplierStore.js
│   │   └── transactionStore.js
│   └── styles
│       └── index.css
├── .eslintrc.json
├── .gitignore
├── README.md
├── jsconfig.json
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
└── tailwind.config.js
```
