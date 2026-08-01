import dotenv from "dotenv";
import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

dotenv.config();

import app from "../app.js";
import User from "../models/user.model.js";
import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import PlanDraft from "../models/plan-draft.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import {
  createRealtimeServer,
  domainEventBus,
  REALTIME_EVENTS,
  RealtimeEventEnvelope,
  userSessionRegistry,
  RealtimeServerInstance,
} from "../realtime/index.js";
import { createTask, updateTask, toggleTaskArchive, deleteTask } from "../services/task.service.js";
import { createProject, updateProject, deleteProject } from "../services/project.service.js";
import { removeWorkspaceMember } from "../services/workspace.service.js";
import { commitPlan } from "../services/plan-commit.service.js";
import { confirmAction, performActionDryRun } from "../services/copilot-action.service.js";

function expect(value: boolean, message: string) {
  if (!value) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ Passed: ${message}`);
}

function waitForConnect(clientSocket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Connect timeout")), 5000);
    clientSocket.on("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    clientSocket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function subscribeWorkspace(
  socket: ClientSocket,
  payload: unknown,
): Promise<{ status: string; workspaceId?: string; message?: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => resolve({ status: "error", message: "Subscription timeout" }),
      3000,
    );
    socket.emit(REALTIME_EVENTS.WORKSPACE_SUBSCRIBE, payload, (ack: any) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

function waitForDomainEvent(
  socket: ClientSocket,
  filterFn?: (evt: RealtimeEventEnvelope) => boolean,
  timeoutMs = 5000,
): Promise<RealtimeEventEnvelope> {
  return new Promise((resolve, reject) => {
    const handler = (event: RealtimeEventEnvelope) => {
      if (!filterFn || filterFn(event)) {
        clearTimeout(timer);
        socket.off(REALTIME_EVENTS.DOMAIN_EVENT, handler);
        resolve(event);
      }
    };
    const timer = setTimeout(() => {
      socket.off(REALTIME_EVENTS.DOMAIN_EVENT, handler);
      reject(new Error("Domain event timeout"));
    }, timeoutMs);
    socket.on(REALTIME_EVENTS.DOMAIN_EVENT, handler);
  });
}

async function runTests() {
  await setupTestDatabase();

  let httpServer: HttpServer | undefined;
  let realtimeServer: RealtimeServerInstance | undefined;
  let serverPort = 0;

  try {
    console.log("\n==================================================");
    console.log("▶ Phase 34 WP-4 — Authoritative Domain Service Event Publication Tests");
    console.log("==================================================\n");

    userSessionRegistry.clear();
    domainEventBus.clear();

    httpServer = createServer(app);
    realtimeServer = createRealtimeServer(httpServer);

    const serverToListen = httpServer;
    await new Promise<void>((resolve) => {
      serverToListen.listen(0, () => {
        const addr = serverToListen.address() as AddressInfo;
        serverPort = addr.port;
        resolve();
      });
    });

    const serverUrl = `http://localhost:${serverPort}`;

    // Setup Test Data: Users and Workspaces
    const userOwnerA = await User.create({
      name: "Owner User A",
      email: "ownerA@pub-test.com",
      username: "ownerA_pub",
      password: "password123!",
    });

    const userMemberB = await User.create({
      name: "Member User B",
      email: "memberB@pub-test.com",
      username: "memberB_pub",
      password: "password123!",
    });

    const workspaceAlpha = await Workspace.create({
      name: "Pub Workspace Alpha",
      slug: "pub-workspace-alpha",
      ownerId: userOwnerA._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userOwnerA._id, role: "OWNER" });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userMemberB._id, role: "MEMBER" });

    const workspaceBeta = await Workspace.create({
      name: "Pub Workspace Beta",
      slug: "pub-workspace-beta",
      ownerId: userMemberB._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceBeta._id, userId: userMemberB._id, role: "OWNER" });

    const tokenA = generateAccessToken(userOwnerA._id.toString());
    const tokenB = generateAccessToken(userMemberB._id.toString());

    const wsAlphaId = workspaceAlpha._id.toString();
    const wsBetaId = workspaceBeta._id.toString();

    const clientA = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
    const clientB = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await Promise.all([waitForConnect(clientA), waitForConnect(clientB)]);

    await subscribeWorkspace(clientA, { workspaceId: wsAlphaId });
    await subscribeWorkspace(clientB, { workspaceId: wsBetaId });

    // =========================================================================
    // 1. Authoritative Task Creation Event Publication
    // =========================================================================
    console.log(">> 1. Authoritative Task Creation Event Publication...");
    const taskPromise = waitForDomainEvent(clientA, (e) => e.type === "task.created");

    const createdTask = await createTask(userOwnerA._id.toString(), {
      title: "Realtime Published Task",
      status: "todo",
      priority: "high",
    }, wsAlphaId);

    const taskCreatedEvent = await taskPromise;
    expect(taskCreatedEvent.type === "task.created", "task.created event received");
    expect(taskCreatedEvent.workspaceId === wsAlphaId, "Event workspaceId matches tenant");
    expect(taskCreatedEvent.resource.id === createdTask._id.toString(), "Event resource ID matches created task ID");

    // =========================================================================
    // 2. Authoritative Task Update Event Publication
    // =========================================================================
    console.log("\n>> 2. Authoritative Task Update Event Publication...");
    const updatePromise = waitForDomainEvent(clientA, (e) => e.type === "task.updated");

    await updateTask(createdTask._id.toString(), userOwnerA._id.toString(), {
      title: "Realtime Published Task (Updated)",
      status: "in_progress",
    }, wsAlphaId);

    const taskUpdatedEvent = await updatePromise;
    expect(taskUpdatedEvent.type === "task.updated", "task.updated event received");
    expect(taskUpdatedEvent.resource.id === createdTask._id.toString(), "Updated task resource ID matches");

    // =========================================================================
    // 3. Authoritative Task Archive & Delete Event Publication
    // =========================================================================
    console.log("\n>> 3. Authoritative Task Archive & Delete Events...");
    const archivePromise = waitForDomainEvent(clientA, (e) => e.type === "task.archived");
    await toggleTaskArchive(createdTask._id.toString(), userOwnerA._id.toString(), wsAlphaId);
    const archiveEvent = await archivePromise;
    expect(archiveEvent.type === "task.archived", "task.archived event received");

    // Unarchive
    await toggleTaskArchive(createdTask._id.toString(), userOwnerA._id.toString(), wsAlphaId);

    const deletePromise = waitForDomainEvent(clientA, (e) => e.type === "task.deleted");
    await deleteTask(createdTask._id.toString(), userOwnerA._id.toString(), wsAlphaId);
    const deleteEvent = await deletePromise;
    expect(deleteEvent.type === "task.deleted", "task.deleted event received");

    // =========================================================================
    // 4. Authoritative Project Mutation Events
    // =========================================================================
    console.log("\n>> 4. Authoritative Project Mutation Events...");
    const projCreatePromise = waitForDomainEvent(clientA, (e) => e.type === "project.created");
    const project = await createProject(userOwnerA._id.toString(), {
      name: "Realtime Project Alpha",
      description: "Project for real-time tests",
    }, wsAlphaId);

    const projCreatedEvent = await projCreatePromise;
    expect(projCreatedEvent.type === "project.created", "project.created event received");
    expect(projCreatedEvent.resource.id === project._id.toString(), "Project resource ID matches");

    const projUpdatePromise = waitForDomainEvent(clientA, (e) => e.type === "project.updated");
    await updateProject(project._id.toString(), userOwnerA._id.toString(), {
      name: "Realtime Project Alpha Updated",
      description: "Updated description",
      emoji: "🚀",
      color: "#4F46E5",
    }, wsAlphaId);
    const projUpdatedEvent = await projUpdatePromise;
    expect(projUpdatedEvent.type === "project.updated", "project.updated event received");

    const projDeletePromise = waitForDomainEvent(clientA, (e) => e.type === "project.deleted");
    await deleteProject(project._id.toString(), userOwnerA._id.toString(), wsAlphaId);
    const projDeletedEvent = await projDeletePromise;
    expect(projDeletedEvent.type === "project.deleted", "project.deleted event received");

    // =========================================================================
    // 5. Authoritative Plan Commit Event Publication
    // =========================================================================
    console.log("\n>> 5. Authoritative Plan Commit Event Publication...");
    const planProject = await createProject(userOwnerA._id.toString(), {
      name: "Plan Project",
      description: "Plan test project",
      emoji: "📋",
      color: "#4F46E5",
    }, wsAlphaId);

    const draft = await PlanDraft.create({
      owner: userOwnerA._id,
      projectId: planProject._id,
      status: "draft",
      promptDescription: "Test plan prompt description",
      tasks: [{ tempId: "t1", title: "Plan Task 1", priority: "medium", dependencies: [], position: 1 }],
      milestones: [{ tempId: "m1", title: "Milestone 1", position: 1 }],
      expiresAt: new Date(Date.now() + 3600000),
    });

    const planCommitPromise = waitForDomainEvent(clientA, (e) => e.type === "plan.committed");
    await commitPlan(userOwnerA._id.toString(), planProject._id.toString(), draft._id.toString());

    const planCommittedEvent = await planCommitPromise;
    expect(planCommittedEvent.type === "plan.committed", "plan.committed event received");
    expect(planCommittedEvent.resource.id === draft._id.toString(), "Plan draft resource ID matches");

    // =========================================================================
    // 6. Controlled AI Action Publication Inheritance
    // =========================================================================
    console.log("\n>> 6. Controlled AI Action Publication Inheritance...");
    const aiProject = await createProject(userOwnerA._id.toString(), {
      name: "AI Action Project",
      description: "AI action test project",
      emoji: "🤖",
      color: "#4F46E5",
    }, wsAlphaId);

    const dryRunRes = await performActionDryRun(
      userOwnerA._id.toString(),
      aiProject._id.toString(),
      {
        action: "CREATE_TASK",
        targetRef: "project",
        arguments: {
          title: "AI Generated Task",
          description: "Task created by AI action",
          status: "todo",
          priority: "high",
          dueDate: null,
          labels: [],
        },
        explanation: "Creating task via AI action",
      },
    );

    const aiTaskPromise = waitForDomainEvent(clientA, (e) => e.type === "task.created");
    await confirmAction(userOwnerA._id.toString(), dryRunRes.confirmationToken);

    const aiTaskEvent = await aiTaskPromise;
    expect(aiTaskEvent.type === "task.created", "Controlled AI Action task creation triggered task.created event automatically");

    // =========================================================================
    // 7. Member Removal Security Eviction + member.removed Event Isolation
    // =========================================================================
    console.log("\n>> 7. Member Removal Security Eviction & Event Isolation...");
    // Connect User B to Workspace Alpha
    await subscribeWorkspace(clientB, { workspaceId: wsAlphaId });

    let userB_ReceivedMemberRemoved = false;
    clientB.on(REALTIME_EVENTS.DOMAIN_EVENT, (e: RealtimeEventEnvelope) => {
      if (e.type === "member.removed") {
        userB_ReceivedMemberRemoved = true;
      }
    });

    const memberRemovedPromise = waitForDomainEvent(clientA, (e) => e.type === "member.removed");

    // Execute authoritative removal
    await removeWorkspaceMember(wsAlphaId, userMemberB._id.toString(), userOwnerA._id.toString());

    const memberRemovedEvent = await memberRemovedPromise;
    expect(memberRemovedEvent.type === "member.removed", "Remaining Owner A received member.removed event");

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(userB_ReceivedMemberRemoved === false, "Evicted User B received ZERO member.removed domain events");

    // =========================================================================
    // 8. Cross-Tenant Live Delivery Isolation
    // =========================================================================
    console.log("\n>> 8. Cross-Tenant Live Mutation Delivery Isolation...");
    let userB_ReceivedAlphaMutation = false;
    clientB.on(REALTIME_EVENTS.DOMAIN_EVENT, () => {
      userB_ReceivedAlphaMutation = true;
    });

    await createTask(userOwnerA._id.toString(), { title: "Isolation Test Task" }, wsAlphaId);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(userB_ReceivedAlphaMutation === false, "User B in Workspace Beta received ZERO live mutation events from Workspace Alpha");

    // =========================================================================
    // 9. Database Failure -> Zero Events
    // =========================================================================
    console.log("\n>> 9. Database Failure -> Zero Events...");
    let failedMutationEventEmitted = false;
    domainEventBus.subscribe("*", () => {
      failedMutationEventEmitted = true;
    });

    try {
      // Attempt task creation with invalid project ID format
      await createTask(userOwnerA._id.toString(), { title: "Failing Task", projectId: "invalid-proj-id" }, wsAlphaId);
    } catch {
      // Expected failure
    }

    expect(failedMutationEventEmitted === false, "Database/service failure produced ZERO domain events");

    clientA.disconnect();
    clientB.disconnect();

    console.log("\n==================================================");
    console.log("✅ All Phase 34 WP-4 Authoritative Domain Event Publication Tests Passed!");
    console.log("==================================================\n");
  } finally {
    if (realtimeServer) {
      await realtimeServer.close();
    }
    if (httpServer) {
      const serverToClose = httpServer;
      await new Promise<void>((resolve) => serverToClose.close(() => resolve()));
    }
    userSessionRegistry.clear();
    domainEventBus.clear();
    await teardownTestDatabase();
  }
}

runTests().catch((err) => {
  console.error("❌ Authoritative Domain Service Event Publication Test Suite Failed:", err);
  process.exit(1);
});
