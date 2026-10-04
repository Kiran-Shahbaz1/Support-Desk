# 🎫 DigitalSofts Support Desk — Project & Test Evidence
> **Applicant:** Kiran Shahbaz  
> **Position:** Full-Stack Developer Intern | DigitalSofts  
> **Assignment:** Technical Practical Assignment — DigitalSofts Support Desk  
> **Date Verified:** 2026-10-04  
---
## 📌 Submission Overview & Quick Links
- **🌐 Live Demo Link:** https://digitalsofts-support-desk.vercel.app
- **📂 GitHub Repository:** https://github.com/YOUR_USERNAME/ticket-management-system
---
## 📖 Project Overview
**DigitalSofts Support Desk** is a production-grade Support Ticket Management Dashboard designed for IT/ERP software clients. It enables support agents to triage, search, filter, create, and manage support tickets with automated SLA tracking, customer directories, activity logs, and an AI-assisted command center.
### Core Features Implemented:
- **📊 Real-time Dashboard:** KPI summary cards (Total, Open, In Progress, Resolved, Critical), status breakdown, and recent activity feed.
- **🎯 Ticket Management & List:** Comprehensive table/card view with multi-criteria search (ID, Customer, Subject), filtering (Status, Priority, Module, Assignee), and sorting.
- **📝 Create Ticket Form:** Form with required-field validation, valid email check, minimum description length, and immediate persistence.
- **🔍 Dedicated Ticket Drawer/Details:** View ticket metadata, update status (`Open` → `In Progress` → `Resolved`), change priority, reassign agents, and post internal/public comments.
- **💾 Centralized LocalStorage:** Dual-layer architecture; runs standalone via LocalStorage or synced with the backend REST API. Zero data loss on refresh.
- **📱 Fully Responsive:** Clean layout across Desktop (1440px+), Tablet (768px), and Mobile (375px).
- **⚡ Extra Bonus Features:** Natural language AI Command Box, Automation Engine, CSV export, and complete Express REST API.
---
## 🚀 Setup & Installation Instructions
### 1. Frontend Setup (Standalone)
```powershell
npm install
npm run dev

Runs at http://localhost:5173.

2. Optional Backend API Setup
powershell
cd server
npm install
Copy-Item .env.example .env
npm run dev

Runs at http://localhost:4000 with SQLite in-memory database.

📡 REST API Endpoints (/api/v1)

  
GET    /health — System status and server health

  
GET    /api/v1/tickets?status=Open&priority=High&assignee=Kiran&search=invoice — Search, filter & paginate tickets

  
POST   /api/v1/tickets — Create a new ticket

  
GET    /api/v1/tickets/:id — Get single ticket details

  
PATCH  /api/v1/tickets/:id — Update ticket status, priority, or assignee

  
DELETE /api/v1/tickets/:id — Remove ticket

  
POST   /api/v1/tickets/:id/comments — Add ticket comment/activity

  
GET    /api/v1/tickets/:id/activity — Retrieve ticket history and audit logs

  
GET    /api/v1/customers — List registered enterprise customers

  
GET    /api/v1/reports/summary — Analytics & KPI aggregations

  
🧪 Automated Test Evidence

Last Verified Locally: 2026-10-04

  Test Environment: Node.js v24, Windows 11, SQLite (in-memory)

  Overall Status: 100% Passed (20/20 Tests Passing)

1. Frontend Command & Automation Unit Tests

Command:

powershell
node --test tests/unit/automationEngine.test.js tests/unit/workspaceCommand.test.js tests/unit/workspaceCommandActions.test.js

Result: 14 passed, 0 failed (PASS)

Coverage:


  
Ticket automation rules execution & idempotency

  
Legacy rule label migration

  
Natural language command parsing

  
Agent CRUD via command dispatcher

  
Ticket creation, status updates & comments parsing

  
System settings persistence and same-tab event publishing

  
2. Backend API Integration Tests

Command:

powershell
npm --prefix server test

Result: 6 passed, 0 failed (PASS)

Coverage:


  
Health endpoint & request ID tracing

  
Complete Ticket CRUD (create, list, filter, update, delete)

  
Activity log & comment appending

  
Customer & reports rollup aggregations

  
Input validation and 404 missing-record handling

  
Security: Disallowed CORS origins protection (403 Forbidden with CORS_ORIGIN_DENIED)

  
3. Production Frontend Build

Command:

powershell
npm run build

Result: PASSED

Terminal Output:

text
vite v8.3.1 building client environment for production...
✓ 38 modules transformed.
dist/index.html                   0.48 kB │ gzip:   0.31 kB
dist/assets/index-F91HTXry.css  263.29 kB │ gzip:  38.74 kB
dist/assets/index-CQL4wYwa.js   387.00 kB │ gzip: 113.93 kB
✓ built in 908ms
4. Browser UI & Persistence Verification

  
LocalStorage Integrity: Data persists across browser refresh (Tickets, Comments, Status, Priority, and Settings).

  
Responsive Layout: Tested across Desktop (1440px+), Tablet (768px), and Mobile (375px) breakpoints.

  
User Journey Verified: Create Ticket ➔ Search/Filter ➔ Open Drawer ➔ Change Status/Priority ➔ Add Comment ➔ Browser Refresh verification.

  
