# 📊 SAP Order-to-Cash (O2C) Process Report

This project presents a complete end-to-end implementation of the SAP Order-to-Cash (O2C) cycle, covering the full sales lifecycle from customer inquiry to final payment.

## 🔍 Overview
The O2C process integrates SAP SD (Sales & Distribution) and SAP FI (Financial Accounting) to automate sales operations, ensure accurate financial postings, and maintain document traceability.

## ⚙️ Key Features
- Complete 6-step O2C cycle execution:
  - Inquiry & Quotation (VA11 / VA21)
  - Sales Order (VA01)
  - Outbound Delivery (VL01N)
  - Post Goods Issue (VL02N)
  - Billing (VF01)
  - Customer Payment (F-28)

- Real-time SD–FI integration with automatic accounting entries:
  - PGI → Dr COGS / Cr Inventory
  - Billing → Dr Accounts Receivable / Cr Revenue
  - Payment → Dr Bank / Cr Accounts Receivable

- Document flow traceability using VBFA (audit-ready system)

- SAP table mapping:
  - VBAK, VBAP, LIKP, LIPS, VBRK, VBRP, BKPF, BSEG, BSID, BSAD

- Custom ABAP Report:
  - Sales Order List using VBAK–VBAP JOIN
  - ALV Grid display for reporting

## 🧠 Key Learnings
- Practical understanding of enterprise sales processes in SAP
- Integration between logistics (SD) and finance (FI)
- Hands-on experience with SAP T-Codes and database tables
- Troubleshooting real-world issues like credit block and stock shortage

## 🚀 Future Scope
- Build an interactive O2C simulator (frontend-based)
- Integrate real-time SAP data using APIs
- Develop dashboards for sales and receivables analytics

## 📁 Project Type
Academic Capstone Project – SAP Business Data Cloud

## 👨‍💻 Author
Aryan Rana
