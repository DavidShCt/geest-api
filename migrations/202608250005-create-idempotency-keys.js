'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('idempotency_keys', {
            id: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true
            },

            key: {
                type: Sequelize.STRING(255),
                allowNull: false
            },

            method: {
                type: Sequelize.STRING(10),
                allowNull: false
            },

            route: {
                type: Sequelize.STRING(255),
                allowNull: false
            },

            requestHash: {
                type: Sequelize.STRING(64),
                allowNull: false,
                field: 'request_hash'
            },

            statusCode: {
                type: Sequelize.INTEGER,
                allowNull: false,
                field: 'status_code'
            },

            responseBody: {
                type: Sequelize.JSON,
                allowNull: false,
                field: 'response_body'
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

        await queryInterface.addConstraint('idempotency_keys', {
            fields: ['key', 'method', 'route'],
            type: 'unique',
            name: 'uk_idempotency_key_method_route'
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('idempotency_keys');
    }
};