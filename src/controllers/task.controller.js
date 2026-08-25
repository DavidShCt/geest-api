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

module.exports = {
    createTask,
    assignUsersToTask,
    completeTask
};