const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IdempotencyKey = sequelize.define(
    'IdempotencyKey',
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },

        key: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        method: {
            type: DataTypes.STRING(10),
            allowNull: false
        },

        route: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        requestHash: {
            type: DataTypes.STRING(64),
            allowNull: false,
            field: 'request_hash'
        },

        statusCode: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'status_code'
        },

        responseBody: {
            type: DataTypes.JSON,
            allowNull: false,
            field: 'response_body'
        }
    },
    {
        tableName: 'idempotency_keys',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        underscored: true
    }
);

module.exports = IdempotencyKey;