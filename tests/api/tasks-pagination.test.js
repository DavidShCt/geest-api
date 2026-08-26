const request = require('supertest');

const app = require('../../src/app');
const sequelize = require('../../src/config/database');

const {
    User,
    Task,
    TaskUser
} = require('../../src/models');

describe('GET /tasks pagination', () => {

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

    test('should return paginated tasks when page and limit are provided', async () => {

        await Task.bulkCreate([
            {
                title: 'Tarea 1'
            },
            {
                title: 'Tarea 2'
            },
            {
                title: 'Tarea 3'
            },
            {
                title: 'Tarea 4'
            },
            {
                title: 'Tarea 5'
            }
        ]);

        const response = await request(app)
            .get('/tasks?page=2&limit=2');

        expect(response.status).toBe(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                data: expect.any(Array),
                pagination: {
                    page: 2,
                    limit: 2,
                    totalItems: 5,
                    totalPages: 3
                }
            })
        );

        expect(response.body.data).toHaveLength(2);

        expect(response.body.data[0]).toEqual(
            expect.objectContaining({
                title: 'Tarea 3'
            })
        );

        expect(response.body.data[1]).toEqual(
            expect.objectContaining({
                title: 'Tarea 4'
            })
        );
    });

    test('should combine pagination with status filter', async () => {

        await Task.bulkCreate([
            {
                title: 'Tarea abierta 1',
                status: 'open'
            },
            {
                title: 'Tarea archivada 1',
                status: 'archived',
                archivedAt: new Date()
            },
            {
                title: 'Tarea abierta 2',
                status: 'open'
            },
            {
                title: 'Tarea archivada 2',
                status: 'archived',
                archivedAt: new Date()
            }
        ]);

        const response = await request(app)
            .get('/tasks?status=archived&page=1&limit=1');

        expect(response.status).toBe(200);

        expect(response.body.pagination).toEqual({
            page: 1,
            limit: 1,
            totalItems: 2,
            totalPages: 2
        });

        expect(response.body.data).toHaveLength(1);

        expect(response.body.data[0]).toEqual(
            expect.objectContaining({
                status: 'archived'
            })
        );
    });

    test('should return the original array response when pagination is not provided', async () => {

        await Task.bulkCreate([
            {
                title: 'Tarea 1'
            },
            {
                title: 'Tarea 2'
            }
        ]);

        const response = await request(app)
            .get('/tasks');

        expect(response.status).toBe(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(2);
    });

    test('should return 400 when page is invalid', async () => {

        const response = await request(app)
            .get('/tasks?page=0&limit=10');

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'INVALID_PAGE',
                message: expect.any(String)
            }
        });
    });

    test('should return 400 when limit is invalid', async () => {

        const response = await request(app)
            .get('/tasks?page=1&limit=0');

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'INVALID_LIMIT',
                message: expect.any(String)
            }
        });
    });

    test('should require page and limit together', async () => {

        const response = await request(app)
            .get('/tasks?page=1');

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'PAGINATION_PARAMS_REQUIRED',
                message: expect.any(String)
            }
        });
    });

});