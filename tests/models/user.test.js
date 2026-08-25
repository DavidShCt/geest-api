const { sequelize, cleanDatabase } = require('../helpers/database');
const { User } = require('../../src/models');

describe('User model', () => {
    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('should create a user', async () => {
        const user = await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        expect(user.id).toBeDefined();
        expect(user.name).toBe('David');
        expect(user.lastName).toBe('González');
        expect(user.email).toBe('david@example.com');
    });

    test('should reject an invalid email', async () => {
        await expect(
            User.create({
                name: 'David',
                lastName: 'González',
                email: 'invalid-email'
            })
        ).rejects.toThrow();
    });

    test('should reject duplicate emails', async () => {
        await User.create({
            name: 'David',
            lastName: 'González',
            email: 'david@example.com'
        });

        await expect(
            User.create({
                name: 'Juan',
                lastName: 'Pérez',
                email: 'david@example.com'
            })
        ).rejects.toThrow();
    });
});