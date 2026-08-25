const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define(
    'Task',
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },

        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        status: {
            type: DataTypes.ENUM('open', 'archived'),
            allowNull: false,
            defaultValue: 'open'
        },

        archivedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'archived_at'
        }
    },
    {
        tableName: 'tasks',
        timestamps: true,
        underscored: true
    }
);

module.exports = Task;