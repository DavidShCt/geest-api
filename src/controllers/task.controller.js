const taskService = require('../services/task.service');

async function createTask(req, res) {
    const result = await taskService.createTask({
        ...req.body,
        idempotency: req.idempotency
    });

    return res
        .status(result.statusCode)
        .json(result.responseBody);
}

async function assignUsersToTask(req, res) {
    const result =
        await taskService.assignUsersToTask({
            idTask: Number(req.params.idTask),
            userIds: req.body.userIds,
            idempotency: req.idempotency
        });

    return res
        .status(result.statusCode)
        .json(result.responseBody);
}

async function completeTask(req, res) {

    const result = await taskService.completeTask({
        idTask: req.params.idTask,
        userId: req.body.userId,
        idempotency: req.idempotency
    });

    return res
        .status(result.statusCode)
        .json(result.responseBody);
}

async function getTasks(req, res) {

    const result = await taskService.getTasks({
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit
    });

    return res
        .status(200)
        .json(result);

}

async function getTaskById(req, res) {

    const task = await taskService.getTaskById(
        Number(req.params.idTask)
    );

    return res.status(200).json(task);
}

async function getTaskNotifications(req, res) {

    const notifications = await taskService.getTaskNotifications(
        req.params.idTask
    );

    return res
        .status(200)
        .json(notifications);
}

module.exports = {
    createTask,
    assignUsersToTask,
    completeTask,
    getTasks,
    getTaskById,
    getTaskNotifications
};