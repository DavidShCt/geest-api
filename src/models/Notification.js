const { DataTypes } = require('sequelize');

const sequelize = require('../config/database');

const Notification = sequelize.define(
    'Notification',
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },

        taskId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'task_id'
        },

        attempt: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },

        statusCode: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'status_code'
        },

        attemptedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'attempted_at'
        }
    },
    {
        tableName: 'notifications',
        timestamps: true,
        updatedAt: false,
        underscored: true
    }
);

module.exports = Notification;