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
            where: {},
        });
      
        await User.destroy({
            where: {},
        });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('should create a user successfully', async () => {

        const response = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-1')
            .send({
                name: 'Juan',
                lastName: 'Pérez',
                email: 'juan@example.com'
            });

        expect(response.status).toBe(201);

        expect(response.body).toEqual(
            expect.objectContaining({
                id: expect.any(Number),
                name: 'Juan',
                lastName: 'Pérez',
                email: 'juan@example.com'
            })
        );

        const user = await User.findByPk(response.body.id);

        expect(user).not.toBeNull();
        expect(user.name).toBe('Juan');
        expect(user.lastName).toBe('Pérez');
        expect(user.email).toBe('juan@example.com');
    });

    test('should require name', async () => {

        const response = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-2')
            .send({
                lastName: 'Pérez',
                email: 'juan@example.com'
            });

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'NAME_REQUIRED',
                message: expect.any(String)
            }
        });
    });

    test('should require lastName', async () => {

        const response = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-3')
            .send({
                name: 'Juan',
                email: 'juan@example.com'
            });

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'LAST_NAME_REQUIRED',
                message: expect.any(String)
            }
        });
    });

    test('should require email', async () => {

        const response = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-4')
            .send({
                name: 'Juan',
                lastName: 'Pérez'
            });

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'EMAIL_REQUIRED',
                message: expect.any(String)
            }
        });
    });

    test('should reject an invalid email', async () => {

        const response = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-5')
            .send({
                name: 'Juan',
                lastName: 'Pérez',
                email: 'correo-invalido'
            });

        expect(response.status).toBe(400);

        expect(response.body).toEqual({
            error: {
                code: 'INVALID_EMAIL',
                message: expect.any(String)
            }
        });
    });

    test('should return the same response for the same Idempotency-Key and body', async () => {

        const body = {
            name: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com'
        };

        const firstResponse = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-6')
            .send(body);

        const secondResponse = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-6')
            .send(body);

        expect(secondResponse.status).toBe(firstResponse.status);
        expect(secondResponse.body).toEqual(firstResponse.body);

        const users = await User.count({
            where: {
                email: 'juan@example.com'
            }
        });

        expect(users).toBe(1);
    });

    test('should reject the same Idempotency-Key with a different body', async () => {

        const firstResponse = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-7')
            .send({
                name: 'Juan',
                lastName: 'Pérez',
                email: 'juan@example.com'
            });

        expect(firstResponse.status).toBe(201);

        const secondResponse = await request(app)
            .post('/users')
            .set('Idempotency-Key', 'create-user-7')
            .send({
                name: 'Ana',
                lastName: 'López',
                email: 'ana@example.com'
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