const request = require('supertest');

const app = require('../../src/app');

const sequelize = require('../../src/config/database');

const {
    Task,
    User,
    TaskUser
} = require('../../src/models');

describe('GET /tasks/:idTask', () => {

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

    test('should return a task with assigned users and completion status', async () => {

        const user1 = await User.create({
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan-get-task@test.com'
        });

        const user2 = await User.create({
            name: 'María',
            lastName: 'López',
            email: 'maria-get-task@test.com'
        });

        const task = await Task.create({
            title: 'Revisión de documentos',
            description: 'Revisar documentación de alumnos'
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user1.id,
            completed: true,
            completedAt: new Date()
        });

        await TaskUser.create({
            taskId: task.id,
            userId: user2.id,
            completed: false
        });

        const response = await request(app)
            .get(`/tasks/${task.id}`);

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            id: task.id,
            title: 'Revisión de documentos',
            description: 'Revisar documentación de alumnos',
            status: 'open',
            archivedAt: null,
            users: expect.arrayContaining([
                {
                    id: user1.id,
                    name: 'Juan',
                    lastName: 'Pérez',
                    completed: true
                },
                {
                    id: user2.id,
                    name: 'María',
                    lastName: 'López',
                    completed: false
                }
            ])
        });
    });

    test('should return 404 when task does not exist', async () => {

        const response = await request(app)
            .get('/tasks/999999');

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            error: {
                code: 'TASK_NOT_FOUND',
                message: expect.any(String)
            }
        });
    });

    test('should return a task without assigned users', async () => {

        const task = await Task.create({
            title: 'Tarea sin usuarios',
            description: 'Esta tarea todavía no tiene usuarios asignados'
        });

        const response = await request(app)
            .get(`/tasks/${task.id}`);

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            id: task.id,
            title: 'Tarea sin usuarios',
            description: 'Esta tarea todavía no tiene usuarios asignados',
            status: 'open',
            archivedAt: null,
            users: []
        });
    });
});