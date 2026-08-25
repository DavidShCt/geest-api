const request = require("supertest");

const app = require("../../src/app");

const sequelize = require("../../src/config/database");

const { User, Task, TaskUser, IdempotencyKey } = require("../../src/models");

describe("POST /tasks/:idTask/assign", () => {
  let user1;
  let user2;
  let task;

  beforeAll(async () => {
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    await IdempotencyKey.destroy({
      where: {},
    });

    await TaskUser.destroy({
      where: {},
    });

    await Task.destroy({
      where: {},
    });

    await User.destroy({
      where: {},
    });

    user1 = await User.create({
      name: "Juan",
      lastName: "Pérez",
      email: "juan@example.com",
    });

    user2 = await User.create({
      name: "Ana",
      lastName: "López",
      email: "ana@example.com",
    });

    task = await Task.create({
      title: "Preparar reporte",
      description: "Reporte mensual",
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // tests...
  test("should assign users to a task", async () => {
    const response = await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-1")
      .send({
        userIds: [user1.id, user2.id],
      });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Users assigned to task successfully.",
    });

    const assignments = await TaskUser.findAll({
      where: {
        taskId: task.id,
      },
    });

    expect(assignments).toHaveLength(2);
  });
  test("should return 404 when task does not exist", async () => {
    const response = await request(app)
      .post("/tasks/999999/assign")
      .set("Idempotency-Key", "assign-2")
      .send({
        userIds: [user1.id],
      });

    expect(response.status).toBe(404);

    expect(response.body.error.code).toBe("TASK_NOT_FOUND");
  });
  test("should return 404 when a user does not exist", async () => {
    const response = await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-3")
      .send({
        userIds: [user1.id, 999999],
      });

    expect(response.status).toBe(404);

    expect(response.body.error.code).toBe("USER_NOT_FOUND");
  });
  test("should require userIds", async () => {
    const response = await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-4")
      .send({});

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe("USER_IDS_REQUIRED");
  });
  test("should not duplicate existing assignments", async () => {
    await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-5-a")
      .send({
        userIds: [user1.id, user2.id],
      });

    const response = await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-5-b")
      .send({
        userIds: [user1.id, user2.id],
      });

    expect(response.status).toBe(200);

    const assignments = await TaskUser.findAll({
      where: {
        taskId: task.id,
      },
    });

    expect(assignments).toHaveLength(2);
  });
  test("should return the same response for the same Idempotency-Key and body", async () => {
    const body = {
      userIds: [user1.id, user2.id],
    };

    const firstResponse = await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-6")
      .send(body);

    const secondResponse = await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-6")
      .send(body);

    expect(secondResponse.status).toBe(firstResponse.status);

    expect(secondResponse.body).toEqual(firstResponse.body);

    const assignments = await TaskUser.findAll({
      where: {
        taskId: task.id,
      },
    });

    expect(assignments).toHaveLength(2);
  });
  test("should reject the same Idempotency-Key with a different body", async () => {
    await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-7")
      .send({
        userIds: [user1.id],
      });

    const response = await request(app)
      .post(`/tasks/${task.id}/assign`)
      .set("Idempotency-Key", "assign-7")
      .send({
        userIds: [user2.id],
      });

    expect(response.status).toBe(409);

    expect(response.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });
});
