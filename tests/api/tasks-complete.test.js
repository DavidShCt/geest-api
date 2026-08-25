const request = require('supertest');

const app = require('../../src/app');
const sequelize = require('../../src/config/database');

const {
    User,
    Task,
    TaskUser
} = require('../../src/models');

describe('POST /tasks/:idTask/complete', () => {

    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        await TaskUser.destroy({
            where: {},
            
        });

        await Task.destroy({
            where: {},
            
        });

        await User.destroy({
            where: {},
            
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('should complete the user participation in a task', async () => {

        const user = await User.create({
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com'
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
            .set('Idempotency-Key', 'complete-task-1')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                message: expect.any(String)
            })
        );

        const assignment = await TaskUser.findOne({
            where: {
                taskId: task.id,
                userId: user.id
            }
        });

        expect(assignment.completed).toBe(true);
        expect(assignment.completedAt).not.toBeNull();
    });

    test('should return 404 when task does not exist', async () => {

        const user = await User.create({
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com'
        });

        const response = await request(app)
            .post('/tasks/999999/complete')
            .set('Idempotency-Key', 'complete-task-2')
            .send({
                userId: user.id
            });

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            error: {
                code: 'TASK_NOT_FOUND',
                message: expect.any(String)
            }
        });
    });

    test('should return 404 when user does not exist', async () => {

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-3')
            .send({
                userId: 999999
            });

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            error: {
                code: 'USER_NOT_FOUND',
                message: expect.any(String)
            }
        });
    });

    test('should return 404 when user is not assigned to the task', async () => {

        const assignedUser = await User.create({
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com'
        });

        const anotherUser = await User.create({
            name: 'Ana',
            lastName: 'López',
            email: 'ana@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: assignedUser.id
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-4')
            .send({
                userId: anotherUser.id
            });

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            error: {
                code: 'USER_NOT_ASSIGNED',
                message: expect.any(String)
            }
        });
    });

    test('should require userId', async () => {

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        const response = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-5')
            .send({});

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'USER_ID_REQUIRED',
                message: expect.any(String)
            }
        });
    });

    test('should archive the task when all assigned users complete their participation', async () => {

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
            title: 'Preparar reporte'
        });

        await TaskUser.bulkCreate([
            {
                taskId: task.id,
                userId: user1.id
            },
            {
                taskId: task.id,
                userId: user2.id
            }
        ]);

        const response1 = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-6-user-1')
            .send({
                userId: user1.id
            });

        expect(response1.status).toBe(200);

        let updatedTask = await Task.findByPk(task.id);

        expect(updatedTask.status).toBe('open');
        expect(updatedTask.archivedAt).toBeNull();

        const response2 = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-6-user-2')
            .send({
                userId: user2.id
            });

        expect(response2.status).toBe(200);

        updatedTask = await Task.findByPk(task.id);

        expect(updatedTask.status).toBe('archived');
        expect(updatedTask.archivedAt).not.toBeNull();
    });

    test('should return the same response for the same Idempotency-Key and body', async () => {

        const user = await User.create({
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com'
        });

        const task = await Task.create({
            title: 'Preparar reporte'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user.id
        });

        const body = {
            userId: user.id
        };

        const firstResponse = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-7')
            .send(body);

        const secondResponse = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-7')
            .send(body);

        expect(secondResponse.status).toBe(firstResponse.status);
        expect(secondResponse.body).toEqual(firstResponse.body);

        const assignments = await TaskUser.count({
            where: {
                taskId: task.id,
                userId: user.id,
                completed: true
            }
        });

        expect(assignments).toBe(1);
    });

    test('should reject the same Idempotency-Key with a different body', async () => {

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
            title: 'Preparar reporte'
        });

        await TaskUser.bulkCreate([
            {
                taskId: task.id,
                userId: user1.id
            },
            {
                taskId: task.id,
                userId: user2.id
            }
        ]);

        const firstResponse = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-8')
            .send({
                userId: user1.id
            });

        expect(firstResponse.status).toBe(200);

        const secondResponse = await request(app)
            .post(`/tasks/${task.id}/complete`)
            .set('Idempotency-Key', 'complete-task-8')
            .send({
                userId: user2.id
            });

        expect(secondResponse.status).toBe(409);

        expect(secondResponse.body).toEqual({
            error: {
                code: 'IDEMPOTENCY_KEY_REUSED',
                message: expect.any(String)
            }
        });
    });

});