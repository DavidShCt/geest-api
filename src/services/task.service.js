const {
    User,
    Task,
    TaskUser,
    Notification,
    IdempotencyKey
} = require('../models');

const notificationService = require('./notification.service');

const AppError = require('../utils/AppError');

const {
    normalizeResponseBody
} = require('./idempotency.service');

async function createTask({
    title,
    description,
    idempotency
}) {
    if (!title || !title.trim()) {
        throw new AppError(
            'TITLE_REQUIRED',
            'Title is required.',
            400
        );
    }

    const taskData = {
        title: title.trim(),
        description:
            description === undefined || description === null
                ? null
                : description.trim()
    };

    const transaction = await Task.sequelize.transaction();

    try {
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

        const task = await Task.create(
            taskData,
            {
                transaction
            }
        );

        const responseBody = {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status
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

async function assignUsersToTask({
    idTask,
    userIds,
    idempotency
}) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError(
            'USER_IDS_REQUIRED',
            'userIds must be a non-empty array.',
            400
        );
    }

    const normalizedUserIds = [
        ...new Set(
            userIds.map(Number)
        )
    ];

    if (
        normalizedUserIds.some(
            userId =>
                !Number.isInteger(userId) ||
                userId <= 0
        )
    ) {
        throw new AppError(
            'INVALID_USER_IDS',
            'userIds must contain valid user IDs.',
            400
        );
    }

    const task = await Task.findByPk(idTask);

    if (!task) {
        throw new AppError(
            'TASK_NOT_FOUND',
            'Task not found.',
            404
        );
    }

    const users = await User.findAll({
        where: {
            id: normalizedUserIds
        }
    });

    if (users.length !== normalizedUserIds.length) {
        throw new AppError(
            'USER_NOT_FOUND',
            'One or more users were not found.',
            404
        );
    }

    const transaction =
        await Task.sequelize.transaction();

    try {
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

        for (const userId of normalizedUserIds) {
            await TaskUser.findOrCreate({
                where: {
                    taskId: task.id,
                    userId
                },
                defaults: {
                    taskId: task.id,
                    userId,
                    completed: false,
                    completedAt: null
                },
                transaction
            });
        }

        const responseBody = {
            message: 'Users assigned to task successfully.'
        };

        await IdempotencyKey.update(
            {
                statusCode: 200,
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
            statusCode: 200,
            responseBody
        };
    } catch (error) {
        await transaction.rollback();

        if (
            error.name ===
            'SequelizeUniqueConstraintError'
        ) {
            const existing =
                await IdempotencyKey.findOne({
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

                if (
                    existing.statusCode !== null &&
                    existing.responseBody !== null
                ) {
                    return {
                        statusCode:
                            existing.statusCode,
                        responseBody:
                            normalizeResponseBody(
                                existing.responseBody
                            )
                    };
                }
            }
        }

        throw error;
    }
}

async function completeTask({
    idTask,
    userId,
    idempotency
}) {

    if (!userId) {
        throw new AppError(
            'USER_ID_REQUIRED',
            'userId is required.',
            400
        );
    }

    const transaction = await Task.sequelize.transaction();
    let shouldNotify = false;
    try {

        /*
         * Reservamos la Idempotency-Key dentro de la misma
         * transacción de la operación.
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

        const task = await Task.findByPk(
            idTask,
            {
                transaction,
                lock: transaction.LOCK.UPDATE
            }
        );

        if (!task) {
            throw new AppError(
                'TASK_NOT_FOUND',
                'Task not found.',
                404
            );
        }

        const user = await User.findByPk(
            userId,
            {
                transaction
            }
        );

        if (!user) {
            throw new AppError(
                'USER_NOT_FOUND',
                'User not found.',
                404
            );
        }

        const assignment = await TaskUser.findOne({
            where: {
                taskId: task.id,
                userId
            },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!assignment) {
            throw new AppError(
                'USER_NOT_ASSIGNED',
                'User is not assigned to this task.',
                404
            );
        }

        /*
         * Si ya había completado su participación,
         * no volvemos a modificarla.
         */
        if (!assignment.completed) {

            assignment.completed = true;
            assignment.completedAt = new Date();

            await assignment.save({
                transaction
            });
        }

        /*
         * Revisamos si todavía existen usuarios
         * pendientes de completar su participación.
         */
        const pendingAssignments = await TaskUser.count({
            where: {
                taskId: task.id,
                completed: false
            },
            transaction
        });

        /*
         * Si ya no quedan usuarios pendientes,
         * archivamos la tarea.
         */
        if (
            pendingAssignments === 0 &&
            task.status === 'open'
        ) {
        
            task.status = 'archived';
            task.archivedAt = new Date();
        
            await task.save({
                transaction
            });
        
            shouldNotify = true;
        }

        const responseBody = {
            message: 'Task participation completed successfully.'
        };

        await IdempotencyKey.update(
            {
                statusCode: 200,
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
        if (shouldNotify) {
            await notificationService.sendNotification({
                taskId: task.id,
                title: task.title,
                archivedAt: task.archivedAt
            });
        }

        return {
            statusCode: 200,
            responseBody
        };

    } catch (error) {

        await transaction.rollback();

        if (
            error.name === 'SequelizeUniqueConstraintError'
        ) {

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

async function getTasks({
    status,
    page,
    limit
} = {}) {

    if (
        status &&
        !['open', 'archived'].includes(status)
    ) {

        throw new AppError(
            'INVALID_STATUS',
            'Invalid status. Use "open" or "archived".',
            400
        );
    }

    const hasPage =
        page !== undefined;

    const hasLimit =
        limit !== undefined;

    /*
     * page y limit deben enviarse juntos.
     */
    if (hasPage !== hasLimit) {

        throw new AppError(
            'PAGINATION_PARAMS_REQUIRED',
            'page and limit must be provided together.',
            400
        );
    }

    const where = {};

    if (status) {
        where.status = status;
    }

    /*
     * Si no se solicita paginación,
     * conservamos exactamente el comportamiento original.
     */
    if (!hasPage && !hasLimit) {

        const tasks = await Task.findAll({
            where,
            attributes: [
                'id',
                'title',
                'description',
                'status',
                'archivedAt'
            ],
            include: [
                {
                    model: User,
                    as: 'users',
                    attributes: [
                        'id',
                        'name',
                        'lastName',
                        'email'
                    ],
                    through: {
                        attributes: [
                            'completed',
                            'completedAt'
                        ]
                    },
                    required: false
                }
            ],
            order: [
                ['id', 'ASC']
            ]
        });

        return tasks.map(task => {

            const plainTask = task.get({
                plain: true
            });

            return {
                id: plainTask.id,
                title: plainTask.title,
                description: plainTask.description,
                status: plainTask.status,
                archivedAt: plainTask.archivedAt,
                users: (plainTask.users || []).map(user => ({
                    id: user.id,
                    name: user.name,
                    lastName: user.lastName,
                    email: user.email,
                    completed: Boolean(
                        user.TaskUser?.completed
                    ),
                    completedAt:
                        user.TaskUser?.completedAt || null
                }))
            };
        });
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    if (
        !Number.isInteger(parsedPage) ||
        parsedPage < 1
    ) {

        throw new AppError(
            'INVALID_PAGE',
            'page must be a positive integer.',
            400
        );
    }

    if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1
    ) {

        throw new AppError(
            'INVALID_LIMIT',
            'limit must be a positive integer.',
            400
        );
    }

    const offset =
        (parsedPage - 1) * parsedLimit;

    const {
        count,
        rows
    } = await Task.findAndCountAll({
        where,
        attributes: [
            'id',
            'title',
            'description',
            'status',
            'archivedAt'
        ],
        include: [
            {
                model: User,
                as: 'users',
                attributes: [
                    'id',
                    'name',
                    'lastName',
                    'email'
                ],
                through: {
                    attributes: [
                        'completed',
                        'completedAt'
                    ]
                },
                required: false
            }
        ],
        order: [
            ['id', 'ASC']
        ],
        limit: parsedLimit,
        offset,
        distinct: true
    });

    const data = rows.map(task => {

        const plainTask = task.get({
            plain: true
        });

        return {
            id: plainTask.id,
            title: plainTask.title,
            description: plainTask.description,
            status: plainTask.status,
            archivedAt: plainTask.archivedAt,
            users: (plainTask.users || []).map(user => ({
                id: user.id,
                name: user.name,
                lastName: user.lastName,
                email: user.email,
                completed: Boolean(
                    user.TaskUser?.completed
                ),
                completedAt:
                    user.TaskUser?.completedAt || null
            }))
        };
    });

    return {
        data,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            totalItems: count,
            totalPages: Math.ceil(
                count / parsedLimit
            )
        }
    };
}

async function getTaskById(idTask) {

    if (!Number.isInteger(idTask) || idTask <= 0) {
        throw new AppError(
            'TASK_NOT_FOUND',
            'Task not found.',
            404
        );
    }

    const task = await Task.findByPk(idTask, {
        include: [
            {
                model: User,
                as: 'users',
                attributes: [
                    'id',
                    'name',
                    'lastName'
                ],
                through: {
                    attributes: [
                        'completed'
                    ]
                }
            }
        ]
    });

    if (!task) {
        throw new AppError(
            'TASK_NOT_FOUND',
            'Task not found.',
            404
        );
    }

    const taskData = task.toJSON();

    return {
        id: taskData.id,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        archivedAt: taskData.archivedAt,
        users: (taskData.users || []).map(user => ({
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            completed: user.TaskUser
                ? user.TaskUser.completed
                : false
        }))
    };
}

async function getTaskNotifications(idTask) {

    const task = await Task.findByPk(idTask);

    if (!task) {
        throw new AppError(
            'TASK_NOT_FOUND',
            'Task not found.',
            404
        );
    }

    const notifications = await Notification.findAll({
        where: {
            taskId: task.id
        },
        attributes: [
            'id',
            'taskId',
            'attempt',
            'attemptedAt',
            'statusCode'
        ],
        order: [
            ['attempt', 'ASC']
        ]
    });

    return notifications.map(notification => ({
        id: notification.id,
        taskId: notification.taskId,
        attempt: notification.attempt,
        attemptedAt: notification.attemptedAt,
        statusCode: notification.statusCode
    }));
}

module.exports = {
    createTask,
    assignUsersToTask,
    completeTask,
    getTasks,
    getTaskById,
    getTaskNotifications
};