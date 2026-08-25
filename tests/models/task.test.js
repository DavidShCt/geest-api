const { sequelize, cleanDatabase } = require('../helpers/database');
const { Task } = require('../../src/models');

describe('Task model', () => {
    beforeAll(async () => {
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test('should create a task with open status', async () => {
        const task = await Task.create({
            title: 'Crear reporte'
        });

        expect(task.id).toBeDefined();
        expect(task.title).toBe('Crear reporte');
        expect(task.description).toBeNull();
        expect(task.status).toBe('open');
        expect(task.archivedAt).toBeNull();
    });

    test('should create a task with description', async () => {
        const task = await Task.create({
            title: 'Crear reporte',
            description: 'Reporte mensual'
        });

        expect(task.description).toBe('Reporte mensual');
    });
});