const request = require('supertest');

const app = require('../../src/app');
const sequelize = require('../../src/config/database');

const {
    User,
    Task,
    TaskUser
} = require('../../src/models');

describe('GET /users/:idUser/tasks', () => {

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

    test('should return all tasks assigned to the user', async () => {

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const task1 = await Task.create({
            title: 'Preparar reporte',
            description: 'Reporte mensual'
        });

        const task2 = await Task.create({
            title: 'Revisar documentación',
            description: 'Validar documentación del proyecto'
        });

        await TaskUser.bulkCreate([
            {
                userId: user.id,
                taskId: task1.id,
                completed: false
            },
            {
                userId: user.id,
                taskId: task2.id,
                completed: true,
                completedAt: new Date()
            }
        ]);

        const response = await request(app)
            .get(`/users/${user.id}/tasks`);

        expect(response.status).toBe(200);

        expect(response.body).toHaveLength(2);

        expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: task1.id,
                    title: 'Preparar reporte',
                    description: 'Reporte mensual',
                    status: 'open',
                    completed: false
                }),
                expect.objectContaining({
                    id: task2.id,
                    title: 'Revisar documentación',
                    description: 'Validar documentación del proyecto',
                    status: 'open',
                    completed: true
                })
            ])
        );
    });

    test('should return an empty array when the user has no assigned tasks', async () => {

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const response = await request(app)
            .get(`/users/${user.id}/tasks`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test('should return 404 when user does not exist', async () => {

        const response = await request(app)
            .get('/users/999999/tasks');

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            error: {
                code: 'USER_NOT_FOUND',
                message: expect.any(String)
            }
        });
    });

    test('should indicate whether the user completed each task', async () => {

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
            userId: user.id,
            taskId: task.id,
            completed: true,
            completedAt: new Date()
        });

        const response = await request(app)
            .get(`/users/${user.id}/tasks`);

        expect(response.status).toBe(200);

        expect(response.body[0]).toEqual(
            expect.objectContaining({
                id: task.id,
                completed: true
            })
        );
    });

    test('should not require Idempotency-Key', async () => {

        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const response = await request(app)
            .get(`/users/${user.id}/tasks`);

        expect(response.status).toBe(200);
    });

});