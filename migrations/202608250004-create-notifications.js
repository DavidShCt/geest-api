'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('notifications', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },

            taskId: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                field: 'task_id',
                references: {
                    model: 'tasks',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },

            attempt: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false
            },

            statusCode: {
                type: Sequelize.INTEGER,
                allowNull: true,
                field: 'status_code'
            },

            attemptedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                field: 'attempted_at',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },

            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                field: 'created_at',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        }, {
            engine: 'InnoDB'
        });

        await queryInterface.addConstraint('notifications', {
            fields: ['task_id', 'attempt'],
            type: 'unique',
            name: 'uk_notifications_task_attempt'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('notifications');
    }
};