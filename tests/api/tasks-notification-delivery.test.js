const request = require('supertest');

const app = require('../../src/app');
const sequelize = require('../../src/config/database');

const {
    User,
    Task,
    TaskUser,
    Notification,
    IdempotencyKey
} = require('../../src/models');

describe('Task archived notifications', () => {

    beforeAll(async () => {
        await sequelize.authenticate();

        process.env.NOTIFY_URL = 'https://example.com/notify';
    });

    beforeEach(async () => {

        jest.restoreAllMocks();

        await Notification.destroy({
            where: {}
        });

        await IdempotencyKey.destroy({
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

    test('should send one notification when task is archived successfully', async () => {

        global.fetch = jest.fn()
            .mockResolvedValue({
                status: 200
            });

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte',
            description: 'Reporte mensual'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user.id
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'notification-success-1')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(200);

        expect(global.fetch).toHaveBeenCalledTimes(1);

        const notifications = await Notification.findAll({
            where: {
                taskId: task.id
            }
        });

        expect(notifications).toHaveLength(1);

        expect(notifications[0].attempt).toBe(1);
        expect(notifications[0].statusCode).toBe(200);
        expect(notifications[0].attemptedAt).not.toBeNull();
    });

    test('should retry when destination responds with 5xx', async () => {

        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                status: 500
            })
            .mockResolvedValueOnce({
                status: 200
            });

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user.id
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'notification-retry-1')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(200);

        expect(global.fetch).toHaveBeenCalledTimes(2);

        const notifications = await Notification.findAll({
            where: {
                taskId: task.id
            },
            order: [
                ['attempt', 'ASC']
            ]
        });

        expect(notifications).toHaveLength(2);

        expect(notifications[0].attempt).toBe(1);
        expect(notifications[0].statusCode).toBe(500);

        expect(notifications[1].attempt).toBe(2);
        expect(notifications[1].statusCode).toBe(200);
    });

    test('should stop after three failed 5xx attempts', async () => {

        global.fetch = jest.fn()
            .mockResolvedValue({
                status: 503
            });

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user.id
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'notification-retry-2')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(200);

        expect(global.fetch).toHaveBeenCalledTimes(3);

        const notifications = await Notification.findAll({
            where: {
                taskId: task.id
            },
            order: [
                ['attempt', 'ASC']
            ]
        });

        expect(notifications).toHaveLength(3);

        expect(
            notifications.map(notification => notification.attempt)
        ).toEqual([
            1,
            2,
            3
        ]);

        expect(
            notifications.map(notification => notification.statusCode)
        ).toEqual([
            503,
            503,
            503
        ]);
    });

    test('should retry when destination does not respond', async () => {

        global.fetch = jest.fn()
            .mockRejectedValueOnce(
                new Error('Network error')
            )
            .mockResolvedValueOnce({
                status: 200
            });

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user.id
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'notification-network-1')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(200);

        expect(global.fetch).toHaveBeenCalledTimes(2);

        const notifications = await Notification.findAll({
            where: {
                taskId: task.id
            },
            order: [
                ['attempt', 'ASC']
            ]
        });

        expect(notifications).toHaveLength(2);

        expect(notifications[0].attempt).toBe(1);
        expect(notifications[0].statusCode).toBeNull();

        expect(notifications[1].attempt).toBe(2);
        expect(notifications[1].statusCode).toBe(200);
    });

    test('should send the required notification payload', async () => {

        global.fetch = jest.fn()
            .mockResolvedValue({
                status: 200
            });

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte',
            description: 'Reporte mensual'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user.id
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'notification-payload-1')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(200);

        expect(global.fetch).toHaveBeenCalledTimes(1);

        const [
            url,
            options
        ] = global.fetch.mock.calls[0];

        expect(url).toBe(process.env.NOTIFY_URL);

        expect(options.method).toBe('POST');

        expect(options.headers).toEqual(
            expect.objectContaining({
                'Content-Type': 'application/json'
            })
        );

        const body = JSON.parse(options.body);

        expect(body).toEqual({
            taskId: task.id,
            title: 'Preparar reporte',
            archivedAt: expect.any(String)
        });

        expect(
            new Date(body.archivedAt).toString()
        ).not.toBe('Invalid Date');
    });

    test('should not retry when destination responds with 4xx', async () => {
        global.fetch = jest.fn()
            .mockResolvedValue({
                status: 400
            });

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user.id
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'notification-client-error-1')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(200);

        expect(global.fetch).toHaveBeenCalledTimes(1);

        const notifications = await Notification.findAll({
            where: {
                taskId: task.id
            }
        });

        expect(notifications).toHaveLength(1);
        expect(notifications[0].attempt).toBe(1);
        expect(notifications[0].statusCode).toBe(400);
    });
    test('should retry up to three times when destination times out', async () => {
        global.fetch = jest.fn()
            .mockImplementation((url, options) => {

                return new Promise((resolve, reject) => {

                    options.signal.addEventListener('abort', () => {

                        const error = new Error('The operation was aborted.');
                        error.name = 'AbortError';

                        reject(error);
                    });
                });
            });

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user.id
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'notification-timeout-1')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(200);

        expect(global.fetch).toHaveBeenCalledTimes(3);

        const notifications = await Notification.findAll({
            where: {
                taskId: task.id
            },
            order: [
                ['attempt', 'ASC']
            ]
        });

        expect(notifications).toHaveLength(3);

        expect(
            notifications.map(notification => notification.attempt)
        ).toEqual([
            1,
            2,
            3
        ]);

        expect(
            notifications.map(notification => notification.statusCode)
        ).toEqual([
            null,
            null,
            null
        ]);
    });

});