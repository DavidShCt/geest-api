const {
    IdempotencyKey
} = require('../../src/models');

const {
    waitForCompletion
} = require('../../src/services/idempotency.service');

describe('Idempotency service', () => {
    beforeEach(async () => {
        await IdempotencyKey.destroy({
            where: {}
        });
    });

    test('should wait until an idempotency operation is completed', async () => {
        await IdempotencyKey.create({
            key: 'wait-test-001',
            method: 'POST',
            route: '/users',
            requestHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            statusCode: null,
            responseBody: null
        });

        setTimeout(async () => {
            await IdempotencyKey.update(
                {
                    statusCode: 201,
                    responseBody: {
                        id: 123,
                        name: 'David',
                        lastName: 'González',
                        email: 'david@example.com'
                    }
                },
                {
                    where: {
                        key: 'wait-test-001',
                        method: 'POST',
                        route: '/users'
                    }
                }
            );
        }, 200);

        const result = await waitForCompletion({
            key: 'wait-test-001',
            method: 'POST',
            route: '/users',
            requestHash:
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            timeout: 2000,
            interval: 50
        });

        expect(result.statusCode).toBe(201);

        expect(result.responseBody).toEqual({
            id: 123,
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });
    });
});