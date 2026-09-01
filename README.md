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

---

## 📌 Overview

A modular digital platform for rural micro-merchants ("kade" owners) in Sri Lanka who manage their businesses on paper and have limited access to formal banking or digital tools. The platform combines everyday business management (sales, inventory, suppliers, procurement, agency banking) with **four explainable machine-learning components**, each paired with SHAP-based explanations so every prediction shows *why* — not just *what*.

The unifying research contribution is **Explainable AI (XAI)** applied across all four decision points, making machine-learning guidance transparent and trustworthy for a non-technical merchant.

| Problem faced by merchants | How the platform helps |
|---|---|
| No records, no way to assess loan readiness | Sales tracking + **ML credit-readiness score (C1)** |
| Stock-outs and reactive buying | Inventory + **ML demand forecasting (C2)** |
| Hard to know when to buy stock | Procurement + **ML buy-now-vs-wait decision (C3)** |
| No rural banking access, fraud risk | Agency banking + **ML anomaly detection (C4)** |

---

## 🏗️ System Architecture

Four independent parts communicating over HTTP. The frontends never call the ML service directly — every request passes through the backend, which authenticates with JWT and then calls the Python service.

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  WEB (Next)  │        │              │        │  ML SERVICE  │
│   :3000      │ ─────► │   BACKEND    │ ─────► │  Python API  │
├──────────────┤  HTTP  │ Node+Express │  HTTP  │  loads .pkl  │
│MOBILE(Flutter)│       │  + Supabase  │        │  + SHAP      │
│              │ ◄───── │    :5000     │ ◄───── │    :8000     │
└──────────────┘  JSON  └──────┬───────┘        └──────────────┘
                    + JWT      │
                          Supabase (PostgreSQL)
```

**Why a separate ML service?** The trained models are Python `.pkl` files that a Node backend cannot load. Running them behind a small Python FastAPI service keeps a clean separation: Node handles business logic and data, Python handles inference and explanations.

---

## 🤖 Machine Learning — Four Explainable Components

Each component was built with the same rigorous pipeline: five-algorithm comparison (Logistic Regression, Decision Tree, Random Forest, Gradient Boosting, XGBoost), cross-validation, best-model selection, held-out test evaluation, learning curves, and **SHAP explainability**. Models are trained on real public data and real-price-anchored generated data for the Sri Lankan context, with data limitations documented as part of the contribution.

| # | Component | Task | Best Model | Key Metrics |
|---|---|---|---|---|
| **C1** | Credit Readiness | Classification | Logistic Regression | Test Acc **0.83**, ROC-AUC **0.91**, F1 **0.82** |
| **C2** | Demand Forecast | Regression | Random Forest | R² **0.93**, MAE **~22** |
| **C3** | Procurement Decision | Classification | XGBoost | Acc **0.74**, ROC-AUC **0.82** |
| **C4** | Banking Anomaly | Imbalanced classification | XGBoost | ROC-AUC **0.91**, PR-AUC **0.52** |

**Integration flow:** sales (C1) → demand (C2) → procurement (C3); money flows through banking (C4) back into credit assessment (C1).

> **Explainability (the novelty):** every component uses SHAP to surface the features that drove each prediction. For credit readiness, the top drivers are *months active*, *digital payment ratio*, and *profit margin*.

### ML API

```
GET   /health                  Service status + loaded models
GET   /features/{component}     Exact feature columns a model expects
POST  /predict                  { component, features } → prediction (+ score)
```

`component` ∈ `credit` · `demand` · `procurement` · `anomaly`

---

## 🧩 Platform Modules

| Module | Capability | Feeds |
|---|---|---|
| **Auth** | Register, login (JWT), forgot / reset password | — |
| **Transactions** | Sales, purchases, expenses, deposits, transfers | C1 |
| **Inventory** | Stock items, reorder levels, low-stock alerts | C2 |
| **Suppliers** | Supplier register with pricing and delivery | C3 |
| **Procurement** | Procurement decisions and supplier selection | C3 |
| **Agency Banking** | Deposit / withdrawal / transfer / inquiry, CBSL limits | C4 |
| **Predictions** | Bridges to the ML service for all four components | — |

Every module has full CRUD with Joi validation, UUID-format checks on `:id` routes, ownership checks, and a consistent error format.

**Regulatory reference:** Central Bank of Sri Lanka, Direction No. 01 of 2021 on Mobile Payment Systems — https://www.cbsl.gov.lk

---

## 🎨 Design

Both frontends share one warm, human "Kade" design language — cream-paper backgrounds, deep teal with turmeric and terracotta accents, rounded shapes, and the Nunito typeface — chosen to feel approachable for rural merchants rather than like intimidating corporate fintech. **Light and dark modes** are available on both web and mobile via a toggle.

---

## ⚙️ Technology Stack

**Web frontend** — Next.js 14 (App Router), React 18, Tailwind CSS, JWT auth, light/dark theme.

**Mobile app** — Flutter (Dart), built-in `HttpClient`, `setState` state management, Material 3, light/dark theme.

**Backend** — Node.js + Express, `@supabase/supabase-js`, `jsonwebtoken`, `bcryptjs`, `joi`, `axios`, `cors`, `morgan`, `dotenv`.

**ML service** — FastAPI + Uvicorn, `joblib`, `scikit-learn`, `xgboost`, `pandas`, `shap`.

---

## 🗂️ Project Structure

```
R26-IT-139/
├── frontend/      Next.js web app          (port 3000)
├── mobile_app/    Flutter mobile app
├── backend/       Node + Express + Supabase (port 5000)
└── ml_service/    Python + FastAPI          (port 8000)
```

### frontend/ (Next.js)
```
frontend
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
    │   │   │   │   ├── [Id]
    │   │   │   │   │   └── edit
    │   │   │   │   │       └── page.jsx
    │   │   │   │   ├── create
    │   │   │   │   │   └── page.jsx
    │   │   │   │   ├── .gitkeep
    │   │   │   │   └── page.jsx
    │   │   │   ├── inventory
    │   │   │   │   ├── [Id]
    │   │   │   │   │   └── edit
    │   │   │   │   │       ├── .gitkeep
    │   │   │   │   │       └── page.jsx
    │   │   │   │   ├── alerts
    │   │   │   │   │   └── page.jsx
    │   │   │   │   ├── create
    │   │   │   │   │   ├── .gitkeep
    │   │   │   │   │   └── page.jsx
    │   │   │   │   ├── .gitkeep
    │   │   │   │   └── page.jsx
    │   │   │   ├── notifications
    │   │   │   │   ├── .gitkeep
    │   │   │   │   └── page.jsx
    │   │   │   ├── predictions
    │   │   │   │   ├── anomaly
    │   │   │   │   │   └── page.jsx
    │   │   │   │   ├── credit
    │   │   │   │   │   └── page.jsx
    │   │   │   │   ├── demand
    │   │   │   │   │   └── page.jsx
    │   │   │   │   ├── procurement
    │   │   │   │   │   └── page.jsx
    │   │   │   │   └── page.jsx
    │   │   │   ├── procurement
    │   │   │   │   ├── [Id]
    │   │   │   │   │   └── edit
    │   │   │   │   │       ├── .gitkeep
    │   │   │   │   │       └── page.jsx
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
    │   │   │   │   ├── [Id]
    │   │   │   │   │   └── edit
    │   │   │   │   │       ├── .gitkeep
    │   │   │   │   │       └── page.jsx
    │   │   │   │   ├── create
    │   │   │   │   │   ├── .gitkeep
    │   │   │   │   │   └── page.jsx
    │   │   │   │   ├── .gitkeep
    │   │   │   │   └── page.jsx
    │   │   │   ├── transactions
    │   │   │   │   ├── [Id]
    │   │   │   │   │   └── edit
    │   │   │   │   │       ├── .gitkeep
    │   │   │   │   │       └── page.jsx
    │   │   │   │   ├── create
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
    │   │   │   ├── .gitkeep
    │   │   │   ├── EmptyState.jsx
    │   │   │   ├── Footer.jsx
    │   │   │   ├── LoadingSpinner.jsx
    │   │   │   ├── ModuleNavigation.jsx
    │   │   │   ├── Navbar.jsx
    │   │   │   ├── PageHeader.jsx
    │   │   │   ├── Sidebar.jsx
    │   │   │   └── StatusBadge.jsx
    │   │   ├── dashboard
    │   │   │   ├── .gitkeep
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   ├── AdminPriceUploadWidget.jsx
    │   │   │   ├── BankAgentDashboard.jsx
    │   │   │   ├── MarketPriceWidget.jsx
    │   │   │   ├── MerchantDashboard.jsx
    │   │   │   └── MLAnalyticsWidget.jsx
    │   │   ├── forms
    │   │   │   ├── .gitkeep
    │   │   │   ├── AgencyBankingForm.jsx
    │   │   │   ├── AuthForm.jsx
    │   │   │   ├── FormField.jsx
    │   │   │   ├── InventoryForm.jsx
    │   │   │   ├── ProcurementForm.jsx
    │   │   │   ├── SupplierForm.jsx
    │   │   │   └── TransactionForm.jsx
    │   │   ├── inventory
    │   │   │   ├── .gitkeep
    │   │   │   ├── InventoryCard.jsx
    │   │   │   └── InventoryTable.jsx
    │   │   ├── predictions
    │   │   │   ├── PredictionForm.jsx
    │   │   │   └── PredictionResult.jsx
    │   │   ├── procurement
    │   │   │   ├── .gitkeep
    │   │   │   ├── ProcurementCard.jsx
    │   │   │   ├── ProcurementTable.jsx
    │   │   │   ├── RecommendationPanel.jsx
    │   │   │   └── SupplierRecommendationTable.jsx
    │   │   └── ui
    │   │       ├── .gitkeep
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
    │   │   ├── useInventory.js
    │   │   ├── usePrediction.js
    │   │   ├── useProcurement.js
    │   │   ├── useSuppliers.js
    │   │   └── useTransactions.js
    │   ├── lib
    │   │   ├── auth
    │   │   │   ├── .gitkeep
    │   │   │   ├── authHelpers.js
    │   │   │   └── tokenService.js
    │   │   ├── constants
    │   │   │   ├── .gitkeep
    │   │   │   └── index.js
    │   │   ├── formatters
    │   │   │   ├── .gitkeep
    │   │   │   └── index.js
    │   │   ├── helpers
    │   │   │   ├── .gitkeep
    │   │   │   └── index.js
    │   │   ├── validators
    │   │   │   ├── .gitkeep
    │   │   │   └── index.js
    │   │   ├── .gitkeep
    │   │   ├── agencyBankingLinks.js
    │   │   ├── constants.js
    │   │   ├── formatters.js
    │   │   ├── inventoryLinks.js
    │   │   ├── ledgerLinks.js
    │   │   ├── procurementLinks.js
    │   │   └── validators.js
    │   ├── services
    │   │   ├── api
    │   │   │   ├── .gitkeep
    │   │   │   ├── agencyBanking.js
    │   │   │   ├── auth.js
    │   │   │   ├── client.js
    │   │   │   ├── inventory.js
    │   │   │   ├── prediction.js
    │   │   │   ├── procurement.js
    │   │   │   ├── supplier.js
    │   │   │   └── transaction.js
    │   │   ├── auth
    │   │   │   ├── .gitkeep
    │   │   │   └── tokenService.js
    │   │   ├── storage
    │   │   │   ├── .gitkeep
    │   │   │   └── indexedDb.js
    │   │   └── sync
    │   │       ├── .gitkeep
    │   │       └── syncManager.js
    │   └── middleware.js
    ├── .eslintrc.json
    ├── .gitignore
    ├── .gitkeep
    ├── jsconfig.json
    ├── next.config.mjs
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.mjs
    ├── README.md
    └── tailwind.config.js
```

### mobile_app/ (Flutter)
```
mobile app
    ├── android
    │   ├── .gradle
    │   │   ├── 9.1.0
    │   │   │   ├── checksums
    │   │   │   │   └── checksums.lock
    │   │   │   ├── fileChanges
    │   │   │   │   └── last-build.bin
    │   │   │   ├── fileHashes
    │   │   │   │   ├── fileHashes.bin
    │   │   │   │   └── fileHashes.lock
    │   │   │   └── gc.properties
    │   │   ├── buildOutputCleanup
    │   │   │   ├── buildOutputCleanup.lock
    │   │   │   └── cache.properties
    │   │   └── vcs-1
    │   │       └── gc.properties
    │   ├── app
    │   │   ├── src
    │   │   │   ├── debug
    │   │   │   │   └── AndroidManifest.xml
    │   │   │   ├── main
    │   │   │   │   ├── kotlin
    │   │   │   │   │   └── com
    │   │   │   │   │       └── example
    │   │   │   │   │           └── app
    │   │   │   │   │               └── MainActivity.kt
    │   │   │   │   ├── res
    │   │   │   │   │   ├── drawable
    │   │   │   │   │   │   └── launch_background.xml
    │   │   │   │   │   ├── drawable-v21
    │   │   │   │   │   │   └── launch_background.xml
    │   │   │   │   │   ├── mipmap-hdpi
    │   │   │   │   │   │   └── ic_launcher.png
    │   │   │   │   │   ├── mipmap-mdpi
    │   │   │   │   │   │   └── ic_launcher.png
    │   │   │   │   │   ├── mipmap-xhdpi
    │   │   │   │   │   │   └── ic_launcher.png
    │   │   │   │   │   ├── mipmap-xxhdpi
    │   │   │   │   │   │   └── ic_launcher.png
    │   │   │   │   │   ├── mipmap-xxxhdpi
    │   │   │   │   │   │   └── ic_launcher.png
    │   │   │   │   │   ├── values
    │   │   │   │   │   │   └── styles.xml
    │   │   │   │   │   └── values-night
    │   │   │   │   │       └── styles.xml
    │   │   │   │   └── AndroidManifest.xml
    │   │   │   └── profile
    │   │   │       └── AndroidManifest.xml
    │   │   └── build.gradle.kts
    │   ├── gradle
    │   │   └── wrapper
    │   │       └── gradle-wrapper.properties
    │   ├── .gitignore
    │   ├── build.gradle.kts
    │   ├── gradle.properties
    │   └── settings.gradle.kts
    ├── ios
    │   ├── Flutter
    │   │   ├── AppFrameworkInfo.plist
    │   │   ├── Debug.xcconfig
    │   │   └── Release.xcconfig
    │   ├── Runner
    │   │   ├── Assets.xcassets
    │   │   │   ├── AppIcon.appiconset
    │   │   │   │   ├── Contents.json
    │   │   │   │   ├── Icon-App-1024x1024@1x.png
    │   │   │   │   ├── Icon-App-20x20@1x.png
    │   │   │   │   ├── Icon-App-20x20@2x.png
    │   │   │   │   ├── Icon-App-20x20@3x.png
    │   │   │   │   ├── Icon-App-29x29@1x.png
    │   │   │   │   ├── Icon-App-29x29@2x.png
    │   │   │   │   ├── Icon-App-29x29@3x.png
    │   │   │   │   ├── Icon-App-40x40@1x.png
    │   │   │   │   ├── Icon-App-40x40@2x.png
    │   │   │   │   ├── Icon-App-40x40@3x.png
    │   │   │   │   ├── Icon-App-60x60@2x.png
    │   │   │   │   ├── Icon-App-60x60@3x.png
    │   │   │   │   ├── Icon-App-76x76@1x.png
    │   │   │   │   ├── Icon-App-76x76@2x.png
    │   │   │   │   └── Icon-App-83.5x83.5@2x.png
    │   │   │   └── LaunchImage.imageset
    │   │   │       ├── Contents.json
    │   │   │       ├── LaunchImage.png
    │   │   │       ├── LaunchImage@2x.png
    │   │   │       ├── LaunchImage@3x.png
    │   │   │       └── README.md
    │   │   ├── Base.lproj
    │   │   │   ├── LaunchScreen.storyboard
    │   │   │   └── Main.storyboard
    │   │   ├── AppDelegate.swift
    │   │   ├── Info.plist
    │   │   ├── Runner-Bridging-Header.h
    │   │   └── SceneDelegate.swift
    │   ├── Runner.xcodeproj
    │   │   ├── project.xcworkspace
    │   │   │   ├── xcshareddata
    │   │   │   │   ├── IDEWorkspaceChecks.plist
    │   │   │   │   └── WorkspaceSettings.xcsettings
    │   │   │   └── contents.xcworkspacedata
    │   │   ├── xcshareddata
    │   │   │   └── xcschemes
    │   │   │       └── Runner.xcscheme
    │   │   └── project.pbxproj
    │   ├── Runner.xcworkspace
    │   │   ├── xcshareddata
    │   │   │   ├── IDEWorkspaceChecks.plist
    │   │   │   └── WorkspaceSettings.xcsettings
    │   │   └── contents.xcworkspacedata
    │   ├── RunnerTests
    │   │   └── RunnerTests.swift
    │   └── .gitignore
    ├── lib
    │   ├── config
    │   │   ├── modules.dart
    │   │   └── predictions.dart
    │   ├── core
    │   │   ├── api.dart
    │   │   ├── config.dart
    │   │   └── theme.dart
    │   ├── models
    │   │   ├── field_config.dart
    │   │   └── module_config.dart
    │   ├── screens
    │   │   ├── auth
    │   │   │   ├── login_screen.dart
    │   │   │   └── register_screen.dart
    │   │   ├── crud
    │   │   │   ├── form_screen.dart
    │   │   │   └── list_screen.dart
    │   │   ├── predictions
    │   │   │   ├── prediction_screen.dart
    │   │   │   └── predictions_hub_screen.dart
    │   │   └── dashboard_screen.dart
    │   ├── services
    │   │   ├── auth_service.dart
    │   │   ├── crud_service.dart
    │   │   └── prediction_service.dart
    │   ├── widgets
    │   │   ├── empty_state.dart
    │   │   └── loading.dart
    │   └── main.dart
    ├── linux
    │   ├── flutter
    │   │   ├── CMakeLists.txt
    │   │   ├── generated_plugin_registrant.cc
    │   │   ├── generated_plugin_registrant.h
    │   │   └── generated_plugins.cmake
    │   ├── runner
    │   │   ├── CMakeLists.txt
    │   │   ├── main.cc
    │   │   ├── my_application.cc
    │   │   └── my_application.h
    │   ├── .gitignore
    │   └── CMakeLists.txt
    ├── macos
    │   ├── Flutter
    │   │   ├── Flutter-Debug.xcconfig
    │   │   ├── Flutter-Release.xcconfig
    │   │   └── GeneratedPluginRegistrant.swift
    │   ├── Runner
    │   │   ├── Assets.xcassets
    │   │   │   └── AppIcon.appiconset
    │   │   │       ├── app_icon_1024.png
    │   │   │       ├── app_icon_128.png
    │   │   │       ├── app_icon_16.png
    │   │   │       ├── app_icon_256.png
    │   │   │       ├── app_icon_32.png
    │   │   │       ├── app_icon_512.png
    │   │   │       ├── app_icon_64.png
    │   │   │       └── Contents.json
    │   │   ├── Base.lproj
    │   │   │   └── MainMenu.xib
    │   │   ├── Configs
    │   │   │   ├── AppInfo.xcconfig
    │   │   │   ├── Debug.xcconfig
    │   │   │   ├── Release.xcconfig
    │   │   │   └── Warnings.xcconfig
    │   │   ├── AppDelegate.swift
    │   │   ├── DebugProfile.entitlements
    │   │   ├── Info.plist
    │   │   ├── MainFlutterWindow.swift
    │   │   └── Release.entitlements
    │   ├── Runner.xcodeproj
    │   │   ├── project.xcworkspace
    │   │   │   └── xcshareddata
    │   │   │       └── IDEWorkspaceChecks.plist
    │   │   ├── xcshareddata
    │   │   │   └── xcschemes
    │   │   │       └── Runner.xcscheme
    │   │   └── project.pbxproj
    │   ├── Runner.xcworkspace
    │   │   ├── xcshareddata
    │   │   │   └── IDEWorkspaceChecks.plist
    │   │   └── contents.xcworkspacedata
    │   ├── RunnerTests
    │   │   └── RunnerTests.swift
    │   └── .gitignore
    ├── test
    │   └── widget_test.dart
    ├── web
    │   ├── icons
    │   │   ├── Icon-192.png
    │   │   ├── Icon-512.png
    │   │   ├── Icon-maskable-192.png
    │   │   └── Icon-maskable-512.png
    │   ├── favicon.png
    │   ├── index.html
    │   └── manifest.json
    ├── windows
    │   ├── flutter
    │   │   ├── CMakeLists.txt
    │   │   ├── generated_plugin_registrant.cc
    │   │   ├── generated_plugin_registrant.h
    │   │   └── generated_plugins.cmake
    │   ├── runner
    │   │   ├── resources
    │   │   │   └── app_icon.ico
    │   │   ├── CMakeLists.txt
    │   │   ├── flutter_window.cpp
    │   │   ├── flutter_window.h
    │   │   ├── main.cpp
    │   │   ├── resource.h
    │   │   ├── runner.exe.manifest
    │   │   ├── Runner.rc
    │   │   ├── utils.cpp
    │   │   ├── utils.h
    │   │   ├── win32_window.cpp
    │   │   └── win32_window.h
    │   ├── .gitignore
    │   └── CMakeLists.txt
    ├── .gitignore
    ├── .gitkeep
    ├── .metadata
    ├── analysis_options.yaml
    ├── pubspec.lock
    ├── pubspec.yaml
    └── README.md
```

### backend/ (Node)
```backend
    ├── src
    │   ├── config
    │   │   └── supabase.js
    │   ├── controllers
    │   │   ├── .gitkeep
    │   │   ├── agencyBanking.controller.js
    │   │   ├── auth.controller.js
    │   │   ├── inventory.controller.js
    │   │   ├── prediction.controller.js
    │   │   ├── procurement.controller.js
    │   │   ├── supplier.controller.js
    │   │   ├── sync.controller.js
    │   │   └── transaction.controller.js
    │   ├── middlewares
    │   │   ├── .gitkeep
    │   │   ├── auth.middleware.js
    │   │   ├── error.middleware.js
    │   │   └── validate.middleware.js
    │   ├── routes
    │   │   ├── .gitkeep
    │   │   ├── agencyBanking.routes.js
    │   │   ├── auth.routes.js
    │   │   ├── inventory.routes.js
    │   │   ├── prediction.routes.js
    │   │   ├── procurement.routes.js
    │   │   ├── supplier.routes.js
    │   │   ├── sync.routes.js
    │   │   └── transaction.routes.js
    │   └── utils
    │       ├── .gitkeep
    │       ├── helpers.js
    │       └── mlClient.js
    ├── .gitkeep
    ├── package-lock.json
    ├── package.json
    ├── schema.sql
    └── server.js

```

### ml_service/ (Python)
```
ml_service
    ├── models
    │   ├── component1_sales_financial_model.pkl
    │   ├── component2_demand_forecast_model.pkl
    │   ├── component3_procurement_model.pkl
    │   └── component4_banking_anomaly_model.pkl
    ├── app.py
    ├── check_features.py
    └── requirements.txt
```

---

## 🚀 Setup

### Prerequisites
```
Node.js 18+ · Python 3.11+ · Flutter SDK · a Supabase project
```

### 1. Database (Supabase)
Create a project → open the SQL Editor → run `backend/schema.sql`. From **Settings → API**, copy the **service_role** key.

### 2. ML Service
```bash
cd ml_service
pip install -r requirements.txt
python -m uvicorn app:app --port 8000
python -m uvicorn app:app --port 8000 --reload
```
Check `http://localhost:8000/health` — it lists the four loaded models.

### 3. Backend
```bash
cd backend
npm install
npm run dev
```
Runs at `http://localhost:Port Number`.

### 4. Web Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:Port Number`.

### 5. Mobile App
```bash
cd mobile_app
flutter pub get
flutter run
```

### Environment Variables

**backend/.env**
```env
PORT=5000
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-service-role-key
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=7d
ML_URL=http://localhost:Port Number
```

**frontend/.env.local**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:Port Number/api/v1
```

> Generate a JWT secret:
> `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

## 🔌 API Reference (base `/api/v1`)

### Authentication
```
POST  /auth/register          Create account
POST  /auth/login             Login — returns { token, user }
POST  /auth/forgot-password   Request a reset token
POST  /auth/reset-password    Reset password with token
```

### Core Modules (Bearer token required)
```
GET/POST/PUT/DELETE   /transactions      /transactions/:id
GET/POST/PUT/DELETE   /inventory         /inventory/:id   + GET /inventory/status
GET/POST/PUT/DELETE   /suppliers         /suppliers/:id
GET/POST/PUT/DELETE   /procurement       /procurement/:id
GET/POST/PUT/DELETE   /agency-banking    /agency-banking/:id
```

### Predictions
```
POST  /predict/credit         Credit-readiness score
POST  /predict/demand         Demand forecast
POST  /predict/procurement    Buy-now-vs-wait decision
POST  /predict/anomaly        Transaction anomaly flag
```
Each takes `{ "features": { ... } }` matching the model's training columns. Use `GET /features/{component}` on the ML service to see the exact columns expected.

---

## 🔐 Security

- **Route protection** — `middleware.js` guards `/dashboard/*`; `useAuthGuard()` on each dashboard page.
- **API auth** — JWT verified on every protected endpoint.
- **Passwords** — bcrypt hashing; reset tokens with expiry.
- **Validation** — Joi schemas + UUID-format checks before any database write.
- **CBSL limits** — enforced per agency-banking transaction type.
- **Separation** — the ML service runs as a separate process; the service_role key is used only server-side.

---

## 📊 Research Claims

| Claim | Met by |
|---|---|
| ML credit-readiness scoring | Component 1 |
| ML demand forecasting | Component 2 |
| ML procurement timing | Component 3 |
| ML anomaly detection | Component 4 |
| Explainable recommendations | SHAP across all four components |
| Real / real-anchored data | Public datasets + real-price-anchored generated data, limitations documented |
| Clean service separation | Node business logic + Python inference over HTTP |
| Cross-platform delivery | Shared design across web and mobile |

---

## 🔮 Future Work

- Primary pilot data collection with real Sri Lankan micro-merchants for final validation
- Baseline comparisons (model vs. a merchant's current manual method) for each component
- A small user study evaluating whether the SHAP explanations improve trust and decisions
- Live in-app SHAP explanation panels returning per-prediction feature contributions
- Offline-first sync with a full replay engine (currently queue-only)
- Sinhala and Tamil language support

---

## 📝 Notes on Data

No single public dataset contains all the micro-merchant parameters needed for the Sri Lankan context. The project uses real public data where it exists, real-price-anchored generated data where it does not, and documents this gap honestly as part of the research contribution. The intended final validation step is a primary pilot with real merchants.

---

<div align="center">
🌱 Built for real-world impact in rural Sri Lanka
</div>
