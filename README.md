# 🎫 DigitalSofts Support Desk — Project & Test Evidence

---
## 📌 Submission Overview & Quick Links
- **🌐 Live Demo Link:** []()
- **📂 GitHub Repository:** [https://github.com/Kiran-Shahbaz1/Support-Desk](https://github.com/Kiran-Shahbaz1/Support-Desk)
---
## 📖 Project Overview
### What Problem Does This Application Solve?
In fast-growing organizations, customer support requests often get scattered across emails, chat channels, and internal messages. This results in:
- Unclear ownership of customer issues.
- Breached Service Level Agreements (SLAs).
- Lack of visibility into support agent workloads and resolution metrics.
- High response latency and frustrated customers.
**DigitalSofts Support Desk** solves this by providing a unified, real-time command center where teams can triage, assign, track, automate, and resolve tickets efficiently—backed by automated SLA tracking, executive reports, knowledge base problem matching, and an AI-driven command assistant.
### Core Features Implemented:
- **📊 Real-Time Executive Dashboard**: High-level KPIs, open/pending/resolved counters, SLA breach alerts, and dynamic activity audit trail.
- **🎭 Multi-Role Access Control (RBAC)**: Dedicated tailored workflows for **Administrator**, **Support Agent**, and **Customer Portal**.
- **🎯 Comprehensive Ticket Lifecycle**:
  - Multi-parameter search & filtering (`status:open`, `priority:critical`, `assigned:kiran`).
  - Slide-over detail drawer & in-modal editing with safe deletion.
  - Public customer replies vs. private internal agent notes.
  - Tag management, attachment handling, and audit history.
- **📚 Smart Knowledge Base & Auto-Recommendation**:
  - Contextual knowledge articles with category filtering.
  - Exact problem-matching engine that recommends targeted solutions for matching ticket issues.
- **📈 Executive Reports & Export**:
  - Live metric breakdown by department, agent, channel, and priority.
  - One-click **CSV data export** for tickets and audit logs.
  - Formatted, print-ready report generation.
- **👥 Workspace Operations Management**: Full CRUD directory for **Customers**, **Agents**, **Teams**, and **Departments**.
- **⚡ Autonomous Automation & SLA Engine**: Custom natural-language trigger rules for SLA risk alerts and automated agent/manager assignment with steady background live sync.
- **✦ AI Workspace Assistant & Command Box**: Natural language answering for workspace inquiries and instant keyboard command execution.
- **🔐 Agent Security & Email OTP Authentication**: 6-digit verification code dispatch via Nodemailer/SMTP for secure credential updates.
- **⚙️ Centralized Operations & Settings**: Global configurations for brand identity, SLA defaults, Slack webhooks, session timeouts, and **Full System JSON Backup & Restore**.
- **🛡️ Dual-Layer Resilience**: Live REST API syncing with MySQL/Prisma and automatic `localStorage` fallback to guarantee zero UI downtime.
---
## 🛠️ Tech Stack
### Frontend
- **Core**: React 18, Vite
- **Routing**: React Router DOM (v6)
- **Forms & Validation**: React Hook Form, Zod
- **Data Visualization**: Recharts / Metric Cards
- **Styling**: Tailwind CSS & Modern Custom Design System
### Backend & Database
- **Runtime**: Node.js & Express
- **API Standard**: RESTful architecture (`/api/v1/`)
- **Database**: MySQL 8.4 & Prisma ORM (with SQLite fallback)
- **Email Service**: Nodemailer (SMTP / Gmail Integration)
- **Security**: Helmet, CORS, Express-Rate-Limit, UUID Request Tracing
### Testing & Quality Assurance
- **Unit & Integration Testing**: Node Native Test Runner
- **End-to-End (E2E) Testing**: Playwright
---
## 🚀 Installation & Setup
### 1. Frontend Setup (Standalone)
```powershell
# Install frontend dependencies
npm install
# Start development server
npm run dev

  

Runs at http://localhost:5173


  

  
2. Backend API & Database Setup

  
powershell
# Navigate to server directory
cd server
# Install backend dependencies
npm install
# Configure environment variables
Copy-Item .env.example .env
# Start development server
npm run dev

  

Runs at http://localhost:4000 (or http://localhost:5001)


  

  
3. Database Studio (Prisma Visual GUI)

  
powershell
# Open live visual database management
npm --prefix server run db:studio

  

Opens at http://localhost:5555


  

  
📡 REST API Endpoints (/api/v1)

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
Method	Endpoint	Description
GET	/health	System status and server health check
GET	/api/v1/tickets	Search, filter & paginate tickets (?status=Open&priority=High&search=invoice)
POST	/api/v1/tickets	Create a new support ticket
GET	/api/v1/tickets/:id	Get single ticket details and conversation thread
PATCH	/api/v1/tickets/:id	Update ticket status, priority, or assignee
DELETE	/api/v1/tickets/:id	Remove/archive ticket
POST	/api/v1/tickets/:id/comments	Add ticket comment or internal agent note
GET	/api/v1/tickets/:id/activity	Retrieve ticket history and audit logs
GET	/api/v1/agents	List active support staff and workload
GET	/api/v1/customers	List registered enterprise customers
POST	/api/v1/auth/send-otp	Dispatch 6-digit security OTP to agent's email
POST	/api/v1/auth/verify-otp	Verify 6-digit security OTP for credential reset
GET	/api/v1/reports/summary	Analytics & KPI aggregations

  

  
🤖 Intelligent Automation & Email Engine

  

This platform includes an autonomous background automation engine and two-way email processing (Inbound & Outbound).


  
1. Natural Language Automation Engine

  

The background runner evaluates active ticket conditions smoothly without requiring manual clicks or UI flickering.


  

  
Custom Triggers (WHEN): Evaluates priority, SLA status, keywords, channels, or unassigned state (e.g., priority is critical, unassigned, department is finance).

  
Custom Actions (THEN): Automatically reassigns staff, updates status, sets tags, or triggers manager alerts (e.g., assign to Kiran Shah, add tag Escalated, resolve ticket).

  
Loop-Safe De-duplication: Automatically prevents repeated execution loops on existing tickets.

  

  

  
2. 📥 Inbound Email Processing (Email to Ticket)

  

Customers can send an email to your support address, and the system automatically converts it into a ticket.


  

  
Webhook Endpoint: POST /api/inbound-email

  
Features:
  
  

  
Auto-detects urgency keywords (e.g., crash, urgent, down) and assigns Critical or High priority.

  
Automatically dispatches an instant receipt/acknowledgment email to the sender.

  

  
Live IMAP Email Listener: Configured in server/inboundEmailListener.js to continuously poll your support inbox.

  

  

  
3. 📤 Outbound Automated Email Alerts & Security OTP

  

  
Notification API Endpoint: POST /api/notify-ticket

  
Security Auth Endpoint: POST /api/v1/auth/send-otp

  
Default Mode: Runs in test sandbox (Ethereal Email) with live preview URLs, or connects seamlessly to Gmail/Google Workspace via App Passwords.

  

  

  
⚙️ Production Email Setup (How to Connect Company Email)

  
Step 1: Open server/emailService.js

  

Replace the test transporter with your company's SMTP server:


  
javascript
// Example for Google Workspace / Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
    pass: process.env.SUPPORT_EMAIL_APP_PASSWORD, // 16-character App Password
  },
});

  
Step 2: Open server/index.js (For Inbound Listener)

  

Update the IMAP listener credentials with your dedicated support inbox:


  
javascript
startInboundEmailListener({
  user: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
  pass: process.env.SUPPORT_EMAIL_APP_PASSWORD,
  onNewTicket: (ticket) => {
    console.log(`⚡ Auto-created Ticket #${ticket.id} from incoming email.`);
  }
});

  
Step 3: Add Credentials to server/.env

  
env
SUPPORT_EMAIL=support@yourcompany.com
SUPPORT_EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

  

  
🧪 Automated Testing & Quality Assurance

  

  
Last Verified Locally: October 2026

  
Test Environment: Node.js v24, Windows 11, SQLite / MySQL

  
Overall Status: 100% Passed (21/21 Tests Passing)

  

  
1. Frontend Command & Automation Tests

  
powershell
node --test tests/unit/automationEngine.test.js tests/unit/workspaceCommand.test.js tests/unit/workspaceCommandActions.test.js

  

Result: 14 passed, 0 failed (PASS)


  
2. Backend API Integration Tests

  
powershell
npm --prefix server test

  

Result: 6 passed, 0 failed (PASS)


  
3. Production Frontend Build

  
powershell
npm run build

  

Result: Passed (Clean build in ~900ms)


  
4. Playwright End-to-End (E2E) Test

  
powershell
npx playwright test tests/e2e/ticket-journey.spec.js

  

Result: 1 passed, 0 failed (100% PASS)


  

  
🏗️ System Architecture & Repository Layout

  

🏗️ System Architecture & Repository Layout

This application follows a modern dual-layer architecture:

- **Frontend Layer (Vite + React)**: Owns UI presentation, optimistic state, and instant LocalStorage resilience.
- **Backend API Layer (Express + Prisma)**: Owns data validation, business logic, REST endpoints (`/api/v1`), and MySQL database operations.

> 📖 **Deep Dive Documentation:**  
> For complete database schema (Prisma models), high-level Mermaid flowcharts, execution lifecycles, and network contracts, please see the full [System Architecture Document (ARCHITECTURE.md)](./ARCHITECTURE.md).

  

  
text
Ticket-Management-System/
├── src/                               # Frontend Presentation Layer (React + Vite)
│   ├── components/                    # Reusable SaaS UI components (Dashboard, Forms, Modals)
│   ├── App.jsx                        # Main Application shell, view routing & command center
│   ├── ManagementPages.jsx            # CRUD Views for Agents, Customers, KB & Departments
│   ├── OperationalPages.jsx           # Automation rules engine & Analytics reporting
│   ├── TicketDetailProfessional.jsx   # Slide-over Ticket lifecycle drawer & internal notes
│   ├── api.js                         # REST API Client with fallback adapter
│   ├── automationEngine.js            # Deterministic automation rules & SLA evaluator
│   ├── workspaceCommand.js            # Natural language command parser & intents
│   ├── workspaceCommandActions.js     # Dispatcher for command actions & state mutations
│   ├── workspaceData.js               # Seed fixture data (ERP support tickets & staff)
│   ├── useLocalStorageState.js        # Centralized resilient LocalStorage manager
│   └── main.jsx                       # React DOM entry point
├── server/                            # Backend API Layer (Node.js + Express)
│   ├── src/
│   │   ├── app.js                     # Express app setup, security headers & CORS
│   │   ├── controllers/               # Route handlers (Ticket, Customer, Agent, Reports)
│   │   ├── routes/                    # Versioned REST route composition (/api/v1)
│   │   ├── services/                  # Business logic services & data transformations
│   │   ├── models/                    # Data models & SQLite/MySQL Prisma mapping
│   │   └── middleware/                # Rate limiting, requestId tracing & error handling
│   └── tests/                         # API Integration test suite (Supertest)
├── tests/                             # Comprehensive QA Verification
│   ├── unit/                          # Unit tests for automation engine & command actions
│   └── e2e/                           # Playwright E2E User Journey test suite
├── playwright-report/                 # Generated interactive Playwright HTML report
├── Database file/                     # MySQL schema dump & database migrations
├── vercel.json                        # Multi-service cloud deployment configuration
└── package.json                       # Dependencies & npm scripts

  