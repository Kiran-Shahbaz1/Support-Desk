# 🎫 DigitalSofts Support Desk — Project & Test Evidence

> **Applicant:** Kiran Shahbaz  
> **Position:** Full-Stack Developer Intern | DigitalSofts  
> **Assignment:** Technical Practical Assignment — DigitalSofts Support Desk  
> **Date Verified:** 2026-10-04  

---

## 📌 Submission Overview & Quick Links

- **🌐 Live Demo Link:** [https://ticket-management-system-two-sooty.vercel.app/](https://ticket-management-system-two-sooty.vercel.app/)
- **📂 GitHub Repository:** [https://github.com/wk5629/Ticket-Management-System](https://github.com/wk5629/Ticket-Management-System)

---

## 📖 Project Overview

**DigitalSofts Support Desk** is a production-grade Support Ticket Management Dashboard designed for IT/ERP software clients. It enables support agents to triage, search, filter, create, and manage support tickets with automated SLA tracking, customer directories, activity logs, and an AI-assisted command center.

### Core Features Implemented:
- **📊 Real-time Dashboard:** KPI summary cards (Total, Open, In Progress, Resolved, Critical), status breakdown, and recent activity feed.
- **🎯 Ticket Management & List:** Comprehensive table/card view with multi-criteria search (ID, Customer, Subject), filtering (Status, Priority, Module, Assignee), and sorting.
- **📝 Create Ticket Form:** Form with required-field validation, valid email check, minimum description length, and immediate persistence.
- **🔍 Dedicated Ticket Drawer/Details:** View ticket metadata, update status (`Open` → `In Progress` → `Resolved`), change priority, reassign agents, and post internal/public comments.
- **💾 Centralized Persistence:** Dual-layer architecture; runs standalone via LocalStorage or synced with MySQL database through Express REST API and Prisma. Zero data loss on refresh.
- **📱 Fully Responsive:** Clean layout across Desktop (1440px+), Tablet (768px), and Mobile (375px).
- **⚡ Extra Bonus Features:** Natural language AI Command Box, autonomous Automation Engine, live CSV export, and complete Express REST API.

---

## 🚀 Setup & Installation Instructions

### 1. Frontend Setup (Standalone)

```powershell
# Install frontend dependencies
npm install

# Start development server
npm run dev
```

*Runs at `http://localhost:5173`*

---

### 2. Backend API & Database Setup

```powershell
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Configure environment variables
Copy-Item .env.example .env

# Start development server
npm run dev
```

*Runs at `http://localhost:4000` (or `http://localhost:5001`)*

---

### 3. Database Studio (Prisma Visual GUI)

```powershell
# Open live visual database management
npm --prefix server run db:studio
```

*Opens at `http://localhost:5555`*

---

## 📡 REST API Endpoints (/api/v1)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System status and server health check |
| `GET` | `/api/v1/tickets` | Search, filter & paginate tickets (`?status=Open&priority=High&search=invoice`) |
| `POST` | `/api/v1/tickets` | Create a new support ticket |
| `GET` | `/api/v1/tickets/:id` | Get single ticket details and conversation thread |
| `PATCH` | `/api/v1/tickets/:id` | Update ticket status, priority, or assignee |
| `DELETE` | `/api/v1/tickets/:id` | Remove/archive ticket |
| `POST` | `/api/v1/tickets/:id/comments` | Add ticket comment or internal agent note |
| `GET` | `/api/v1/tickets/:id/activity` | Retrieve ticket history and audit logs |
| `GET` | `/api/v1/customers` | List registered enterprise customers |
| `GET` | `/api/v1/reports/summary` | Analytics & KPI aggregations |

---

## 🤖 Intelligent Automation & Email Engine

This platform includes an autonomous background automation engine and two-way email processing (Inbound & Outbound).

### 1. Natural Language Automation Engine

The background runner evaluates active ticket conditions every 8 seconds without requiring manual clicks.

- **Custom Triggers (WHEN):** Evaluates priority, SLA status, keywords, channels, or unassigned state (e.g., `priority is critical`, `unassigned`, `department is finance`).
- **Custom Actions (THEN):** Automatically reassigns staff, updates status, sets tags, or triggers manager alerts (e.g., `assign to Kiran Shah`, `add tag Escalated`, `resolve ticket`).
- **Loop-Safe De-duplication:** Automatically prevents repeated execution loops on existing tickets.

---

### 2. 📥 Inbound Email Processing (Email to Ticket)

Customers can send an email to your support address, and the system automatically converts it into a ticket.

- **Webhook Endpoint:** `POST /api/inbound-email`
- **Features:**
  - Auto-detects urgency keywords (e.g., `crash`, `urgent`, `down`) and assigns **Critical** or **High** priority.
  - Automatically dispatches an instant receipt/acknowledgment email to the sender.
- **Live IMAP Email Listener:** Configured in `server/inboundEmailListener.js` to continuously poll your support inbox.

---

### 3. 📤 Outbound Automated Email Alerts

When high-priority tickets are created or automations trigger, outbound email notifications are dispatched.

- **API Endpoint:** `POST /api/notify-ticket`
- **Default Mode:** Runs in test sandbox (Ethereal Email) with live preview URLs in console logs.

---

### ⚙️ Production Email Setup (How to Connect Company Email)

To switch from the sandbox test environment to your company's live official email:

#### Step 1: Open server/emailService.js

Replace the test transporter with your company's SMTP server:

```javascript
// Example for Google Workspace / Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
    pass: process.env.SUPPORT_EMAIL_APP_PASSWORD, // 16-character App Password
  },
});
```

#### Step 2: Open server/index.js (For Inbound Listener)

Update the IMAP listener credentials with your dedicated support inbox:

```javascript
startInboundEmailListener({
  user: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
  pass: process.env.SUPPORT_EMAIL_APP_PASSWORD,
  onNewTicket: (ticket) => {
    console.log(`⚡ Auto-created Ticket #${ticket.id} from incoming email.`);
  }
});
```

#### Step 3: Add Credentials to server/.env

```env
SUPPORT_EMAIL=support@yourcompany.com
SUPPORT_EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

*(Note: For Gmail, generate an App Password from Google Account Security > 2-Step Verification).*

---

## 🧪 Automated Test Evidence

- **Last Verified Locally:** 2026-10-04
- **Test Environment:** Node.js v24, Windows 11, SQLite / MySQL
- **Overall Status:** 100% Passed (20/20 Tests Passing)

### 1. Frontend Command & Automation Unit Tests

**Command:**

```powershell
node --test tests/unit/automationEngine.test.js tests/unit/workspaceCommand.test.js tests/unit/workspaceCommandActions.test.js
```

**Result:** 14 passed, 0 failed (PASS)  
**Coverage:**
- Ticket automation rules execution & idempotency
- Legacy rule label migration
- Natural language command parsing
- Agent CRUD via command dispatcher
- Ticket creation, status updates & comments parsing
- System settings persistence and same-tab event publishing

---

### 2. Backend API Integration Tests

**Command:**

```powershell
npm --prefix server test
```

**Result:** 6 passed, 0 failed (PASS)  
**Coverage:**
- Health endpoint & request ID tracing
- Complete Ticket CRUD (create, list, filter, update, delete)
- Activity log & comment appending
- Customer & reports rollup aggregations
- Input validation and 404 missing-record handling
- Security: Disallowed CORS origins protection (`403 Forbidden with CORS_ORIGIN_DENIED`)

---

### 3. Production Frontend Build

**Command:**

```powershell
npm run build
```

**Result:** PASSED  
**Terminal Output:**

```text
vite v8.3.1 building client environment for production...
✓ 38 modules transformed.
dist/index.html                   0.48 kB │ gzip:   0.31 kB
dist/assets/index-F91HTXry.css  263.29 kB │ gzip:  38.74 kB
dist/assets/index-CQL4wYwa.js   387.00 kB │ gzip: 113.93 kB
✓ built in 908ms
```

---

### 4. Browser UI & Persistence Verification

- **LocalStorage Integrity:** Data persists across browser refresh (Tickets, Comments, Status, Priority, and Settings).
- **Responsive Layout:** Tested across Desktop (1440px+), Tablet (768px), and Mobile (375px) breakpoints.
- **User Journey Verified:** Create Ticket ➔ Search/Filter ➔ Open Drawer ➔ Change Status/Priority ➔ Add Comment ➔ Browser Refresh verification.