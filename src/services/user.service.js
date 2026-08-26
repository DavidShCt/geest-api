const {
    User,
    Task,
    TaskUser,
    IdempotencyKey
} = require('../models');

const AppError = require('../utils/AppError');

const {
    normalizeResponseBody
} = require('./idempotency.service');

async function createUser({
    name,
    lastName,
    email,
    idempotency
}) {
    if (!name || !name.trim()) {
        throw new AppError(
            'NAME_REQUIRED',
            'Name is required.',
            400
        );
    }

    if (!lastName || !lastName.trim()) {
        throw new AppError(
            'LAST_NAME_REQUIRED',
            'Last name is required.',
            400
        );
    }

    if (!email || !email.trim()) {
        throw new AppError(
            'EMAIL_REQUIRED',
            'Email is required.',
            400
        );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userData = {
        name: name.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail
    };

    const transaction = await User.sequelize.transaction();

    try {
        /*
         * Reservamos la Idempotency-Key.
         *
         * La restricción UNIQUE de MariaDB:
         *
         * (key, method, route)
         *
         * garantiza que solamente una transacción
         * pueda crear esta operación.
         */
        await IdempotencyKey.create(
            {
                key: idempotency.key,
                method: idempotency.method,
                route: idempotency.route,
                requestHash: idempotency.requestHash,
                statusCode: null,
                responseBody: null
            },
            {
                transaction
            }
        );

        const user = await User.create(
            userData,
            {
                transaction
            }
        );

        const responseBody = {
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            email: user.email
        };

        await IdempotencyKey.update(
            {
                statusCode: 201,
                responseBody
            },
            {
                where: {
                    key: idempotency.key,
                    method: idempotency.method,
                    route: idempotency.route
                },
                transaction
            }
        );

        await transaction.commit();

        return {
            statusCode: 201,
            responseBody
        };
    } catch (error) {
        await transaction.rollback();

        /*
         * Si el error es por Idempotency-Key duplicada,
         * significa que otra petición ganó la carrera.
         */
        if (error.name === 'SequelizeUniqueConstraintError') {
            const existing = await IdempotencyKey.findOne({
                where: {
                    key: idempotency.key,
                    method: idempotency.method,
                    route: idempotency.route
                }
            });

            if (existing) {
                if (
                    existing.requestHash !==
                    idempotency.requestHash
                ) {
                    throw new AppError(
                        'IDEMPOTENCY_KEY_REUSED',
                        'The Idempotency-Key was already used with a different request body.',
                        409
                    );
                }

                /*
                 * Si ya terminó, devolvemos su respuesta.
                 */
                if (
                    existing.statusCode !== null &&
                    existing.responseBody !== null
                ) {
                    return {
                        statusCode: existing.statusCode,
                        responseBody: normalizeResponseBody(
                            existing.responseBody
                        )
                    };
                }
            }
        }

        throw error;
    }
}

async function getUsers() {

    const users = await User.findAll({
        attributes: [
            'id',
            'name',
            'lastName',
            'email'
        ],
        include: [
            {
                model: Task,
                as: 'tasks',
                attributes: [
                    'id',
                    'title',
                    'description',
                    'status'
                ],
                through: {
                    attributes: [],
                    where: {
                        completed: false
                    }
                },
                required: false
            }
        ],
        order: [
            ['id', 'ASC']
        ]
    });

    return users.map(user => ({
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        pendingTasks: user.tasks || []
    }));
}

async function getUserTasks(idUser) {

    const user = await User.findByPk(idUser);

    if (!user) {
        throw new AppError(
            'USER_NOT_FOUND',
            'User not found.',
            404
        );
    }

    const assignments = await TaskUser.findAll({
        where: {
            userId: user.id
        },
        include: [
            {
                model: Task,
                as: 'task',
                attributes: [
                    'id',
                    'title',
                    'description',
                    'status'
                ],
                required: true
            }
        ],
        order: [
            ['taskId', 'ASC']
        ]
    });

    return assignments.map(assignment => ({
        id: assignment.task.id,
        title: assignment.task.title,
        description: assignment.task.description,
        status: assignment.task.status,
        completed: assignment.completed
    }));
}

module.exports = {
    createUser,
    getUsers,
    getUserTasks
};