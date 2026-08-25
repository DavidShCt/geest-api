const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TaskUser = sequelize.define(
    'TaskUser',
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

        userId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'user_id'
        },

        completed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        completedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'completed_at'
        }
    },
    {
        tableName: 'task_users',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['task_id', 'user_id']
            }
        ]
    }
);

module.exports = TaskUser;