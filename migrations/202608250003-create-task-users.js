'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('task_users', {
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

            userId: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                field: 'user_id',
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },

            completed: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },

            completedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                field: 'completed_at'
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

        await queryInterface.addConstraint('task_users', {
            fields: ['task_id', 'user_id'],
            type: 'unique',
            name: 'uk_task_users_task_user'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('task_users');
    }
};