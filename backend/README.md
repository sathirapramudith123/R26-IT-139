#  Backend (Monolithic)



## Run
```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python run.py
```

## API Base
`/api/v1`

```
python -m pip install reportlab>=4.0
```


# File Tree: backend

```
├── app
│   ├── api
│   │   ├── v1
│   │   │   ├── endpoints
│   │   │   │   ├── __init__.py
│   │   │   │   ├── agency_banking_routes.py
│   │   │   │   ├── auth_routes.py
│   │   │   │   ├── dashboard_routes.py
│   │   │   │   ├── inventory_routes.py
│   │   │   │   ├── journal_routes.py
│   │   │   │   ├── ledger_routes.py
│   │   │   │   ├── notification_routes.py
│   │   │   │   ├── procurement_routes.py
│   │   │   │   ├── smart_agent_routes.py
│   │   │   │   ├── supplier_routes.py
│   │   │   │   └── transaction_routes.py
│   │   │   ├── __init__.py
│   │   │   └── api.py
│   │   ├── __init__.py
│   │   └── deps.py
│   ├── core
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── middleware.py
│   │   └── security.py
│   ├── db
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── seed.py
│   ├── models
│   │   ├── __init__.py
│   │   ├── agency_banking_model.py
│   │   ├── inventory_model.py
│   │   ├── journal_model.py
│   │   ├── ledger_model.py
│   │   ├── notification_model.py
│   │   ├── procurement_model.py
│   │   ├── smart_agent_model.py
│   │   ├── supplier_model.py
│   │   ├── transaction_model.py
│   │   └── user_model.py
│   ├── repositories
│   │   ├── __init__.py
│   │   ├── agency_banking_repository.py
│   │   ├── inventory_repository.py
│   │   ├── journal_repository.py
│   │   ├── ledger_repository.py
│   │   ├── notification_repository.py
│   │   ├── procurement_repository.py
│   │   ├── smart_agent_repository.py
│   │   ├── supplier_repository.py
│   │   ├── transaction_repository.py
│   │   └── user_repository.py
│   ├── schemas
│   │   ├── __init__.py
│   │   ├── agency_banking_schema.py
│   │   ├── auth_schema.py
│   │   ├── common_schema.py
│   │   ├── inventory_schema.py
│   │   ├── journal_schema.py
│   │   ├── ledger_schema.py
│   │   ├── notification_schema.py
│   │   ├── procurement_schema.py
│   │   ├── smart_agent_schema.py
│   │   ├── supplier_schema.py
│   │   └── transaction_schema.py
│   ├── scripts
│   │   └── migrate_inventory_items.py
│   ├── services
│   │   ├── __init__.py
│   │   ├── agency_banking_service.py
│   │   ├── auth_service.py
│   │   ├── dashboard_service.py
│   │   ├── inventory_service.py
│   │   ├── journal_service.py
│   │   ├── ledger_service.py
│   │   ├── notification_service.py
│   │   ├── procurement_service.py
│   │   ├── smart_agent_service.py
│   │   ├── supplier_service.py
│   │   └── transaction_service.py
│   ├── utils
│   │   ├── __init__.py
│   │   ├── helpers.py
│   │   ├── response.py
│   │   └── validators.py
│   ├── __init__.py
│   └── main.py
├── tests
│   ├── __init__.py
│   ├── test_agency_banking.py
│   ├── test_auth.py
│   ├── test_inventory.py
│   ├── test_ledger.py
│   ├── test_notification.py
│   ├── test_procurement.py
│   ├── test_supplier.py
│   └── test_transaction.py
├── .gitignore
├── README.md
├── requirements.txt
└── run.py
```
