const User = require('./User');
const Task = require('./Task');
const TaskUser = require('./TaskUser');
const Notification = require('./Notification');
const IdempotencyKey = require('./IdempotencyKey');

/*
 * User <-> Task
 *
 * Un usuario puede tener muchas tareas.
 * Una tarea puede tener muchos usuarios.
 */
User.belongsToMany(Task, {
    through: TaskUser,
    foreignKey: 'userId',
    otherKey: 'taskId',
    as: 'tasks'
});

Task.belongsToMany(User, {
    through: TaskUser,
    foreignKey: 'taskId',
    otherKey: 'userId',
    as: 'users'
});

/*
 * User -> TaskUser
 */
User.hasMany(TaskUser, {
    foreignKey: 'userId',
    as: 'taskAssignments'
});

TaskUser.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

/*
 * Task -> TaskUser
 */
Task.hasMany(TaskUser, {
    foreignKey: 'taskId',
    as: 'assignments'
});

TaskUser.belongsTo(Task, {
    foreignKey: 'taskId',
    as: 'task'
});

/*
 * Task -> Notification
 */
Task.hasMany(Notification, {
    foreignKey: 'taskId',
    as: 'notifications'
});

Notification.belongsTo(Task, {
    foreignKey: 'taskId',
    as: 'task'
});

module.exports = {
    User,
    Task,
    TaskUser,
    Notification,
    IdempotencyKey
};