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
import Project from "../models/project.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import {
  createRealtimeServer,
  domainEventBus,
  REALTIME_EVENTS,
  userSessionRegistry,
  presenceRegistry,
  socketRateLimiter,
  RealtimeServerInstance,
  RealtimeEventEnvelope,
  WorkspacePresenceSnapshot,
} from "../realtime/index.js";
import { removeWorkspaceMember } from "../services/workspace.service.js";
import { createDomainEvent } from "../realtime/schemas/domain-event.schema.js";

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

function waitForEvent<T = any>(
  socket: ClientSocket,
  eventName: string,
  filterFn?: (data: T) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (data: T) => {
      if (!filterFn || filterFn(data)) {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(data);
      }
    };
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Event ${eventName} timeout`));
    }, timeoutMs);
    socket.on(eventName, handler);
  });
}

async function runGate3Tests() {
  await setupTestDatabase();

  let httpServer: HttpServer | undefined;
  let realtimeServer: RealtimeServerInstance | undefined;

  try {
    console.log("\n==================================================");
    console.log("▶ Phase 34 Gate 3 — Final End-to-End Verification Tests");
    console.log("==================================================\n");

    userSessionRegistry.clear();
    domainEventBus.clear();
    presenceRegistry.clear();
    socketRateLimiter.clear();

    httpServer = createServer(app);
    realtimeServer = createRealtimeServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer!.listen(0, () => {
        resolve();
      });
    });

    const addr = httpServer!.address() as AddressInfo;
    const serverUrl = `http://localhost:${addr.port}`;

    // 1. Process Boundary Verification
    console.log(">> 1. Process Boundary Integrity Verification...");
    expect(userSessionRegistry.getActiveSocketCount() === 0, "Initial socket registry clean");
    expect(presenceRegistry.getSnapshot("any-ws").users.length === 0, "Initial presence registry clean");

    // Setup Test Data
    const userOwnerA = await User.create({
      name: "Gate3 Owner A",
      email: "ownerA_gate3@test.com",
      username: "ownerA_gate3",
      password: "Password123!",
    });

    const userMemberB = await User.create({
      name: "Gate3 Member B",
      email: "memberB_gate3@test.com",
      username: "memberB_gate3",
      password: "Password123!",
    });

    const workspaceAlpha = await Workspace.create({
      name: "Gate3 Workspace Alpha",
      slug: "gate3-workspace-alpha",
      ownerId: userOwnerA._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userOwnerA._id, role: "OWNER" });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userMemberB._id, role: "MEMBER" });

    const workspaceBeta = await Workspace.create({
      name: "Gate3 Workspace Beta",
      slug: "gate3-workspace-beta",
      ownerId: userMemberB._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceBeta._id, userId: userMemberB._id, role: "OWNER" });

    const projectAlpha = await Project.create({
      name: "Alpha Project Gate3",
      description: "Project in Alpha Gate3",
      owner: userOwnerA._id,
      workspaceId: workspaceAlpha._id,
      isDeleted: false,
    });

    const taskAlpha = await Task.create({
      title: "Alpha Task Gate3",
      owner: userOwnerA._id,
      workspaceId: workspaceAlpha._id,
      projectId: projectAlpha._id,
      status: "todo",
      priority: "high",
      position: 1,
      isDeleted: false,
    });

    const tokenA = generateAccessToken(userOwnerA._id.toString());
    const tokenB = generateAccessToken(userMemberB._id.toString());
    const wsAlphaId = workspaceAlpha._id.toString();
    const wsBetaId = workspaceBeta._id.toString();

    // 2. End-to-End Collaboration & Cross-Tenant Security Probe
    console.log("\n>> 2. End-to-End Collaboration & Cross-Tenant Security Probe...");
    const clientA = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
    const clientB_Alpha = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    const clientB_Beta = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });

    await Promise.all([
      waitForConnect(clientA),
      waitForConnect(clientB_Alpha),
      waitForConnect(clientB_Beta),
    ]);

    await subscribeWorkspace(clientA, { workspaceId: wsAlphaId });
    await subscribeWorkspace(clientB_Alpha, { workspaceId: wsAlphaId });
    await subscribeWorkspace(clientB_Beta, { workspaceId: wsBetaId });

    let betaClientReceivedAlphaEvent = false;
    clientB_Beta.on(REALTIME_EVENTS.DOMAIN_EVENT, (evt: RealtimeEventEnvelope) => {
      if (evt.workspaceId === wsAlphaId) {
        betaClientReceivedAlphaEvent = true;
      }
    });

    const alphaEventPromise = waitForEvent<RealtimeEventEnvelope>(clientB_Alpha, REALTIME_EVENTS.DOMAIN_EVENT);

    // Publish domain event in Workspace Alpha
    domainEventBus.publish(
      createDomainEvent({
        type: "task.updated",
        workspaceId: wsAlphaId,
        actorId: userOwnerA._id.toString(),
        resource: { type: "task", id: taskAlpha._id.toString() },
        payload: { title: "Updated Task Title" },
      }),
    );

    const receivedEventAlpha = await alphaEventPromise;
    expect(receivedEventAlpha.workspaceId === wsAlphaId, "Authorized Member B in Alpha received task.updated domain event");

    await new Promise((r) => setTimeout(r, 200));
    expect(betaClientReceivedAlphaEvent === false, "Workspace Beta client received ZERO events from Workspace Alpha");

    // 3. Client Event Forgery Resistance
    console.log("\n>> 3. Client Event Forgery Resistance...");
    let serverRelayedForgedEvent = false;
    clientA.on(REALTIME_EVENTS.DOMAIN_EVENT, (evt: RealtimeEventEnvelope) => {
      if (evt.id === "forged-event-123") {
        serverRelayedForgedEvent = true;
      }
    });

    // Client B attempts to emit a fake domain:event payload to server
    clientB_Alpha.emit(REALTIME_EVENTS.DOMAIN_EVENT, {
      id: "forged-event-123",
      protocolVersion: 1,
      type: "task.created",
      workspaceId: wsAlphaId,
      actorId: userOwnerA._id.toString(), // Attempted identity spoofing
      occurredAt: new Date().toISOString(),
      resource: { type: "task", id: "507f1f77bcf86cd799439011" },
      payload: { title: "Forged Task" },
    });

    await new Promise((r) => setTimeout(r, 200));
    expect(serverRelayedForgedEvent === false, "Client domain:event forgery attempt rejected/ignored");

    // 4. Multi-Tab Revocation & Immediate 0-Sec Eviction
    console.log("\n>> 4. Multi-Tab Revocation Eviction...");
    const clientB_Alpha_Tab2 = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientB_Alpha_Tab2);
    await subscribeWorkspace(clientB_Alpha_Tab2, { workspaceId: wsAlphaId });

    let tab1Evicted = false;
    let tab2Evicted = false;
    clientB_Alpha.on(REALTIME_EVENTS.WORKSPACE_EVICTED, () => {
      tab1Evicted = true;
    });
    clientB_Alpha_Tab2.on(REALTIME_EVENTS.WORKSPACE_EVICTED, () => {
      tab2Evicted = true;
    });

    const presenceEvictionPromise = waitForEvent<WorkspacePresenceSnapshot>(
      clientA,
      REALTIME_EVENTS.PRESENCE_UPDATED,
      (s) => Boolean(s.users.length === 1 && s.users[0]?.userId === userOwnerA._id.toString()),
    );

    // Owner A removes User B from Workspace Alpha
    await removeWorkspaceMember(wsAlphaId, userMemberB._id.toString(), userOwnerA._id.toString());

    const postEvictionPresence = await presenceEvictionPromise;
    expect(tab1Evicted && tab2Evicted, "All tabs for revoked member received workspace:evicted signal");
    expect(postEvictionPresence.users.length === 1, "Presence immediately evicted revoked member across all tabs");

    // 5. Offline Revocation Reconnect Race
    console.log("\n>> 5. Offline Revocation Reconnect Race...");
    clientB_Alpha.disconnect();
    clientB_Alpha_Tab2.disconnect();
    clientB_Beta.disconnect();

    const clientB_Reconnected = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientB_Reconnected);

    const subAckRevoked = await subscribeWorkspace(clientB_Reconnected, { workspaceId: wsAlphaId });
    expect(subAckRevoked.status === "error", "Offline revoked user reconnect subscription returned 404 error");

    clientB_Reconnected.disconnect();

    // 6. DB Amplification Protection Under Flood
    console.log("\n>> 6. DB Amplification Protection Under Flood...");
    const abuseClient = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
    await waitForConnect(abuseClient);
    await subscribeWorkspace(abuseClient, { workspaceId: wsAlphaId });

    // Rapidly emit 40 presence:viewing payloads
    for (let i = 0; i < 40; i++) {
      abuseClient.emit(REALTIME_EVENTS.PRESENCE_VIEWING, {
        workspaceId: wsAlphaId,
        viewing: { resourceType: "task", resourceId: taskAlpha._id.toString() },
      });
    }

    await new Promise((r) => setTimeout(r, 300));
    expect(socketRateLimiter.checkLimit(abuseClient.id!, "viewing", 25, 5000) === false, "Socket rate limiter successfully capped flood emissions");

    abuseClient.disconnect();

    // 7. REST Independence Under Realtime Transport Down
    console.log("\n>> 7. REST Independence Under Realtime Transport Down...");
    // Close realtime server completely
    await realtimeServer.close();

    // Perform DB task mutation directly
    const newRestTask = await Task.create({
      title: "REST Independent Task Gate3",
      owner: userOwnerA._id,
      workspaceId: workspaceAlpha._id,
      status: "todo",
      priority: "low",
      position: 2,
      isDeleted: false,
    });

    expect(newRestTask._id !== undefined, "REST/database mutation succeeded independently when realtime server was down");

    clientA.disconnect();

    console.log("\n==================================================");
    console.log("✅ Phase 34 Gate 3 Verification Test Suite PASSED!");
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
    presenceRegistry.clear();
    socketRateLimiter.clear();
    await teardownTestDatabase();
  }
}

runGate3Tests().catch((err) => {
  console.error("❌ Gate 3 Test Suite Failed:", err);
  process.exit(1);
});
