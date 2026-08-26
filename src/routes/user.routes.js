const express = require('express');

const userController = require('../controllers/user.controller');

const idempotencyMiddleware = require('../middlewares/idempotency.middleware');

const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post(
    '/',
    idempotencyMiddleware,
    asyncHandler(userController.createUser)
);

router.get(
    '/',
    asyncHandler(userController.getUsers)
);

router.get(
    '/:idUser/tasks',
    asyncHandler(userController.getUserTasks)
);

module.exports = router;