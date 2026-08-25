const request = require('supertest');

const app = require('../../src/app');

const sequelize = require('../../src/config/database');

const {
    User,
    IdempotencyKey
} = require('../../src/models');

describe('POST /users', () => {
    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        await IdempotencyKey.destroy({
            where: {}
        });

        await User.destroy({
            where: {}
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('should create a user', async () => {
        const response = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'user-001')
            .send({
                name: 'David',
                lastName: 'González',
                email: 'david@example.com'
            });

        expect(response.status).toBe(201);

        expect(response.body).toEqual({
            id: expect.any(Number),
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        const users = await User.findAll();

        expect(users).toHaveLength(1);
    });

    test('should return the same response for the same Idempotency-Key and body', async () => {
        const body = {
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        };

        const firstResponse = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'user-002')
            .send(body);

        const secondResponse = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'user-002')
            .send(body);

        expect(firstResponse.status).toBe(201);
        expect(secondResponse.status).toBe(201);

        expect(secondResponse.body).toEqual(
            firstResponse.body
        );

        const users = await User.findAll();

        expect(users).toHaveLength(1);
    });

    test('should reject same Idempotency-Key with different body', async () => {
        await request(app)
            .post('/users')
            .set('Idempotency-Key', 'user-003')
            .send({
                name: 'David',
                lastName: 'González',
                email: 'david@example.com'
            });

        const response = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'user-003')
            .send({
                name: 'Juan',
                lastName: 'Pérez',
                email: 'juan@example.com'
            });

        expect(response.status).toBe(409);

        expect(response.body.error.code).toBe(
            'IDEMPOTENCY_KEY_REUSED'
        );

        const users = await User.findAll();

        expect(users).toHaveLength(1);
    });

    test('should reject request without Idempotency-Key', async () => {
        const response = await request(app)
            .post('/users')
            .send({
                name: 'David',
                lastName: 'González',
                email: 'david@example.com'
            });

        expect(response.status).toBe(400);

        expect(response.body.error.code).toBe(
            'IDEMPOTENCY_KEY_REQUIRED'
        );

        const users = await User.findAll();

        expect(users).toHaveLength(0);
    });

    test('should create only one user when requests arrive concurrently', async () => {
        const body = {
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        };

        const idempotencyKey = 'user-concurrent-001';

        const [response1, response2] = await Promise.all([
            request(app)
                .post('/users')
                .set('Idempotency-Key', idempotencyKey)
                .send(body),

            request(app)
                .post('/users')
                .set('Idempotency-Key', idempotencyKey)
                .send(body)
        ]);

        expect(response1.status).toBe(201);
        expect(response2.status).toBe(201);

        expect(response1.body).toEqual(
            response2.body
        );

        const users = await User.findAll();

        expect(users).toHaveLength(1);

        const keys = await IdempotencyKey.findAll();

        expect(keys).toHaveLength(1);
    });
});