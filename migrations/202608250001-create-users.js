'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },

            name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },

            lastName: {
                type: Sequelize.STRING(100),
                allowNull: false,
                field: 'last_name'
            },

            email: {
                type: Sequelize.STRING(255),
                allowNull: false,
                unique: true
            },

            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                field: 'created_at',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },

            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                field: 'updated_at',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        }, {
            engine: 'InnoDB'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('users');
    }
};