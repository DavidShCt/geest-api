# GEEST API Documentation

This document describes the available GEEST API endpoints and the main behaviors associated with them.

## Base URL

Local development:

```text
http://localhost:3000
```

All request and response bodies use JSON unless otherwise specified.

---

# Idempotency

Write operations require the HTTP header:

```http
Idempotency-Key: <unique-key>
```

Example:

```http
Idempotency-Key: create-user-001
```

The API associates the key with:

- HTTP method.
- Request route.
- SHA-256 hash of the normalized request body.
- Response status code.
- Response body.

Repeating the same operation using the same key and body returns the previously stored response without executing the operation again.

Using the same key for the same route and method with a different request body returns:

```http
409 Conflict
```

Example:

```json
{
    "error": {
        "code": "IDEMPOTENCY_KEY_REUSED",
        "message": "The Idempotency-Key was already used with a different request body."
    }
}
```

Read-only `GET` operations do not require an `Idempotency-Key`.

---

# Users

## Create User

```http
POST /users
```

Creates a new user.

### Headers

```http
Content-Type: application/json
Idempotency-Key: create-user-001
```

### Request

```json
{
    "name": "David",
    "lastName": "González",
    "email": "david@example.com"
}
```

### Successful Response

```http
201 Created
```

```json
{
    "id": 1,
    "name": "David",
    "lastName": "González",
    "email": "david@example.com"
}
```

### Validation Errors

Missing name:

```json
{
    "error": {
        "code": "NAME_REQUIRED",
        "message": "Name is required."
    }
}
```

Missing last name:

```json
{
    "error": {
        "code": "LAST_NAME_REQUIRED",
        "message": "Last name is required."
    }
}
```

Missing email:

```json
{
    "error": {
        "code": "EMAIL_REQUIRED",
        "message": "Email is required."
    }
}
```

Invalid email addresses are rejected by model validation.

---

## List Users

```http
GET /users
```

Returns all users.

Each user includes their pending tasks.

### Successful Response

```http
200 OK
```

```json
[
    {
        "id": 1,
        "name": "David",
        "lastName": "González",
        "email": "david@example.com",
        "pendingTasks": [
            {
                "id": 1,
                "title": "Prepare report",
                "description": "Prepare monthly report",
                "status": "open"
            }
        ]
    }
]
```

If the user has no pending tasks:

```json
[
    {
        "id": 1,
        "name": "David",
        "lastName": "González",
        "email": "david@example.com",
        "pendingTasks": []
    }
]
```

This endpoint does not require an `Idempotency-Key`.

---

## Get Tasks Assigned to User

```http
GET /users/:idUser/tasks
```

Returns every task assigned to a specific user and indicates whether that user has completed each task.

### Example

```http
GET /users/1/tasks
```

### Successful Response

```http
200 OK
```

```json
[
    {
        "id": 1,
        "title": "Prepare report",
        "description": "Prepare monthly report",
        "status": "open",
        "completed": false
    },
    {
        "id": 2,
        "title": "Review documentation",
        "description": "Review project documentation",
        "status": "open",
        "completed": true
    }
]
```

If the user exists but has no assigned tasks:

```json
[]
```

### User Not Found

```http
404 Not Found
```

```json
{
    "error": {
        "code": "USER_NOT_FOUND",
        "message": "User not found."
    }
}
```

---

# Tasks

## Create Task

```http
POST /tasks
```

Creates a task.

### Headers

```http
Content-Type: application/json
Idempotency-Key: create-task-001
```

### Example Request

```json
{
    "title": "Prepare report",
    "description": "Prepare monthly report"
}
```

New tasks use the `open` status by default.

This operation is idempotent.

---

## List Tasks

```http
GET /tasks
```

Returns the available tasks.

Without pagination, the endpoint preserves the original array response:

```json
[
    {
        "id": 1,
        "title": "Prepare report",
        "description": "Prepare monthly report",
        "status": "open",
        "archivedAt": null,
        "users": []
    }
]
```

### Filter by Status

Tasks can be filtered using:

```http
GET /tasks?status=open
```

or:

```http
GET /tasks?status=archived
```

Supported values are:

```text
open
archived
```

An unsupported value returns:

```http
400 Bad Request
```

---

## Task Pagination

Pagination is optional.

Both `page` and `limit` must be provided together.

Example:

```http
GET /tasks?page=1&limit=10
```

### Response

```json
{
    "data": [
        {
            "id": 1,
            "title": "Prepare report",
            "description": "Prepare monthly report",
            "status": "open",
            "archivedAt": null,
            "users": []
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 10,
        "totalItems": 1,
        "totalPages": 1
    }
}
```

Pagination can be combined with status filtering:

```http
GET /tasks?status=open&page=1&limit=10
```

`totalItems` and `totalPages` are calculated after applying the requested status filter.

### Invalid Page

For example:

```http
GET /tasks?page=0&limit=10
```

returns:

```http
400 Bad Request
```

with error code:

```text
INVALID_PAGE
```

### Invalid Limit

For example:

```http
GET /tasks?page=1&limit=0
```

returns error code:

```text
INVALID_LIMIT
```

### Missing Pagination Parameter

For example:

```http
GET /tasks?page=1
```

returns error code:

```text
PAGINATION_PARAMS_REQUIRED
```

---

## Get Task by ID

```http
GET /tasks/:idTask
```

Returns a specific task.

Example:

```http
GET /tasks/1
```

If the task does not exist:

```http
404 Not Found
```

```json
{
    "error": {
        "code": "TASK_NOT_FOUND",
        "message": "Task not found."
    }
}
```

---

## Assign Users to Task

```http
POST /tasks/:idTask/assign
```

Assigns users to a task.

This operation requires an `Idempotency-Key`.

Example:

```http
POST /tasks/1/assign
```

### Headers

```http
Content-Type: application/json
Idempotency-Key: assign-task-001
```

The assignment relationship is stored in `TaskUser`.

A task can contain multiple users, and a user can participate in multiple tasks.

The database enforces uniqueness for each `taskId` / `userId` combination.

---

## Complete Task Participation

```http
POST /tasks/:idTask/complete
```

Marks one assigned user's participation as completed.

### Headers

```http
Content-Type: application/json
Idempotency-Key: complete-task-001
```

### Request

```json
{
    "userId": 1
}
```

### Successful Response

```http
200 OK
```

```json
{
    "message": "Task participation completed successfully."
}
```

The corresponding `TaskUser` record is updated with:

```text
completed = true
completedAt = <completion timestamp>
```

### Automatic Archiving

After completing the participation, the API checks whether other users assigned to the task are still pending.

If at least one user is pending:

```text
Task remains open
```

If no users remain pending:

```text
status = archived
archivedAt = <archive timestamp>
```

The automatic archive operation also triggers the external notification process.

### Missing User ID

```http
400 Bad Request
```

```json
{
    "error": {
        "code": "USER_ID_REQUIRED",
        "message": "userId is required."
    }
}
```

### Task Not Found

```http
404 Not Found
```

Error code:

```text
TASK_NOT_FOUND
```

### User Not Found

```http
404 Not Found
```

Error code:

```text
USER_NOT_FOUND
```

### User Not Assigned

If the user exists but is not assigned to the requested task:

```http
404 Not Found
```

```json
{
    "error": {
        "code": "USER_NOT_ASSIGNED",
        "message": "User is not assigned to this task."
    }
}
```

---

# Task Notifications

When a task is automatically archived, the application sends an HTTP request to the endpoint configured in:

```env
NOTIFY_URL=
```

The notification payload has the following structure:

```json
{
    "taskId": 1,
    "title": "Prepare report",
    "archivedAt": "2026-08-20T20:00:00.000Z"
}
```

## Delivery Strategy

The API performs a maximum of three notification attempts.

A notification is retried when:

- The destination responds with HTTP `5xx`.
- A network error occurs.
- The destination does not respond.
- The request exceeds the configured timeout.

A notification is not retried for HTTP `4xx` responses.

The timeout can be configured with:

```env
NOTIFY_TIMEOUT_MS=2000
```

The default timeout is 2000 milliseconds.

The retry delay increases between attempts:

```text
Attempt 1 -> 100 ms
Attempt 2 -> 200 ms
```

Each delivery attempt is persisted in the database.

---

## Get Notification Attempts

```http
GET /tasks/:idTask/notifications
```

Returns the notification attempts associated with a task.

Example:

```http
GET /tasks/1/notifications
```

### Successful Response

```json
[
    {
        "id": 1,
        "taskId": 1,
        "attempt": 1,
        "statusCode": 500,
        "attemptedAt": "2026-08-20T20:00:00.000Z"
    },
    {
        "id": 2,
        "taskId": 1,
        "attempt": 2,
        "statusCode": 200,
        "attemptedAt": "2026-08-20T20:00:00.200Z"
    }
]
```

Attempts are returned in ascending attempt order.

If the destination did not return an HTTP response:

```json
{
    "statusCode": null
}
```

If the task exists but no notification attempts have occurred:

```json
[]
```

If the task does not exist:

```http
404 Not Found
```

with:

```text
TASK_NOT_FOUND
```

---

# Concurrency

The API includes protection for concurrent operations.

Task completion uses database transactions and row-level locking to prevent race conditions.

For example, consider a task assigned to two users:

```text
Task
├── User A -> pending
└── User B -> pending
```

If both users complete their participation concurrently, the application ensures that:

```text
User A -> completed
User B -> completed
Task   -> archived
```

and the archive operation does not result in unnecessary duplicate notifications.

Idempotent operations additionally rely on the unique database constraint over:

```text
key + method + route
```

to ensure that concurrent requests using the same idempotency key cannot independently execute the same operation.

---

# Error Format

Application errors use a consistent JSON structure:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error description."
    }
}
```

Common HTTP status codes include:

| Status | Meaning |
|---|---|
| `200` | Successful operation |
| `201` | Resource created |
| `400` | Invalid request or missing parameter |
| `404` | Resource not found |
| `409` | Idempotency conflict |
| `500` | Unexpected server error |

---

# Endpoint Summary

| Method | Endpoint | Idempotency |
|---|---|---|
| `POST` | `/users` | Required |
| `GET` | `/users` | No |
| `GET` | `/users/:idUser/tasks` | No |
| `POST` | `/tasks` | Required |
| `GET` | `/tasks` | No |
| `GET` | `/tasks/:idTask` | No |
| `POST` | `/tasks/:idTask/assign` | Required |
| `POST` | `/tasks/:idTask/complete` | Required |
| `GET` | `/tasks/:idTask/notifications` | No |

## Query Parameters

`GET /tasks` supports:

| Parameter | Required | Description |
|---|---|---|
| `status` | No | Filter by `open` or `archived` |
| `page` | No* | Page number |
| `limit` | No* | Number of tasks per page |

`page` and `limit` are optional, but when pagination is used they must be supplied together.

---

# Automated Verification

The current implementation is covered by Jest and Supertest tests.

Current result:

```text
Test Suites: 17 passed, 17 total
Tests:       79 passed, 79 total
Snapshots:   0 total
```

The suite includes tests for standard API behavior as well as idempotency, concurrency, automatic archiving, notification retries, notification timeouts and pagination.