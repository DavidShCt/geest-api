const request = require('supertest');

const app = require('../../src/app');
const sequelize = require('../../src/config/database');

const User = require('../../src/models/User');
const Task = require('../../src/models/Task');
const TaskUser = require('../../src/models/TaskUser');

describe('GET /users', () => {
    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
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

    test('should return all users', async () => {
        await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        await User.create({
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com'
        });

        const response = await request(app)
            .get('/users');

        expect(response.status).toBe(200);

        expect(response.body).toHaveLength(2);

        expect(response.body[0]).toEqual(
            expect.objectContaining({
                id: expect.any(Number),
                name: expect.any(String),
                lastName: expect.any(String),
                email: expect.any(String),
                pendingTasks: expect.any(Array)
            })
        );
    });

    test('should return only pending tasks for each user', async () => {
        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const pendingTask = await Task.create({
            title: 'Crear reporte',
            description: 'Preparar reporte mensual'
        });

        const archivedTask = await Task.create({
            title: 'Tarea terminada',
            description: 'Esta tarea ya terminó',
            status: 'archived'
        });

        await TaskUser.create({
            userId: user.id,
            taskId: pendingTask.id,
            completed: false
        });

        await TaskUser.create({
            userId: user.id,
            taskId: archivedTask.id,
            completed: true
        });

        const response = await request(app)
            .get('/users');

        expect(response.status).toBe(200);

        expect(response.body).toHaveLength(1);

        expect(response.body[0].pendingTasks).toHaveLength(1);

        expect(response.body[0].pendingTasks[0]).toEqual(
            expect.objectContaining({
                id: pendingTask.id,
                title: 'Crear reporte',
                description: 'Preparar reporte mensual',
                status: 'open'
            })
        );
    });

    test('should return an empty pendingTasks array when user has no pending tasks', async () => {
        await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const response = await request(app)
            .get('/users');

        expect(response.status).toBe(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].pendingTasks).toEqual([]);
    });

    test('should not require Idempotency-Key', async () => {
        const response = await request(app)
            .get('/users');

        expect(response.status).toBe(200);
    });
});