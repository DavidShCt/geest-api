const { Sequelize } = require('sequelize');
require('dotenv').config();

const databaseName =
    process.env.NODE_ENV === 'test'
        ? process.env.DB_TEST_NAME
        : process.env.DB_NAME;

const sequelize = new Sequelize(
    databaseName,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false,
        timezone: '+00:00'
    }
);

module.exports = sequelize;