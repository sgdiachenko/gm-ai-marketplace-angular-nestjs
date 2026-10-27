# Mermaid Diagram Examples

Ready-to-use templates for an Angular frontend with a NestJS API on MongoDB, using a neutral orders domain. Rename the participants and entities to the project's own.

---

## 1. Flowchart — Order Creation Flow

```mermaid
flowchart TD
    A((User)) --> B[Fill order form]
    B --> C{Form valid?}
    C -->|No| D[Show field errors]
    D --> B
    C -->|Yes| E[Controller calls OrdersApi.create]
    E --> F{API response}
    F -->|400| G[Map server errors to fields]
    G --> B
    F -->|201| H[Update the orders signal]
    H --> I[Navigate to the order page]
```

---

## 2. Sequence Diagram — Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Client as Angular app
    participant Server as NestJS API
    participant DB as MongoDB

    User->>Client: Enter credentials
    Client->>Server: POST /v1/auth/login
    activate Server
    Server->>Server: ValidationPipe checks LoginDto
    Server->>DB: findOne({ email })
    DB-->>Server: User document
    Server->>Server: verify password hash
    alt Valid credentials
        Server->>Server: JwtService.signAsync({ sub, role })
        Server-->>Client: 200, Set-Cookie (HttpOnly)
        Client->>Client: Session signal = signed in
    else Invalid credentials
        Server-->>Client: 401 Invalid credentials
    end
    deactivate Server
```

---

## 3. Sequence Diagram — NestJS Request Pipeline

```mermaid
sequenceDiagram
    participant Client as Angular app
    participant Thr as ThrottlerGuard
    participant Auth as AuthGuard
    participant Pipe as ValidationPipe
    participant Ctrl as OrdersController
    participant Svc as OrdersService
    participant DB as MongoDB

    Client->>Thr: POST /v1/orders
    alt Rate limit exceeded
        Thr-->>Client: 429 Too Many Requests
    else Within limit
        Thr->>Auth: canActivate
        Auth->>Auth: verify token
        alt Token invalid or expired
            Auth-->>Client: 401 Unauthorized
        else Token valid
            Auth->>Pipe: request.user set
            Pipe->>Pipe: validate CreateOrderDto (whitelist)
            alt Validation fails
                Pipe-->>Client: 400 { message: [...] }
            else Valid input
                Pipe->>Ctrl: create(dto, user)
                Ctrl->>Svc: place(user.id, dto)
                Svc->>DB: orders.create({...})
                DB-->>Svc: Order document
                Svc-->>Ctrl: OrderResponse
                Ctrl-->>Client: 201 OrderResponse
            end
        end
    end
```

---

## 4. ER Diagram — Orders Schema

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string email UK "unique, lowercase"
        string passwordHash "argon2id"
        string role "enum: customer, admin"
        date createdAt
    }

    ORDER {
        ObjectId _id PK
        ObjectId ownerId FK
        string status "enum: placed, paid, cancelled"
        number total
        date placedAt
    }

    ORDER_LINE {
        ObjectId _id PK
        ObjectId orderId FK
        string sku
        number quantity
        number price
    }

    USER ||--o{ ORDER : "places"
    ORDER ||--|{ ORDER_LINE : "contains"
```

---

## 5. State Diagram — Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Placed: Customer places order
    Placed --> Paid: Payment confirmed
    Placed --> Cancelled: Customer cancels within 30 min
    Paid --> Shipped: Warehouse ships
    Paid --> Refunded: Admin refunds
    Shipped --> [*]
    Cancelled --> [*]
    Refunded --> [*]
```

---

## 6. Flowchart — File Upload Pipeline

```mermaid
flowchart LR
    A[Client sends file] --> B{FileInterceptor limits}
    B -->|Too large| C[Reject: 413]
    B -->|OK| D{ParseFilePipe: MIME and magic bytes}
    D -->|Invalid| E[Reject: 400]
    D -->|Valid| F[Generate server filename]
    F --> G[Store outside the source tree]
    G --> H[Save path on the document]
    H --> I[Return 201]

    style C fill:#ff6b6b,color:#fff
    style E fill:#ff6b6b,color:#fff
    style I fill:#51cf66,color:#fff
```

---

## 7. Flowchart — Error Handling in NestJS

```mermaid
flowchart TD
    A[Request] --> B[Controller → service]
    B --> C{Outcome}
    C -->|Success| D[Return response shape]
    C -->|HttpException| E[Nest maps status and message]
    C -->|Domain error| F[DomainErrorFilter maps to 4xx]
    C -->|Unknown error| G[Default filter: generic 500]
    F --> H[Log code and context]
    G --> I[Log full error internally]
```

---

## 8. Class Diagram — Frontend MVP Roles

```mermaid
classDiagram
    class OrderListView {
        +controller OrderListController
    }

    class OrderListController {
        +orders Signal~Order[]~
        +privateCount Signal~number~
        +load() Promise~void~
        +add(draft) Promise~void~
    }

    class OrdersRepository {
        +list(scope) Promise~Order[]~
        +create(draft) Promise~void~
    }

    class OrdersApi {
        +get(path) Promise~OrderDto[]~
        +post(path, body) Promise~StatusDto~
    }

    OrderListView --> OrderListController : binds signals, forwards events
    OrderListController --> OrdersRepository : uses
    OrdersRepository --> OrdersApi : maps DTOs
```

---

## 9. Flowchart — CORS Request Flow

```mermaid
flowchart TD
    A[Browser sends request] --> B{Origin header present?}
    B -->|No| C[Allow: server-to-server]
    B -->|Yes| D{Origin in enableCors allowlist?}
    D -->|Yes| E[Set Access-Control-Allow-Origin]
    D -->|No| F[CORS error: blocked]
    E --> G{Preflight OPTIONS?}
    G -->|Yes| H[Return allowed methods and headers]
    G -->|No| I[Process request normally]

    style F fill:#ff6b6b,color:#fff
```

---

## 10. Gantt Chart — Feature Implementation Plan

```mermaid
gantt
    dateFormat YYYY-MM-DD
    title Order Cancellation

    section API
        DTOs and contract        :done, dto, 2026-01-05, 1d
        Cancel rule (pure)       :done, rule, after dto, 1d
        Service and controller   :active, api, after rule, 2d
        Unit and e2e tests       :apitest, after api, 2d

    section Angular
        API service and model    :web1, after dto, 1d
        Controller with signals  :web2, after web1, 2d
        View and dialog          :web3, after web2, 2d
        Controller tests         :webtest, after web2, 2d

    section Review
        Architecture and security review :rev, after apitest, 1d
```

---

## 11. Mindmap — Project Architecture

```mermaid
mindmap
  root((Orders app))
    Client
      Angular
      Signals
      HttpClient
      Router with lazy routes
      Vitest unit tests
    Server
      NestJS
      Mongoose
      ValidationPipe and DTOs
      Guards
      ConfigModule
    Database
      MongoDB
      Docker Compose
    Features
      Order list
      Order creation
      Cancellation
```

---

## 12. Pie Chart — OWASP Vulnerability Distribution

```mermaid
pie title OWASP Top 10:2025 App Impact
    "Broken Access Control" : 3.73
    "Security Misconfiguration" : 3.00
    "Cryptographic Failures" : 3.80
    "Injection" : 2.50
    "Insecure Design" : 2.00
    "Auth Failures" : 1.80
    "Integrity Failures" : 1.50
    "Logging Failures" : 1.20
    "Exceptional Conditions" : 1.00
    "Supply Chain" : 0.80
```
