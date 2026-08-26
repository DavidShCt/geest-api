# GEEST API

REST API for task and user management developed with Node.js, Express, Sequelize and MySQL/MariaDB.

The API allows users and tasks to be managed, users to be assigned to tasks, individual participation to be completed, and tasks to be automatically archived when all assigned users have completed their participation.

The project also implements idempotency, concurrency handling, automatic notifications with retries, filtering and optional pagination.

## Tech Stack

- Node.js
- Express 5
- Sequelize 6
- MySQL / MariaDB
- Jest
- Supertest

## Main Features

- User creation and listing.
- Task creation, listing and lookup by ID.
- Assignment of multiple users to tasks.
- Retrieval of tasks assigned to a user.
- Individual task completion.
- Automatic task archiving when all assigned users complete their participation.
- Idempotency for write operations through `Idempotency-Key`.
- Protection against concurrent duplicate operations.
- Automatic notification when a task is archived.
- Notification retries for `5xx`, network errors and timeouts.
- Notification attempt history.
- Task filtering by status.
- Optional task pagination.
- Automated API, service and concurrency tests.

## Architecture

The application follows a layered architecture:

```text
Request
   │
   ▼
Routes
   │
   ▼
Middlewares
   │
   ▼
Controllers
   │
   ▼
Services
   │
   ▼
Sequelize Models
   │
   ▼
MySQL / MariaDB
```

The main entities are:

```text
User ─────< TaskUser >───── Task
                              │
                              ▼
                         Notification

IdempotencyKey
```

`TaskUser` represents the many-to-many relationship between users and tasks and stores the completion state of each individual assignment.

## Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd geest-api
npm install
```

Create a `.env` file using `.env.example` as reference:

```env
NODE_ENV=development

PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=geest
DB_TEST_NAME=geest_test
DB_USER=
DB_PASSWORD=

NOTIFY_URL=
NOTIFY_TIMEOUT_MS=2000
```

Create the development and test databases:

```sql
CREATE DATABASE geest;
CREATE DATABASE geest_test;
```

Run the database migrations:

```bash
npm run db:migrate
```

Start the application in development mode:

```bash
npm run dev
```

Or start it normally:

```bash
npm start
```

## Tests

Run the complete automated test suite with:

```bash
npm test
```

Current test status:

```text
Test Suites: 17 passed, 17 total
Tests:       79 passed, 79 total
Snapshots:   0 total
```

The test suite covers API behavior, validations, idempotency, concurrent requests, task archiving, notification delivery, retries, timeouts and pagination.

## Technical Decisions

Write operations use an `Idempotency-Key` header. The request body is normalized and hashed using SHA-256, and the key, method, route, request hash and resulting response are persisted. Repeating the same operation with the same key and body returns the stored result, while reusing the key with a different body is rejected.

Database transactions, unique constraints and row-level locks are used where necessary to protect operations against race conditions.

Task completion is tracked per user through the `TaskUser` relationship. When no pending assignments remain, the task is automatically archived.

Archiving triggers an HTTP notification. Failed requests caused by `5xx`, network errors or timeouts are retried up to three times and every attempt is persisted.

Task pagination is optional to preserve the original API response contract while allowing large task collections to be retrieved efficiently.

## API Documentation

Detailed endpoint documentation, request/response examples, idempotency behavior, pagination and notification information are available in:

```text
docs/API.md
```

## Database Migrations

Run pending migrations:

```bash
npm run db:migrate
```

Undo the latest migration:

```bash
npm run db:migrate:undo
```

Undo all migrations:

```bash
npm run db:migrate:undo:all
```

## Additional Features

Beyond the core task management requirements, the project includes:

- Concurrent idempotent request handling.
- Automatic notification retries.
- Notification request timeout.
- Persistent notification attempt history.
- Concurrency protection during task completion.
- Status filtering.
- Optional pagination.

These features were implemented to improve reliability and scalability in scenarios closer to production environments.