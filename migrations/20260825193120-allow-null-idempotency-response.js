'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn(
            'idempotency_keys',
            'status_code',
            {
                type: Sequelize.INTEGER,
                allowNull: true
            }
        );

        await queryInterface.changeColumn(
            'idempotency_keys',
            'response_body',
            {
                type: Sequelize.JSON,
                allowNull: true
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.changeColumn(
            'idempotency_keys',
            'status_code',
            {
                type: Sequelize.INTEGER,
                allowNull: false
            }
        );

        await queryInterface.changeColumn(
            'idempotency_keys',
            'response_body',
            {
                type: Sequelize.JSON,
                allowNull: false
            }
        );
    }
};