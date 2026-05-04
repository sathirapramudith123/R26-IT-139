<div align="center">

  
# 🌿 Lanka-Link Financial Ecosystem

<p align="center">
  <b>Offline-First Smart Business System for Rural Micro-Merchants</b><br/>
  🚀 Inventory • 💰 Finance • 🧠 Procurement • 🏦 Agency Banking
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Research%20Prototype-green?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Frontend-Next.js-black?style=for-the-badge&logo=next.js"/>
  <img src="https://img.shields.io/badge/Backend-FastAPI-teal?style=for-the-badge&logo=fastapi"/>
  <img src="https://img.shields.io/badge/Database-MongoDB-green?style=for-the-badge&logo=mongodb"/>
</p>

---
</div>
## 📌 Project Overview

**Lanka-Link** is a **modular offline-first financial ecosystem** designed for **rural micro-merchants in Sri Lanka**.

It solves real-world problems like:

- 📉 Poor financial tracking  
- 📦 Frequent stock-outs  
- 🤝 Weak supplier decisions  
- 💸 High procurement costs  
- 🌐 Limited internet connectivity  

---

## 💡 Key Idea

> 💬 *“Even without internet, merchants can manage inventory, track finances, and make smart procurement decisions.”*

---

## 🧩 System Modules (4 Core Products)

### 🟩 1. Digital Financial Ledger
- Track sales, expenses, deposits  
- Payment methods (cash, QR, bank)  
- Monthly reports  

---

### 🟦 2. Offline Inventory & Supplier Manager ⭐
- Inventory tracking  
- Supplier management  
- Low-stock alerts  
- IndexedDB offline storage  
- Sync when online  

👉 **Main Research Contribution**

---

### 🟨 3. Cash Flow Monitoring
- Profit tracking  
- Expense analysis  
- Financial insights  

---

### 🟥 4. Smart Procurement Decision Engine ⭐
- Supplier comparison  
- Cost & profit calculation  
- Ranking system  
- Explainable recommendations  

```text
Recommended because:
- Lowest total cost
- High profit margin
- Can deliver on time
- Reliable supplier
````

---

## 🧠 Methodology

Design Science Research (DSR):

1. Problem Identification
2. Artifact Design
3. Development
4. Evaluation

---

## ⚙️ Technology Stack & Why Used

### 🖥️ Frontend

* **Next.js** → Fast, scalable UI framework
* **React** → Component-based development
* **Tailwind CSS** → Clean UI styling
* **IndexedDB** → Offline-first data storage

---

### ⚡ Backend

* **FastAPI** → High-performance API framework
* **MongoDB** → Flexible NoSQL database
* **Motor** → Async MongoDB driver

---

### 🔐 Other

* **JWT Authentication** → Secure login system
* **REST APIs** → Communication between frontend & backend
* **PWA Support** → Offline capability

---

## 🚀 Setup Guide

### 📦 Prerequisites

```bash
node -v
npm -v
python --version
pip --version
```

---

### 🔧 Backend Setup

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt

python run.py
```

👉 Backend runs on:
`http://localhost:8000`

---

### 💻 Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

👉 Frontend runs on:
`http://localhost:3000`

---

### ⚠️ CORS Fix (if needed)

```python
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]
```

---

## 🔌 API Endpoints (Sample)

```bash
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/procurement/recommend
GET  /api/v1/inventory
```

---

## 👥 User Roles

### 🧑‍💼 Admin

* Manage users
* View reports

### 🏪 Merchant

* Full system usage
* Decision making

### 👨‍🔧 Staff

* Transactions
* Inventory updates

👉 Suppliers are treated as **data (not users)**

---

## 🌍 Key Features

* Offline-first architecture
* Explainable decision support
* Lightweight system
* Rural-friendly design

---

## 📊 Evaluation Metrics

* Stock-out reduction
* Cost savings
* Profit improvement
* System usability
* Response time

---

## 🚀 Future Enhancements

* Supplier API integration
* Machine learning models
* Real-time market price data
* Mobile app

---

## 👨‍💻 Development Team

* 👤 Team Member 1 – https://github.com/MaheshaJayaruwani
* 👤 Team Member 2 – https://github.com/ParameeAponsu
* 👤 Team Member 3 – https://github.com/Leshvi
* 👤 Team Member 4 – https://github.com/sathirapramudith123

---

## 🧑‍🎓 Author

Undergraduate Research Project
BSc in Information Technology

---

## 📜 License

This project is for academic research purposes only.

---

<p align="center">
  🌱 Built for real-world impact in rural Sri Lanka
</p>
```


