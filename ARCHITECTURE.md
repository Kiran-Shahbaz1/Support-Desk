🎟️ Ticket Management System — Current System Architecture

System Status: Active Full-Stack Architecture
Frontend: React + Vite (http://localhost:5173)
Backend API: Node.js + Express (http://localhost:5001)
ORM & Database: Prisma ORM + MySQL (localhost:3306)

1. High-Level Architecture Diagram
2. Repository Layout & Directory Structure
text
Ticket-management-syatem/
├── src/                                  # Frontend Source (React + Vite)
│   ├── App.jsx                           # Core Dashboard, Ticket Desk, AI Command Box
│   ├── main.jsx                          # React DOM Root Entry Point
│   ├── styles.css                        # Complete Design System (Light/Dark themes)
│   ├── services/                         # (API client & LocalStorage fallback helpers)
│   └── components/                       # Modal, Drawer, Table, & Card components
├── public/                               # Static Frontend Assets
├── server/                               # Backend Application
│   ├── src/
│   │   ├── app.js                        # Express configurations, CORS, Route registration
│   │   ├── server.js                     # Server entry point (Listening on Port 5001)
│   │   ├── routes/                       # Express Route Handlers (tickets, users, auth)
│   │   ├── controllers/                  # Business logic & request validation
│   │   └── lib/
│   │       └── prisma.js                 # Prisma Client instance singleton
├── prisma/
│   ├── schema.prisma                     # Prisma schema source of truth (MySQL Provider)
│   └── migrations/                       # Committed database schema migrations
├── .env                                  # Environment variables (PORT=5001, DATABASE_URL)
├── index.html                            # HTML5 Template
├── package.json                          # Dependencies & build scripts
└── vite.config.js                        # Vite bundler & dev server config
3. Technology Stack & Specifications
Layer	Technology	Specification / Configuration
Frontend Framework	React (v18/19)	Functional Components, Hooks (useState, useEffect, useMemo)
Build & Dev Tool	Vite	Dev Server running on http://localhost:5173
Styling & UI	Custom CSS (styles.css)	Custom Design System, Responsive grid, Modal/Drawers
Client Storage	LocalStorage API	Local ticket cache, offline fallback state
Backend Runtime	Node.js + Express.js	RESTful JSON API running on Port 5001
Database ORM	Prisma ORM	Type-safe database queries, schema migrations, introspection
Database Engine	MySQL (v8.0+)	Relational Database running on default port 3306
Protocol	HTTP / JSON	RESTful API communication between 5173 and 5001
4. Database Architecture (Prisma & MySQL Schema)
Prisma Datasource Configuration (prisma/schema.prisma):
prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
generator client {
  provider = "prisma-client-js"
}
enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
model User {
  id        Int       @id @default(autoincrement())
  name      String
  email     String    @unique
  role      String    @default("agent") // admin, agent, customer
  tickets   Ticket[]  @relation("AssignedTickets")
  comments  Comment[]
  createdAt DateTime  @default(now())
}
model Ticket {
  id          Int          @id @default(autoincrement())
  subject     String
  description String       @db.Text
  status      TicketStatus @default(OPEN)
  priority    Priority     @default(MEDIUM)
  department  String?
  customer    String
  email       String
  assignedTo  User?        @relation("AssignedTickets", fields: [userId], references: [id])
  userId      Int?
  comments    Comment[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
model Comment {
  id        Int      @id @default(autoincrement())
  message   String   @db.Text
  ticket    Ticket   @fields: [ticketId], references: [id], onDelete: Cascade)
  ticketId  Int
  user      User?    @fields: [userId], references: [id])
  userId    Int?
  createdAt DateTime @default(now())
}
5. API Specification & Network Contracts

All backend routes are served from http://localhost:5001:

Method	Endpoint	Description	Data Handled
GET	/api/tickets	Fetch all tickets	Returns Array of tickets with status & priorities
POST	/api/tickets	Create a new ticket	Receives { subject, description, priority, customer, email }
GET	/api/tickets/:id	Get single ticket details	Returns ticket details with related comments
PATCH	/api/tickets/:id	Update ticket details	Updates status (OPEN/CLOSED), priority, or assignee
DELETE	/api/tickets/:id	Delete ticket	Deletes record from MySQL via Prisma
POST	/api/tickets/:id/comments	Add comment	Adds conversation comment to ticket
6. End-to-End Execution Workflow

User Interaction (Frontend - 5173):

User browser mein http://localhost:5173 load karta hai.
Dashboard aur tickets display hote hain. Agar user koi action kare (e.g. naya ticket create kare ya AI Command run kare), to React state update hoti hai.

Network Request (Frontend ➔ Backend 5001):

React frontend fetch ya axios ke zariye request http://localhost:5001/api/tickets par bhejta hai.
Express backend CORS allow karta hai (http://localhost:5173 ke liye).

Data Layer (Backend ➔ Prisma ➔ MySQL 3306):

Express Route controller data validate karta hai.
Prisma Client type-safe query run karta hai:
javascript
const tickets = await prisma.ticket.findMany({ include: { assignedTo: true } });
Data MySQL database mein safely query / persist hota hai.

Response & Client Sync:

Backend response JSON format mein return karta hai (200 OK / 201 Created).
React UI update hoti hai aur backup ke taur par LocalStorage mein sync ho jati hai taake refresh karne par data loss na ho.
7. Environment Configuration (.env)
env
# Backend Server Configuration
PORT=5001
# MySQL Database Connection URL (Prisma format)
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/ticket_management"
# Frontend Origin for CORS
CLIENT_ORIGIN="http://localhost:5173"