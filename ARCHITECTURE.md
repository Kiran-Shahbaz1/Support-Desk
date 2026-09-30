# Ticket Management Architecture

This document defines the target full-stack architecture while preserving the current Vite React frontend. The current UI remains the first client and is migrated behind API boundaries in stages; it is not rebuilt from scratch.

## Target Repository Layout

```text
Ticket-management-syatem/
├─ src/                              # Existing React/Vite frontend (preserve)
│  ├─ App.jsx                        # Current UI and temporary local workflow
│  ├─ main.jsx                       # React entrypoint
│  └─ styles.css                     # Existing design system
├─ public/                           # Frontend static assets
├─ server/
│  └─ src/
│     ├─ app.js                      # Express app, middleware, route registration
│     ├─ server.js                   # HTTP server, Socket.IO bootstrap
│     ├─ config/                     # Environment validation and app settings
│     ├─ db/                         # Prisma client and transaction helpers
│     ├─ middleware/                 # Auth, RBAC, validation, errors, rate limits
│     ├─ modules/                    # Feature modules, each owning its API logic
│     │  ├─ auth/                    # Login, refresh, logout, password reset
│     │  ├─ users/                   # Users, roles, departments, teams
│     │  ├─ tickets/                 # Ticket CRUD, comments, assignments, SLA
│     │  ├─ customers/               # Customer profiles and portal access
│     │  ├─ automations/             # Trigger, condition, action rules
│     │  ├─ notifications/           # In-app, email, and realtime notifications
│     │  ├─ reports/                 # Aggregations and exports
│     │  ├─ ai/                      # Command parsing, classification, assistant
│     │  └─ audit/                   # Immutable audit events
│     ├─ routes/                     # Versioned route composition only
│     ├─ services/                   # Cross-module integrations
│     │  ├─ email/                   # Provider adapter and templates
│     │  ├─ files/                   # Object storage and file scanning
│     │  ├─ search/                  # PostgreSQL search/query builders
│     │  └─ ai/                      # AI provider abstraction
│     ├─ jobs/                       # BullMQ queues, workers, and processors
│     │  ├─ sla.worker.js
│     │  ├─ email.worker.js
│     │  ├─ notification.worker.js
│     │  └─ report.worker.js
│     └─ realtime/                   # Socket.IO namespaces, rooms, event contracts
├─ prisma/
│  ├─ schema.prisma                 # PostgreSQL schema source of truth
│  └─ migrations/                   # Generated, committed migrations
├─ tests/
│  ├─ unit/                         # Parsers, policies, services
│  ├─ integration/                  # Express + PostgreSQL API tests
│  └─ e2e/                          # Browser workflows against running stack
├─ docker/
│  ├─ Dockerfile.web
│  ├─ Dockerfile.server
│  └─ docker-compose.yml             # PostgreSQL, Redis, server, web
├─ .github/workflows/               # CI: install, lint, test, build, migrate check
├─ .env.example                     # Shared documented variables
├─ package.json
└─ ARCHITECTURE.md
```

## Ownership Rules

- React owns presentation, optimistic UI state, and client-side navigation.
- Express owns authentication, authorization, validation, business rules, and API contracts.
- Prisma owns database access; route handlers never query PostgreSQL directly.
- Feature modules own their controllers, schemas, services, and policies.
- Redis is used for cache, rate-limit state, Socket.IO adapter state, and BullMQ.
- BullMQ workers handle SLA checks, email, notifications, exports, and AI tasks outside HTTP requests.
- Socket.IO publishes ticket, notification, assignment, and SLA events after successful transactions.
- Audit events are append-only and created by server-side business services.

## API Boundary

Version all APIs under `/api/v1`.

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/tickets
POST   /api/v1/tickets
GET    /api/v1/tickets/:id
PATCH  /api/v1/tickets/:id
POST   /api/v1/tickets/:id/comments
POST   /api/v1/tickets/:id/attachments
GET    /api/v1/tickets/:id/activity
GET    /api/v1/reports/summary
POST   /api/v1/ai/commands
POST   /api/v1/ai/classify-ticket
GET    /api/v1/notifications
```

The frontend should first call the API through a small client service. Until that service is introduced, the existing LocalStorage adapter remains the fallback.

## Data Model Direction

Core Prisma entities:

- `User`, `Role`, `Permission`, `Department`, `Team`
- `Customer`
- `Ticket`, `TicketTag`, `Tag`
- `TicketComment`, `TicketAttachment`
- `TicketActivity`, `AuditEvent`
- `SlaPolicy`, `SlaEvent`
- `AutomationRule`, `AutomationRun`
- `Notification`
- `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`
- `AiCommand`, `AiClassification`, `AiAssistantMessage`

The current ticket object maps approximately as follows:

| Current field | Target ownership |
|---|---|
| `id` | `Ticket.id` / public ticket number |
| `subject`, `description` | `Ticket` |
| `customer`, `email` | `Customer` relation |
| `module`, `department` | Ticket taxonomy and department relation |
| `priority`, `status` | Ticket enums |
| `assignee` | User relation |
| `sla`, `dueDate` | SLA policy and SLA event fields |
| `channel` | Ticket source enum |
| `tags` | `TicketTag` relation |
| `comments` | `TicketComment` rows |
| `history` | `TicketActivity` / `AuditEvent` rows |

## Security Baseline

- Argon2id or bcrypt password hashing
- Short-lived access JWT plus rotating refresh token
- RBAC checked server-side on every protected route
- Zod/Joi request validation
- Helmet, strict CORS, secure cookies where applicable
- Rate limiting backed by Redis
- File type, size, content, and authorization checks
- Parameterized Prisma queries only
- Redacted logs and no secrets in client bundles
- Append-only audit events for sensitive actions
- CSRF protection if cookie authentication is used

## Migration Plan

### Phase 0: Baseline and contracts

1. Keep the current React layout and LocalStorage behavior working.
2. Add shared ticket fixtures and API response shapes.
3. Add unit tests for the current command and ticket transformations.
4. Remove duplicated/stale VS Code tasks and add one canonical dev/build task.

### Phase 1: Server foundation

1. Add a root/server dependency boundary.
2. Add Express health endpoint: `GET /health`.
3. Add environment validation.
4. Add Prisma client and PostgreSQL connection.
5. Add Docker Compose for PostgreSQL and Redis.
6. Add structured error responses and request logging.

### Phase 2: Database and ticket API

1. Create Prisma schema and initial migration.
2. Import current LocalStorage fixture data through a seed script.
3. Implement ticket list/detail/create/update APIs.
4. Add server-side filtering, sorting, pagination, and search.
5. Add comments, activity, assignments, tags, SLA fields, and attachments metadata.

### Phase 3: Authentication and permissions

1. Add users, roles, permissions, departments, and teams.
2. Implement login, refresh, logout, password reset, and email verification.
3. Add protected frontend routes while preserving the existing screen layout.
4. Enforce RBAC in middleware and module policies.

### Phase 4: Frontend adapter migration

1. Introduce `src/services/apiClient.js`.
2. Introduce `src/services/ticketService.js` with a LocalStorage fallback.
3. Replace direct LocalStorage writes with service calls one workflow at a time.
4. Keep the current dashboard, command box, drawer, and filters visually unchanged.
5. Add loading, empty, error, retry, and unauthorized states.

### Phase 5: Realtime and async work

1. Add Socket.IO rooms per workspace/ticket.
2. Publish ticket updates, comments, assignments, and notifications.
3. Add Redis-backed BullMQ workers for SLA checks, email, notifications, and reports.
4. Add idempotency keys and retry/dead-letter handling.

### Phase 6: AI and automation

1. Add a provider-neutral AI service boundary.
2. Store parsed commands and confidence, never execute unvalidated model output directly.
3. Require schema validation and permission checks before command execution.
4. Add ticket classification, summaries, suggested replies, duplicate detection, and assistant retrieval.
5. Add automation triggers, conditions, actions, run history, and safe retry behavior.

### Phase 7: Production readiness

1. Add unit, integration, and Playwright E2E coverage.
2. Add OpenAPI documentation.
3. Add CI checks for lint, tests, build, migrations, and dependency audit.
4. Add Docker production images and deployment configuration.
5. Add backups, monitoring, error tracking, health/readiness checks, and rollback documentation.

## Preservation Constraints

Do not rewrite the existing frontend as part of backend migration. Preserve:

- Ticket Management / Ticket Desk branding
- Current sidebar views and dashboard composition
- AI Command Box placement and interaction
- Ticket list filters and detail drawer workflow
- Responsive CSS and current visual language
- Existing LocalStorage data until the migration adapter is complete
