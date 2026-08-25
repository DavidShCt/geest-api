const sequelize = require('../../src/config/database');

async function cleanDatabase() {
    const tables = [
        'notifications',
        'task_users',
        'tasks',
        'users',
        'idempotency_keys'
    ];

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tables) {
        await sequelize.query(`TRUNCATE TABLE ${table}`);
    }

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

module.exports = {
    sequelize,
    cleanDatabase
};