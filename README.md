# ⚡ Distributed Job Scheduling Platform

A production-grade, distributed job scheduling platform designed for reliable asynchronous background processing, concurrency control, failure recovery with Dead Letter Queues (DLQ), and real-time observability.

---

## 📌 1. Objective & System Purpose

This project is built to solve the challenges of background job execution at scale:
- **Asynchronous Task Offloading:** Web servers offload heavy or time-consuming workloads (emails, image processing, report generation) to decoupled worker nodes.
- **Reliable Job Lifecycle:** Guarantees that jobs move deterministically through `QUEUED -> SCHEDULED -> CLAIMED -> RUNNING -> COMPLETED` (or `FAILED` / `DEAD_LETTER`).
- **Zero Duplicate Execution:** Employs PostgreSQL's `FOR UPDATE SKIP LOCKED` inside serializable transactions to guarantee atomic job claiming among multiple concurrent workers.
- **Configurable Fault Tolerance:** Supports `FIXED`, `LINEAR`, and `EXPONENTIAL` backoff retries and automatically routes unrecoverable jobs to the **Dead Letter Queue (DLQ)**.
- **Real-Time Observability:** Web dashboard powered by WebSockets for live status updates, log streaming, worker health monitoring, and manual job retries.

---

## 🏛️ 2. System Architecture

```mermaid
flowchart TD
    subgraph Clients["Clients & Users"]
        Browser["🖥️ React Dashboard - Vite & Tailwind"]
        ExternalAPI["🌐 REST API Consumers & Webhooks"]
    end

    subgraph BackendCluster["Backend API Layer - Express & Node.js"]
        AuthMiddleware["🔐 JWT & RBAC Auth"]
        APIRoutes["📡 REST Endpoints"]
        SchedulerService["⏱️ Recurring & Delayed Scheduler"]
        SocketServer["⚡ Socket.IO Live Emitter"]
    end

    subgraph DatabaseLayer["Data Persistence - PostgreSQL"]
        PG["🐘 PostgreSQL Database - Atomic Locking"]
    end

    subgraph WorkerFleet["Distributed Worker Daemon Fleet"]
        Worker1["👷 Worker Node 1"]
        Worker2["👷 Worker Node 2"]
        WorkerN["👷 Worker Node N"]
    end

    Browser <-->|"REST API + WebSockets"| BackendCluster
    ExternalAPI -->|"REST API - Bearer JWT"| BackendCluster

    BackendCluster -->|"Transactions & Queries"| PG
    SchedulerService -->|"Tick & Heartbeat Reaping"| PG

    Worker1 <-->|"Claim & Heartbeats"| BackendCluster
    Worker2 <-->|"Claim & Heartbeats"| BackendCluster
    WorkerN <-->|"Claim & Heartbeats"| BackendCluster

    Worker1 -->|"Direct DB Queries / API"| PG
```

---

## 🗄️ 3. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : contains
    ORGANIZATION ||--o{ PROJECT : owns
    PROJECT ||--o{ QUEUE : manages
    QUEUE ||--o{ JOB : contains
    QUEUE ||--o{ DEAD_LETTER_JOB : archives
    JOB ||--o{ JOB_EXECUTION : attempts
    JOB ||--o{ JOB_LOG : streams
    JOB ||--o| SCHEDULED_JOB : cron_schedule
    JOB ||--o| DEAD_LETTER_JOB : routes_to
    WORKER ||--o{ JOB_EXECUTION : executes
    WORKER ||--o{ WORKER_HEARTBEAT : emits

    ORGANIZATION {
        string id PK
        string name
        string slug UK
        datetime createdAt
    }

    USER {
        string id PK
        string email UK
        string passwordHash
        string role
        string orgId FK
    }

    PROJECT {
        string id PK
        string orgId FK
        string name
        string description
    }

    QUEUE {
        string id PK
        string projectId FK
        string name
        int priority
        int concurrencyLimit
        string retryStrategy
        int maxRetries
        int retryDelayMs
        string status
    }

    JOB {
        string id PK
        string queueId FK
        string name
        json payload
        string jobType
        string status
        int priority
        int maxRetries
        int currentAttempt
        string claimedBy FK
        datetime scheduledAt
        datetime nextRetryAt
    }

    JOB_EXECUTION {
        string id PK
        string jobId FK
        string workerId FK
        int attemptNumber
        string status
        int durationMs
        string errorMessage
    }

    DEAD_LETTER_JOB {
        string id PK
        string jobId FK
        string queueId FK
        string failureReason
        string lastError
        int attemptCount
    }

    WORKER {
        string id PK
        string hostname
        int pid
        string status
        datetime lastHeartbeatAt
        int jobsProcessed
    }
```

---

## 🧠 4. Major Design Decisions & Engineering Trade-Offs

### 1. Atomic Job Claiming: `FOR UPDATE SKIP LOCKED` vs Redis / BullMQ
- **Decision:** Used PostgreSQL native row-level locking via `SELECT ... FOR UPDATE SKIP LOCKED` in an ACID transaction.
- **Rationale:** 
  - Zero duplicate claims even under intense concurrency (proven via concurrency tests).
  - Eliminates the operational overhead and cache-invalidation risks of maintaining an external Redis cluster.
  - Transactional consistency guarantees that state updates (`status = 'CLAIMED'`) and claim assignments are strictly atomic.

### 2. Failure Recovery & Dead Letter Queue (DLQ)
- Jobs that fail calculate their next retry timestamp using the queue's retry strategy:
  - **Fixed:** `delay = baseDelay`
  - **Linear:** `delay = baseDelay * attempt`
  - **Exponential:** `delay = baseDelay * (2 ^ (attempt - 1))`
- When `currentAttempt >= maxRetries`, the job is marked `DEAD_LETTER`, logged, and persisted in `DeadLetterJob` for manual inspection, stack trace debugging, and one-click replay.

### 3. Worker Node Failover & Heartbeat Reaping
- Workers emit heartbeats every 5 seconds.
- The background `SchedulerService` runs a heartbeat monitor tick. If any worker is unresponsive for >45s:
  1. The worker status is flagged as `OFFLINE`.
  2. Any stranded `CLAIMED` / `RUNNING` jobs held by that worker are safely re-queued (`status = 'QUEUED'`), allowing healthy workers to seamlessly continue execution without deadlock.

---

## 🚀 5. Quick Start & Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or Docker)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Ensure `.env` exists with your database URL:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jobscheduler?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### Step 3: Run Database Migrations & Seed
```bash
npm run db:migrate
npm run db:seed
```

### Default Login Credentials (from Seed)
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@acme.com` | `admin123` |
| **Developer** | `developer@acme.com` | `dev123` |

### Step 4: Run the Complete System
```bash
npm run dev
```
This runs concurrently:
- **Backend API:** `http://localhost:3000`
- **Interactive Swagger Docs:** `http://localhost:3000/api/docs`
- **Frontend Dashboard:** `http://localhost:5173`
- **Distributed Worker Daemon:** Terminal process polling and executing jobs.

---

## 🧪 6. Running Automated Tests

```bash
# Run Unit Tests (Validators, Cron parser, Backoff math, JWT, Error Handlers)
npm run test:unit --prefix backend

# Run Concurrency Tests (10 concurrent workers atomic claim validation)
npm run test:concurrency --prefix backend

# Run Integration Tests (Complete API Job Lifecycle & DLQ)
npm run test:integration --prefix backend
```

---

## 📦 7. Deliverables Checklist

- [x] **Source Code:** Clean, modular TypeScript across `backend`, `worker`, `frontend`, and `tests`.
- [x] **Architecture Diagram:** Multi-tier architectural flow diagram.
- [x] **ER Diagram:** Relational entity schema with foreign keys and indices.
- [x] **Interactive API Documentation:** Available at `/api/docs` via Swagger/OpenAPI.
- [x] **Design Decisions Document:** Trade-off analysis covering atomic claiming, retry backoff, and distributed failovers.
- [x] **Automated Test Suite:** Comprehensive Unit, Concurrency, and Integration tests.
- [x] **Bonus Features:** WebSocket live streaming, Multi-tenant RBAC, Rate Limiting, Atomic Distributed Claiming.
