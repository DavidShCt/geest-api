const userService = require('../services/user.service');

async function createUser(req, res) {

    const result = await userService.createUser({
        ...req.body,
        idempotency: req.idempotency
    });

    return res
        .status(result.statusCode)
        .json(result.responseBody);
}

async function getUsers(req, res) {

    const users = await userService.getUsers();

    return res
        .status(200)
        .json(users);
}

module.exports = {
    createUser,
    getUsers
};