const express = require('express');

const taskController = require('../controllers/task.controller');
const idempotencyMiddleware = require('../middlewares/idempotency.middleware');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post(
    '/',
    idempotencyMiddleware,
    asyncHandler(taskController.createTask)
);

router.get(
    '/',
    asyncHandler(taskController.getTasks)
);

router.get('/:idTask', asyncHandler(taskController.getTaskById));

router.get(
    '/:idTask/notifications',
    asyncHandler(taskController.getTaskNotifications)
);

router.post(
    '/:idTask/assign',
    idempotencyMiddleware,
    asyncHandler(taskController.assignUsersToTask)
);

router.post(
    '/:idTask/complete',
    idempotencyMiddleware,
    asyncHandler(taskController.completeTask)
);


module.exports = router;