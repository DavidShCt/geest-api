const { sequelize, cleanDatabase } = require("../helpers/database");

const { User, Task, TaskUser } = require("../../src/models");

describe("User and Task associations", () => {
  beforeAll(async () => {
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test("should assign a user to a task", async () => {
    const user = await User.create({
      name: "David",
      lastName: "González",
      email: "david@example.com",
    });

    const task = await Task.create({
      title: "Crear reporte",
    });

    await task.addUser(user);

    const assignments = await TaskUser.findAll({
      where: {
        taskId: task.id,
      },
    });

    expect(assignments).toHaveLength(1);
    expect(assignments[0].userId).toBe(user.id);
    expect(assignments[0].taskId).toBe(task.id);
    expect(assignments[0].completed).toBe(false);
  });
  test("should retrieve tasks assigned to a user", async () => {
    const user = await User.create({
      name: "David",
      lastName: "González",
      email: "david@example.com",
    });

    const task = await Task.create({
      title: "Crear reporte",
    });

    await task.addUser(user);

    const tasks = await user.getTasks({
      joinTableAttributes: ["completed", "completedAt"],
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(task.id);
  });
});
