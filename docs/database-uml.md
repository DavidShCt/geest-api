# Database UML

```mermaid
erDiagram

    USERS ||--o{ TASK_USERS : "is assigned through"
    TASKS ||--o{ TASK_USERS : "has assignments"
    TASKS ||--o{ NOTIFICATIONS : "generates"

    USERS {
        INT_UNSIGNED id PK
        VARCHAR_100 name
        VARCHAR_100 last_name
        VARCHAR_255 email UK
        DATETIME created_at
        DATETIME updated_at
    }

    TASKS {
        INT_UNSIGNED id PK
        VARCHAR_255 title
        TEXT description "NULL"
        ENUM_open_archived status
        DATETIME archived_at "NULL"
        DATETIME created_at
        DATETIME updated_at
    }

    TASK_USERS {
        INT_UNSIGNED id PK
        INT_UNSIGNED task_id FK
        INT_UNSIGNED user_id FK
        BOOLEAN completed
        DATETIME completed_at "NULL"
        DATETIME created_at
        DATETIME updated_at
    }

    NOTIFICATIONS {
        INT_UNSIGNED id PK
        INT_UNSIGNED task_id FK
        INT_UNSIGNED attempt
        INT status_code "NULL"
        DATETIME attempted_at
        DATETIME created_at
    }

    IDEMPOTENCY_KEYS {
        INT_UNSIGNED id PK
        VARCHAR_255 key
        VARCHAR_10 method
        VARCHAR_255 route
        VARCHAR_64 request_hash
        INT status_code "NULL"
        JSON response_body "NULL"
        DATETIME created_at
    }
```

## Relationships

- `USERS 1:N TASK_USERS`
- `TASKS 1:N TASK_USERS`
- Therefore, `USERS N:M TASKS` through `TASK_USERS`.
- `TASKS 1:N NOTIFICATIONS`.
- `IDEMPOTENCY_KEYS` is an independent operational table used to guarantee idempotent POST requests.

## Constraints

### users

```text
PRIMARY KEY (id)
UNIQUE (email)
```

### task_users

```text
PRIMARY KEY (id)
FOREIGN KEY (task_id) REFERENCES tasks(id)
FOREIGN KEY (user_id) REFERENCES users(id)

UNIQUE (task_id, user_id)

ON UPDATE CASCADE
ON DELETE CASCADE
```

### notifications

```text
PRIMARY KEY (id)
FOREIGN KEY (task_id) REFERENCES tasks(id)

UNIQUE (task_id, attempt)

ON UPDATE CASCADE
ON DELETE CASCADE
```

### idempotency_keys

```text
PRIMARY KEY (id)

UNIQUE (key, method, route)
```

`status_code` and `response_body` are nullable because `NULL` represents an idempotent operation that has been reserved but has not finished processing yet.

## Business Rules Represented by the Model

`TASK_USERS` stores the completion state of every user assigned to a task:

```text
completed = false
completed_at = NULL
```

When the user completes their participation:

```text
completed = true
completed_at = timestamp
```

When all assignments for a task are completed:

```text
tasks.status = archived
tasks.archived_at = timestamp
```

Archiving triggers the notification mechanism.

Every notification attempt is recorded in `NOTIFICATIONS`:

```text
task_id
attempt
status_code
attempted_at
```

If the external destination does not return an HTTP response:

```text
status_code = NULL
```

`IDEMPOTENCY_KEYS` stores the request identity and final response so duplicated POST requests can safely return the original result instead of executing the operation twice.