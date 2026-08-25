'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('tasks', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },

            title: {
                type: Sequelize.STRING(255),
                allowNull: false
            },

            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },

            status: {
                type: Sequelize.ENUM('open', 'archived'),
                allowNull: false,
                defaultValue: 'open'
            },

            archivedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                field: 'archived_at'
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
        await queryInterface.dropTable('tasks');
    }
};