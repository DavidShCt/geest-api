const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },

        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        lastName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'last_name'
        },

        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        }
    },
    {
        tableName: 'users',
        timestamps: true,
        underscored: true
    }
);

module.exports = User;