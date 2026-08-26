const {
    IdempotencyKey
} = require('../../src/models');

const {
    waitForCompletion,
    getRequestHash
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
    test('should generate the same hash for objects with the same content in different key order', () => {
        const body1 = {
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        };

        const body2 = {
            email: 'david@example.com',
            name: 'David',
            lastName: 'González'
        };

        const hash1 = getRequestHash(body1);
        const hash2 = getRequestHash(body2);

        expect(hash1).toBe(hash2);
    });
});