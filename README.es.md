# GEEST API

[English](README.md) | [Español](README.es.md)

API REST para la gestión de tareas y usuarios desarrollada con Node.js, Express, Sequelize y MySQL/MariaDB.

La API permite administrar usuarios y tareas, asignar usuarios a tareas, completar la participación individual de cada usuario y archivar automáticamente las tareas cuando todos los usuarios asignados han completado su participación.

El proyecto también implementa idempotencia, manejo de concurrencia, notificaciones automáticas con reintentos, filtrado y paginación opcional.

## API pública

La API se encuentra disponible públicamente en:

**https://geest-api.onrender.com**

La aplicación de producción está alojada en **Render** y utiliza una base de datos **MySQL administrada en Aiven con conexión SSL habilitada**.

> El servicio público está destinado a fines de evaluación técnica y demostración.

## Tecnologías

- Node.js
- Express 5
- Sequelize 6
- MySQL / MariaDB
- Jest
- Supertest

## Funcionalidades principales

- Creación y listado de usuarios.
- Creación, listado y consulta de tareas por ID.
- Asignación de múltiples usuarios a tareas.
- Consulta de las tareas asignadas a un usuario.
- Finalización individual de la participación en una tarea.
- Archivado automático cuando todos los usuarios asignados completan su participación.
- Idempotencia en operaciones de escritura mediante `Idempotency-Key`.
- Protección frente a operaciones duplicadas concurrentes.
- Notificación automática al archivar una tarea.
- Reintentos de notificaciones ante respuestas `5xx`, errores de red y timeouts.
- Historial persistente de intentos de notificación.
- Filtrado de tareas por estado.
- Paginación opcional de tareas.
- Pruebas automatizadas de API, servicios y concurrencia.

## Arquitectura

La aplicación utiliza una arquitectura por capas:

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

Las entidades principales son:

```text
User ─────< TaskUser >───── Task
                              │
                              ▼
                         Notification

IdempotencyKey
```

`TaskUser` representa la relación muchos-a-muchos entre usuarios y tareas y almacena el estado de finalización individual de cada asignación.

El modelo completo de base de datos, relaciones, tipos de datos y restricciones se encuentra documentado en:

```text
docs/database-uml.md
```

## Instalación

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/DavidShCt/geest-api.git
cd geest-api
npm install
```

Crea un archivo `.env` utilizando `.env.example` como referencia:

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

Crea las bases de datos de desarrollo y pruebas:

```sql
CREATE DATABASE geest;
CREATE DATABASE geest_test;
```

Ejecuta las migraciones:

```bash
npm run db:migrate
```

Inicia la aplicación en modo desarrollo:

```bash
npm run dev
```

O inicia la aplicación normalmente:

```bash
npm start
```

## Pruebas

Ejecuta la suite completa de pruebas automatizadas con:

```bash
npm test
```

Estado actual:

```text
Test Suites: 17 passed, 17 total
Tests:       79 passed, 79 total
Snapshots:   0 total
```

Las pruebas cubren el comportamiento de la API, validaciones, idempotencia, solicitudes concurrentes, archivado de tareas, entrega de notificaciones, reintentos, timeouts y paginación.

## Decisiones técnicas

### Idempotencia

Las operaciones de escritura utilizan el encabezado `Idempotency-Key`.

El cuerpo de la solicitud se normaliza y se genera un hash SHA-256. La clave de idempotencia, método HTTP, ruta, hash de la solicitud y respuesta resultante son persistidos.

Repetir la misma operación utilizando la misma clave y cuerpo devuelve el resultado almacenado, mientras que reutilizar la misma clave con un cuerpo diferente es rechazado.

Se utilizan transacciones de base de datos, restricciones únicas y bloqueos a nivel de fila cuando es necesario para proteger las operaciones frente a condiciones de carrera.

### Finalización de tareas y concurrencia

La finalización de una tarea se registra individualmente para cada usuario asignado mediante la relación `TaskUser`.

Cuando ya no existen asignaciones pendientes, la tarea se archiva automáticamente.

La protección de concurrencia evita que solicitudes simultáneas provoquen múltiples archivados de la misma tarea o notificaciones duplicadas.

### Notificaciones

El archivado de una tarea genera una notificación HTTP hacia el endpoint configurado mediante la variable de entorno `NOTIFY_URL`.

Las solicitudes que fallen debido a respuestas `5xx`, errores de red o timeouts se reintentan hasta tres veces.

Cada intento de notificación es persistido, incluyendo el número de intento, fecha y hora, y código de estado HTTP cuando existe una respuesta.

### Paginación opcional

Se agregó paginación opcional al endpoint `GET /tasks`.

Ejemplo:

```http
GET /tasks?page=1&limit=10
```

También puede combinarse con el filtro por estado:

```http
GET /tasks?status=open&page=1&limit=10
```

En un sistema de gestión de tareas, la cantidad de registros puede crecer considerablemente con el tiempo. Devolver todas las tareas en cada solicitud puede aumentar la carga sobre la base de datos, el tamaño de las respuestas, el consumo de memoria y la transferencia de datos.

Por este motivo, la paginación fue implementada como una funcionalidad opcional que mejora la escalabilidad sin modificar el comportamiento original de `GET /tasks` cuando no se proporcionan parámetros de paginación.

## Despliegue en producción

La arquitectura de producción es:

```text
Cliente
   │
   │ HTTPS
   ▼
Render
GEEST API
   │
   │ SSL
   ▼
Aiven
MySQL
```

La aplicación Node.js se encuentra desplegada como un **Web Service en Render**.

La base de datos de producción utiliza una instancia administrada de **MySQL en Aiven**, accedida mediante una conexión SSL.

Render fue seleccionado por su flujo sencillo de despliegue para aplicaciones Node.js y su integración con GitHub.

Aiven proporciona la infraestructura SQL administrada requerida por la aplicación y permite conexiones externas seguras hacia la base de datos.

URL de producción:

**https://geest-api.onrender.com**

## Validación en producción

La aplicación desplegada fue validada de extremo a extremo contra el entorno de producción.

La validación incluyó:

1. Creación de un usuario.
2. Creación de una tarea.
3. Asignación del usuario a la tarea.
4. Consulta de la tarea y sus usuarios asignados.
5. Consulta de las tareas asignadas al usuario.
6. Finalización de la participación del usuario.
7. Archivado automático al no existir asignaciones pendientes.
8. Envío de la notificación externa de archivado.
9. Recepción de una respuesta exitosa `200` por parte del destino.
10. Persistencia del intento de notificación en la base de datos de producción.

Esto valida el flujo completo entre la API pública, el despliegue en Render, la base de datos en Aiven y el mecanismo de notificaciones externas.

## Documentación de la API

La documentación detallada de endpoints, ejemplos de solicitudes y respuestas, comportamiento de idempotencia, paginación y notificaciones está disponible en:

```text
docs/API.md
```

## UML de la base de datos

El esquema de base de datos, relaciones, llaves foráneas, restricciones y reglas de negocio relevantes están documentados en:

```text
docs/database-uml.md
```

## Migraciones de base de datos

El esquema de base de datos se encuentra versionado mediante migraciones de Sequelize.

Ejecutar migraciones pendientes:

```bash
npm run db:migrate
```

Deshacer la última migración:

```bash
npm run db:migrate:undo
```

Deshacer todas las migraciones:

```bash
npm run db:migrate:undo:all
```

## Funcionalidades adicionales

Además de los requerimientos principales del sistema de gestión de tareas, el proyecto incluye:

- Manejo de solicitudes idempotentes concurrentes.
- Reintentos automáticos de notificaciones.
- Timeout para solicitudes de notificación.
- Historial persistente de intentos de notificación.
- Protección de concurrencia durante la finalización de tareas.
- Filtrado por estado.
- Paginación opcional.

Estas funcionalidades fueron implementadas para mejorar la confiabilidad y escalabilidad del sistema en escenarios más cercanos a un entorno de producción.