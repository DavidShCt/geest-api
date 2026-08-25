const request = require('supertest');

const app = require('../../src/app');
const sequelize = require('../../src/config/database');

const {
    Task,
    TaskUser,
    Notification,
    IdempotencyKey
} = require('../../src/models');

describe('POST /tasks', () => {

    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        await IdempotencyKey.destroy({
            where: {}
        });
      
        await TaskUser.destroy({
            where: {}
        });
      
        await Notification.destroy({
            where: {}
        });
      
        await Task.destroy({
            where: {}
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('should create a task', async () => {

        const response = await request(app)
            .post('/tasks')
            .set('Idempotency-Key', 'task-create-1')
            .send({
                title: 'Crear reporte',
                description: 'Preparar reporte mensual'
            });

        expect(response.status).toBe(201);

        expect(response.body).toEqual(
            expect.objectContaining({
                id: expect.any(Number),
                title: 'Crear reporte',
                description: 'Preparar reporte mensual',
                status: 'open'
            })
        );
    });

    test('should create a task without description', async () => {

        const response = await request(app)
            .post('/tasks')
            .set('Idempotency-Key', 'task-create-2')
            .send({
                title: 'Crear presentación'
            });

        expect(response.status).toBe(201);

        expect(response.body).toEqual(
            expect.objectContaining({
                id: expect.any(Number),
                title: 'Crear presentación',
                description: null,
                status: 'open'
            })
        );
    });

    test('should require title', async () => {

        const response = await request(app)
            .post('/tasks')
            .set('Idempotency-Key', 'task-create-3')
            .send({
                description: 'Sin título'
            });

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'TITLE_REQUIRED',
                message: expect.any(String)
            }
        });
    });

    test('should require Idempotency-Key', async () => {

        const response = await request(app)
            .post('/tasks')
            .send({
                title: 'Crear tarea'
            });

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: expect.any(String)
            }
        });
    });

    test('should return the same response for the same Idempotency-Key and body', async () => {

        const body = {
            title: 'Tarea idempotente',
            description: 'Descripción'
        };

        const firstResponse = await request(app)
            .post('/tasks')
            .set('Idempotency-Key', 'task-idempotent-1')
            .send(body);

        const secondResponse = await request(app)
            .post('/tasks')
            .set('Idempotency-Key', 'task-idempotent-1')
            .send(body);

        expect(firstResponse.status).toBe(201);
        expect(secondResponse.status).toBe(201);

        expect(secondResponse.body).toEqual(
            firstResponse.body
        );

        const tasks = await Task.findAll();

        expect(tasks).toHaveLength(1);
    });

    test('should reject the same Idempotency-Key with a different body', async () => {

        const firstResponse = await request(app)
            .post('/tasks')
            .set('Idempotency-Key', 'task-idempotent-2')
            .send({
                title: 'Primera tarea'
            });

        expect(firstResponse.status).toBe(201);

        const secondResponse = await request(app)
            .post('/tasks')
            .set('Idempotency-Key', 'task-idempotent-2')
            .send({
                title: 'Otra tarea'
            });

        expect(secondResponse.status).toBe(409);

        expect(secondResponse.body).toEqual({
            error: {
                code: 'IDEMPOTENCY_KEY_REUSED',
                message: expect.any(String)
            }
        });

        const tasks = await Task.findAll();

        expect(tasks).toHaveLength(1);
    });

});