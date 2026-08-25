const request = require('supertest');

const app = require('../../src/app');
const sequelize = require('../../src/config/database');

const User = require('../../src/models/User');
const Task = require('../../src/models/Task');
const TaskUser = require('../../src/models/TaskUser');

describe('GET /tasks', () => {
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

    test('should return all tasks with assigned users and completion status', async () => {
        const user1 = await User.create({
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com'
        });

        const user2 = await User.create({
            name: 'María',
            lastName: 'López',
            email: 'maria@example.com'
        });

        const task = await Task.create({
            title: 'Crear reporte',
            description: 'Reporte mensual'
        });

        await TaskUser.bulkCreate([
            {
                taskId: task.id,
                userId: user1.id,
                completed: true
            },
            {
                taskId: task.id,
                userId: user2.id,
                completed: false
            }
        ]);

        const response = await request(app)
            .get('/tasks');

        expect(response.status).toBe(200);

        expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: task.id,
                    title: 'Crear reporte',
                    description: 'Reporte mensual',
                    status: 'open',
                    users: expect.arrayContaining([
                        expect.objectContaining({
                            id: user1.id,
                            name: 'Juan',
                            lastName: 'Pérez',
                            completed: true
                        }),
                        expect.objectContaining({
                            id: user2.id,
                            name: 'María',
                            lastName: 'López',
                            completed: false
                        })
                    ])
                })
            ])
        );
    });

    test('should return an empty array when there are no tasks', async () => {
        const response = await request(app)
            .get('/tasks');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test('should filter tasks by open status', async () => {
        const openTask = await Task.create({
            title: 'Tarea abierta',
            description: 'Pendiente'
        });

        await Task.create({
            title: 'Tarea archivada',
            description: 'Terminada',
            status: 'archived',
            archivedAt: new Date()
        });

        const response = await request(app)
            .get('/tasks')
            .query({ status: 'open' });

        expect(response.status).toBe(200);

        expect(response.body).toHaveLength(1);

        expect(response.body[0].id).toBe(openTask.id);
        expect(response.body[0].status).toBe('open');
    });

    test('should filter tasks by archived status', async () => {
        await Task.create({
            title: 'Tarea abierta'
        });

        const archivedTask = await Task.create({
            title: 'Tarea archivada',
            status: 'archived',
            archivedAt: new Date()
        });

        const response = await request(app)
            .get('/tasks')
            .query({ status: 'archived' });

        expect(response.status).toBe(200);

        expect(response.body).toHaveLength(1);

        expect(response.body[0].id).toBe(archivedTask.id);
        expect(response.body[0].status).toBe('archived');
    });

    test('should reject an invalid status', async () => {
        const response = await request(app)
            .get('/tasks')
            .query({ status: 'invalid' });

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'INVALID_STATUS',
                message: expect.any(String)
            }
        });
    });
});