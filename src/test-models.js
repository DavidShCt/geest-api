const sequelize = require("./config/database");

const {
  User,
  Task,
  TaskUser,
  Notification,
  IdempotencyKey,
} = require("./models");

async function testModels() {
  try {
    await sequelize.authenticate();

    console.log("Database connection OK");

    console.log("User:", User.name);
    console.log("Task:", Task.name);
    console.log("TaskUser:", TaskUser.name);
    console.log("Notification:", Notification.name);
    console.log("IdempotencyKey:", IdempotencyKey.name);
    console.log(User.associations.tasks.associationType);
    console.log(Task.associations.users.associationType);
    console.log(Task.associations.notifications.associationType);

    await sequelize.close();
  } catch (error) {
    console.error(error);
  }
}

testModels();
