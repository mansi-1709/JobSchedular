# System Architecture & Technical Specifications

## 1. System Overview
The **Distributed Job Scheduler** is a decoupled, multi-tier background execution engine built with **Node.js, Express, TypeScript, PostgreSQL (via Prisma), Socket.IO, and React**.

The platform is designed to:
1. Allow web clients to push compute-heavy or delayed tasks asynchronously.
2. Execute tasks concurrently across multiple autonomous worker nodes.
3. Guarantee that each job is processed exactly once without race conditions or duplicate claims.
4. Provide real-time operational visibility through WebSockets.

---

## 2. Architecture Diagram

```mermaid
flowchart TD
    subgraph Clients["Clients & Users"]
        Browser["🖥️ React Dashboard - Vite & Tailwind"]
        ExternalAPI["🌐 REST API Consumers & Webhooks"]
    end

    subgraph APILayer["Backend API Layer - Express & Node.js"]
        Router["HTTP Router"]
        AuthGuard["JWT & RBAC Middleware"]
        Scheduler["⏱️ Background Scheduler Engine"]
        SocketEngine["⚡ Socket.IO Event Broadcaster"]
    end

    subgraph DataPlane["Data Persistence - PostgreSQL"]
        DB["🐘 PostgreSQL Engine - Atomic Locking"]
    end

    subgraph WorkerPlane["Distributed Worker Fleet"]
        W1["👷 Worker Node 1"]
        W2["👷 Worker Node 2"]
        WN["👷 Worker Node N"]
    end

    Browser <-->|"REST API + WebSockets"| APILayer
    APIClient -->|"REST API - Bearer JWT"| APILayer

    APILayer <-->|"Prisma ORM Queries"| DB
    Scheduler -->|"Cron & Delayed Promotion"| DB

    W1 <-->|"Claim Jobs & Send Heartbeats"| APILayer
    W2 <-->|"Claim Jobs & Send Heartbeats"| APILayer
    WN <-->|"Claim Jobs & Send Heartbeats"| APILayer

    W1 -->|"Stream Execution Logs"| APILayer
    W2 -->|"Stream Execution Logs"| APILayer
    WN -->|"Stream Execution Logs"| APILayer
```

---

## 3. Component Details

### A. Backend API Layer (`backend/src/`)
- **Control Plane:** Handles project management, queue configuration (concurrency, retry policies, priorities), job ingestion (immediate, delayed, scheduled, batch), and DLQ inspection.
- **Scheduler Engine (`scheduler.service.ts`):** 
  - Ticks every 5 seconds.
  - Promotes `SCHEDULED` jobs whose `scheduledAt <= NOW()` to `QUEUED`.
  - Evaluates cron expressions for recurring jobs and schedules the next run.
  - Heartbeat monitor: flags workers without heartbeats for >45s as `OFFLINE` and safely re-queues orphaned jobs.
- **Real-Time Gateway (`socket.service.ts`):** Emits status updates, worker health, and log streams to subscribed browser clients.

### B. Distributed Worker Service (`worker/src/`)
- **Autonomous Poller (`poller.ts`):** Polls active queues respecting queue priority and concurrency limits.
- **Atomic Claiming (`job.repository.ts`):** Calls PostgreSQL `FOR UPDATE SKIP LOCKED` inside a serializable transaction to claim jobs with zero locks/conflicts.
- **Execution Pipeline (`executor.ts`):** Executes task logic, streams live execution logs to the API, measures runtime `durationMs`, and handles error bubbling.
- **Heartbeat Emitter (`heartbeat.ts`):** Emits heartbeats every 5s containing worker PID, active job IDs, and processed job counts.
- **Graceful Shutdown:** Intercepts `SIGINT` / `SIGTERM`, deregisters from the backend API, and allows in-flight jobs to finish cleanly.

---

## 4. Entity-Relationship (ER) Schema

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

## 5. Job Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> QUEUED : Immediate Job / Batch
    [*] --> SCHEDULED : Delayed / Recurring Job
    
    SCHEDULED --> QUEUED : scheduledAt <= NOW() / Cron Triggered
    
    QUEUED --> CLAIMED : Worker Atomic Claim (FOR UPDATE SKIP LOCKED)
    CLAIMED --> RUNNING : Worker Execution Started
    
    RUNNING --> COMPLETED : Execution Success
    RUNNING --> SCHEDULED : Execution Failed (attempt < maxRetries) with Backoff
    RUNNING --> DEAD_LETTER : Execution Failed (attempt >= maxRetries)
    
    DEAD_LETTER --> QUEUED : Manual / API Re-queue Triggered
    
    COMPLETED --> [*]
    DEAD_LETTER --> [*]
```
