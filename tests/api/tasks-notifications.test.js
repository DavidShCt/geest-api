const request = require('supertest');

const app = require('../../src/app');
const sequelize = require('../../src/config/database');

const {
    User,
    Task,
    TaskUser,
    Notification
} = require('../../src/models');

describe('GET /tasks/:idTask/notifications', () => {

    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {

        await Notification.destroy({
            where: {}
        });

        await TaskUser.destroy({
            where: {}
        });

        await Task.destroy({
            where: {}
        });

        await User.destroy({
            where: {}
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('should return all notification attempts for the task', async () => {

        const task = await Task.create({
            title: 'Preparar reporte',
            description: 'Reporte mensual',
            status: 'archived',
            archivedAt: new Date()
        });

        await Notification.bulkCreate([
            {
                taskId: task.id,
                attempt: 1,
                attemptedAt: new Date('2026-08-26T10:00:00Z'),
                statusCode: 500
            },
            {
                taskId: task.id,
                attempt: 2,
                attemptedAt: new Date('2026-08-26T10:00:01Z'),
                statusCode: 200
            }
        ]);

        const response = await request(app)
            .get(`/tasks/${task.id}/notifications`);

        expect(response.status).toBe(200);

        expect(response.body).toHaveLength(2);

        expect(response.body[0]).toEqual(
            expect.objectContaining({
                id: expect.any(Number),
                taskId: task.id,
                attempt: 1,
                attemptedAt: expect.any(String),
                statusCode: 500
            })
        );

        expect(response.body[1]).toEqual(
            expect.objectContaining({
                id: expect.any(Number),
                taskId: task.id,
                attempt: 2,
                attemptedAt: expect.any(String),
                statusCode: 200
            })
        );
    });

    test('should return an empty array when the task has no notification attempts', async () => {

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        const response = await request(app)
            .get(`/tasks/${task.id}/notifications`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test('should return 404 when task does not exist', async () => {

        const response = await request(app)
            .get('/tasks/999999/notifications');

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            error: {
                code: 'TASK_NOT_FOUND',
                message: expect.any(String)
            }
        });
    });

    test('should return notification attempts ordered by attempt number ascending', async () => {

        const task = await Task.create({
            title: 'Preparar reporte',
            status: 'archived',
            archivedAt: new Date()
        });

        await Notification.create({
            taskId: task.id,
            attempt: 2,
            attemptedAt: new Date('2026-08-26T10:00:02Z'),
            statusCode: 200
        });

        await Notification.create({
            taskId: task.id,
            attempt: 1,
            attemptedAt: new Date('2026-08-26T10:00:01Z'),
            statusCode: 500
        });

        const response = await request(app)
            .get(`/tasks/${task.id}/notifications`);

        expect(response.status).toBe(200);

        expect(response.body.map(notification => notification.attempt))
            .toEqual([
                1,
                2
            ]);
    });

    test('should allow null statusCode when the destination does not respond', async () => {

        const task = await Task.create({
            title: 'Preparar reporte',
            status: 'archived',
            archivedAt: new Date()
        });

        await Notification.create({
            taskId: task.id,
            attempt: 1,
            attemptedAt: new Date(),
            statusCode: null
        });

        const response = await request(app)
            .get(`/tasks/${task.id}/notifications`);

        expect(response.status).toBe(200);

        expect(response.body[0]).toEqual(
            expect.objectContaining({
                attempt: 1,
                statusCode: null
            })
        );
    });

    test('should not require Idempotency-Key', async () => {

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        const response = await request(app)
            .get(`/tasks/${task.id}/notifications`);

        expect(response.status).toBe(200);
    });

});