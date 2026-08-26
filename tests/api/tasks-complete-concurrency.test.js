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

describe('POST /tasks/:idTask/complete concurrency', () => {

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

    test('should archive the task once and send one notification when the last two users complete concurrently', async () => {

        global.fetch = jest.fn()
            .mockResolvedValue({
                status: 200
            });

        const user1 = await User.create({
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com'
        });

        const user2 = await User.create({
            name: 'Ana',
            lastName: 'López',
            email: 'ana@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte',
            description: 'Reporte mensual'
        });

        await TaskUser.bulkCreate([
            {
                taskId: task.id,
                userId: user1.id,
                completed: false
            },
            {
                taskId: task.id,
                userId: user2.id,
                completed: false
            }
        ]);

        const [
            response1,
            response2
        ] = await Promise.all([
            request(app)
                .post(`/tasks/${task.id}/complete`)
                .set('Idempotency-Key', 'concurrent-complete-user-1')
                .send({
                    userId: user1.id
                }),

            request(app)
                .post(`/tasks/${task.id}/complete`)
                .set('Idempotency-Key', 'concurrent-complete-user-2')
                .send({
                    userId: user2.id
                })
        ]);

        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);

        const updatedTask = await Task.findByPk(task.id);

        expect(updatedTask.status).toBe('archived');
        expect(updatedTask.archivedAt).not.toBeNull();

        const assignments = await TaskUser.findAll({
            where: {
                taskId: task.id
            }
        });

        expect(assignments).toHaveLength(2);

        expect(
            assignments.every(assignment => assignment.completed === true)
        ).toBe(true);

        const notifications = await Notification.findAll({
            where: {
                taskId: task.id
            }
        });

        expect(notifications).toHaveLength(1);

        expect(notifications[0].attempt).toBe(1);
        expect(notifications[0].statusCode).toBe(200);

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

});