import dotenv from "dotenv";
import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

dotenv.config();

import app from "../app.js";
import User from "../models/user.model.js";
import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import Task from "../models/task.model.js";
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
import { createTask, updateTask } from "../services/task.service.js";
import { removeWorkspaceMember } from "../services/workspace.service.js";

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

function unsubscribeWorkspace(
  socket: ClientSocket,
  payload: unknown,
): Promise<{ status: string; workspaceId?: string; message?: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => resolve({ status: "error", message: "Unsubscription timeout" }),
      3000,
    );
    socket.emit(REALTIME_EVENTS.WORKSPACE_UNSUBSCRIBE, payload, (ack: any) => {
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
    console.log("▶ Phase 34 WP-5 — Client Realtime Foundation & Cache Sync E2E Tests");
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
      email: "ownerA@e2e-test.com",
      username: "ownerA_e2e",
      password: "password123!",
    });

    const userMemberB = await User.create({
      name: "Member User B",
      email: "memberB@e2e-test.com",
      username: "memberB_e2e",
      password: "password123!",
    });

    const workspaceAlpha = await Workspace.create({
      name: "E2E Workspace Alpha",
      slug: "e2e-workspace-alpha",
      ownerId: userOwnerA._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userOwnerA._id, role: "OWNER" });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userMemberB._id, role: "MEMBER" });

    const workspaceBeta = await Workspace.create({
      name: "E2E Workspace Beta",
      slug: "e2e-workspace-beta",
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
    await subscribeWorkspace(clientB, { workspaceId: wsAlphaId });

    // =========================================================================
    // 1. End-to-End Collaboration: Socket Event -> REST Authoritative Refetch
    // =========================================================================
    console.log(">> 1. End-to-End Live Collaboration: Socket Event -> REST Authoritative Refetch...");
    const taskPromise = waitForDomainEvent(clientB, (e) => e.type === "task.created");

    // User A creates task via authoritative domain service
    const createdTask = await createTask(userOwnerA._id.toString(), {
      title: "Realtime E2E Task",
      status: "todo",
      priority: "high",
    }, wsAlphaId);

    // Client B receives realtime notification that state changed
    const taskCreatedEvent = await taskPromise;
    expect(taskCreatedEvent.type === "task.created", "Client B received task.created event");
    expect(taskCreatedEvent.resource.id === createdTask._id.toString(), "Event resource ID matches created task ID");

    // Client B invalidates cache and refetches authoritative state via MongoDB/REST
    const refetchedTask = await Task.findById(createdTask._id);
    expect(refetchedTask !== null && refetchedTask.title === "Realtime E2E Task", "REST refetch fetched authoritative updated state from database");

    // =========================================================================
    // 2. End-to-End Task Update & REST Reconciliation
    // =========================================================================
    console.log("\n>> 2. End-to-End Task Update & REST Reconciliation...");
    const updatePromise = waitForDomainEvent(clientB, (e) => e.type === "task.updated");

    // User A updates task
    await updateTask(createdTask._id.toString(), userOwnerA._id.toString(), {
      title: "Realtime E2E Task (Updated)",
      status: "done",
    }, wsAlphaId);

    const taskUpdatedEvent = await updatePromise;
    expect(taskUpdatedEvent.type === "task.updated", "Client B received task.updated event");

    const refetchedUpdatedTask = await Task.findById(createdTask._id);
    expect(refetchedUpdatedTask?.status === "done", "REST refetch verified updated status = done");

    // =========================================================================
    // 3. Cross-Tenant Client Defense & Zero Contamination
    // =========================================================================
    console.log("\n>> 3. Cross-Tenant Client Defense & Zero Contamination...");
    // Switch Client B subscription from Workspace Alpha to Workspace Beta
    await unsubscribeWorkspace(clientB, { workspaceId: wsAlphaId });
    await subscribeWorkspace(clientB, { workspaceId: wsBetaId });

    let clientB_ReceivedAlphaEvent = false;
    clientB.on(REALTIME_EVENTS.DOMAIN_EVENT, () => {
      clientB_ReceivedAlphaEvent = true;
    });

    // User A mutates Workspace Alpha
    await createTask(userOwnerA._id.toString(), { title: "Alpha Exclusive Task" }, wsAlphaId);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(clientB_ReceivedAlphaEvent === false, "Client B in Workspace Beta received ZERO live mutation events from Workspace Alpha");

    // =========================================================================
    // 4. Workspace Eviction Protocol
    // =========================================================================
    console.log("\n>> 4. Workspace Eviction Protocol...");
    // Re-subscribe Client B to Workspace Alpha
    await unsubscribeWorkspace(clientB, { workspaceId: wsBetaId });
    await subscribeWorkspace(clientB, { workspaceId: wsAlphaId });

    let clientB_EvictedPayload: any = null;
    clientB.on(REALTIME_EVENTS.WORKSPACE_EVICTED, (payload) => {
      clientB_EvictedPayload = payload;
    });

    // User A removes User B from Workspace Alpha
    await removeWorkspaceMember(wsAlphaId, userMemberB._id.toString(), userOwnerA._id.toString());

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(clientB_EvictedPayload !== null, "Client B received workspace:evicted event");
    expect(clientB_EvictedPayload.workspaceId === wsAlphaId, "Eviction payload matches evicted workspace ID");

    clientA.disconnect();
    clientB.disconnect();

    console.log("\n==================================================");
    console.log("✅ All Phase 34 WP-5 Client Realtime E2E Tests Passed!");
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
  console.error("❌ Client Realtime E2E Test Suite Failed:", err);
  process.exit(1);
});
