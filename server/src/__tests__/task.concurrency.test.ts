import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import Task from "../models/task.model.js";
import Activity from "../models/activity.model.js";
import { updateTaskNotes } from "../services/task.service.js";
import { ConflictError, NotFoundError } from "../utils/app-error.js";
import { ACTIVITY_TYPES } from "../constants/activity.js";

describe("Phase 17.3 Backend Concurrency Hardening", () => {
  let mongoServer: MongoMemoryServer;
  const userA = new mongoose.Types.ObjectId().toString();
  const userB = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Task.deleteMany({});
    await Activity.deleteMany({});
  });

  it("1 & 2. Correct expectedVersion saves successfully and increments version", async () => {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
      status: "todo",
      priority: "none",
    });
    
    expect(task.__v).toBe(0);

    const updatedTask = await updateTaskNotes(
      task._id.toString(),
      userA,
      { notes: "New Notes", expectedVersion: 0 }
    );

    expect(updatedTask.notes).toBe("New Notes");
    expect(updatedTask.__v).toBe(1);
    
    // Verify it actually persisted
    const dbTask = await Task.findById(task._id);
    expect(dbTask?.notes).toBe("New Notes");
    expect(dbTask?.__v).toBe(1);
  });

  it("3 & 4. Stale expectedVersion returns 409 and does not overwrite", async () => {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
      notes: "V1",
    });
    
    // Simulate someone else updating the task
    await Task.updateOne({ _id: task._id }, { $set: { notes: "V2" }, $inc: { __v: 1 } });

    await expect(
      updateTaskNotes(task._id.toString(), userA, { notes: "V3", expectedVersion: 0 })
    ).rejects.toThrow(ConflictError);

    // Verify it was NOT overwritten
    const dbTask = await Task.findById(task._id);
    expect(dbTask?.notes).toBe("V2"); // Still V2
    expect(dbTask?.__v).toBe(1);
  });

  it("5. Cross-tenant request still returns 404, not 409", async () => {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
    });

    // User B tries to update User A's task, even with wrong version
    await expect(
      updateTaskNotes(task._id.toString(), userB, { notes: "Hacked", expectedVersion: 999 })
    ).rejects.toThrow(NotFoundError);
  });

  it("6. Deleted Task returns 404", async () => {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
      isDeleted: true,
    });

    await expect(
      updateTaskNotes(task._id.toString(), userA, { notes: "Hello", expectedVersion: 0 })
    ).rejects.toThrow(NotFoundError);
  });

  it("7 & 8. Notes update still generates zero Activity events", async () => {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
    });

    await updateTaskNotes(task._id.toString(), userA, { notes: "New Notes", expectedVersion: 0 });

    const activities = await Activity.find({ taskId: task._id.toString() });
    expect(activities.length).toBe(0); // Assuming creation here bypassed the service
  });

  it("9. Two simulated clients using the same starting version", async () => {
    const task = await Task.create({
      owner: userA,
      title: "Test Task",
      notes: "Start",
    });

    // Client 1 loads task (__v = 0)
    // Client 2 loads task (__v = 0)
    const client1Version = task.__v;
    const client2Version = task.__v;

    // Client 1 saves successfully
    await updateTaskNotes(task._id.toString(), userA, { notes: "Client 1 Edit", expectedVersion: client1Version });

    // Client 2 attempts to save
    await expect(
      updateTaskNotes(task._id.toString(), userA, { notes: "Client 2 Edit", expectedVersion: client2Version })
    ).rejects.toThrow(ConflictError);

    // Verify Client 1's edit survived
    const dbTask = await Task.findById(task._id);
    expect(dbTask?.notes).toBe("Client 1 Edit");
    expect(dbTask?.__v).toBe(1);
  });
});
