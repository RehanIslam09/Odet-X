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
  WorkspacePresenceSnapshot,
  PresenceUser,
  RealtimeServerInstance,
} from "../realtime/index.js";
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

function waitForPresenceEvent(
  socket: ClientSocket,
  eventName: string,
  filterFn?: (snapshot: WorkspacePresenceSnapshot) => boolean,
  timeoutMs = 5000,
): Promise<WorkspacePresenceSnapshot> {
  return new Promise((resolve, reject) => {
    const handler = (snapshot: WorkspacePresenceSnapshot) => {
      if (!filterFn || filterFn(snapshot)) {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(snapshot);
      }
    };
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Presence event ${eventName} timeout`));
    }, timeoutMs);
    socket.on(eventName, handler);
  });
}

async function runTests() {
  await setupTestDatabase();

  let httpServer: HttpServer | undefined;
  let realtimeServer: RealtimeServerInstance | undefined;
  let serverPort = 0;

  try {
    console.log("\n==================================================");
    console.log("▶ Phase 34 WP-6 — Ephemeral Presence & Resource Awareness Tests");
    console.log("==================================================\n");

    userSessionRegistry.clear();
    domainEventBus.clear();
    presenceRegistry.clear();

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

    // Setup Test Data
    const userOwnerA = await User.create({
      name: "Owner User A",
      email: "ownerA@presence.com",
      username: "ownerA_pres",
      password: "password123!",
    });

    const userMemberB = await User.create({
      name: "Member User B",
      email: "memberB@presence.com",
      username: "memberB_pres",
      password: "password123!",
    });

    const workspaceAlpha = await Workspace.create({
      name: "Presence Workspace Alpha",
      slug: "presence-workspace-alpha",
      ownerId: userOwnerA._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userOwnerA._id, role: "OWNER" });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userMemberB._id, role: "MEMBER" });

    const workspaceBeta = await Workspace.create({
      name: "Presence Workspace Beta",
      slug: "presence-workspace-beta",
      ownerId: userMemberB._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceBeta._id, userId: userMemberB._id, role: "OWNER" });

    const projectAlpha = await Project.create({
      name: "Alpha Project",
      description: "Project in Alpha",
      owner: userOwnerA._id,
      workspaceId: workspaceAlpha._id,
      isDeleted: false,
    });

    const taskAlpha = await Task.create({
      title: "Alpha Task",
      owner: userOwnerA._id,
      workspaceId: workspaceAlpha._id,
      projectId: projectAlpha._id,
      status: "todo",
      priority: "medium",
      position: 1,
      isDeleted: false,
    });

    const projectBeta = await Project.create({
      name: "Beta Project",
      description: "Project in Beta",
      owner: userMemberB._id,
      workspaceId: workspaceBeta._id,
      isDeleted: false,
    });

    const tokenA = generateAccessToken(userOwnerA._id.toString());
    const tokenB = generateAccessToken(userMemberB._id.toString());

    const wsAlphaId = workspaceAlpha._id.toString();

    // =========================================================================
    // 1. Authorized Subscription Creates Presence & Sends Snapshot
    // =========================================================================
    console.log(">> 1. Authorized Subscription Creates Presence & Sends Snapshot...");
    const clientA = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientA);

    const snapshotPromiseA = waitForPresenceEvent(clientA, REALTIME_EVENTS.PRESENCE_SNAPSHOT);
    await subscribeWorkspace(clientA, { workspaceId: wsAlphaId });

    const snapshotA = await snapshotPromiseA;
    expect(snapshotA.workspaceId === wsAlphaId, "Snapshot workspaceId matches");
    expect(snapshotA.users.length === 1, "Snapshot contains 1 present user");
    expect(Boolean(snapshotA.users[0] && snapshotA.users[0].userId === userOwnerA._id.toString()), "Present user is User A");

    // =========================================================================
    // 2. Unauthorized Subscription Discloses ZERO Presence Metadata
    // =========================================================================
    console.log("\n>> 2. Unauthorized Subscription Discloses ZERO Presence Metadata...");
    // Test a non-member user C
    const userNonMemberC = await User.create({
      name: "Non Member C",
      email: "nonmemberC@presence.com",
      username: "nonmemberC",
      password: "password123!",
    });
    const tokenC = generateAccessToken(userNonMemberC._id.toString());
    const clientC = ioClient(serverUrl, { auth: { token: tokenC }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientC);

    let clientC_ReceivedSnapshot = false;
    clientC.on(REALTIME_EVENTS.PRESENCE_SNAPSHOT, () => {
      clientC_ReceivedSnapshot = true;
    });

    const subAckC = await subscribeWorkspace(clientC, { workspaceId: wsAlphaId });
    expect(subAckC.status === "error", "Unauthorized subscription rejected with error");
    expect(clientC_ReceivedSnapshot === false, "Unauthorized client received ZERO presence snapshot metadata");

    clientC.disconnect();

    // =========================================================================
    // 3. User B Joins -> Snapshot & Broadcast Updates
    // =========================================================================
    console.log("\n>> 3. User B Joins -> Snapshot & Broadcast Updates...");
    const clientB = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientB);

    const updatePromiseA = waitForPresenceEvent(clientA, REALTIME_EVENTS.PRESENCE_UPDATED);
    const snapshotPromiseB = waitForPresenceEvent(clientB, REALTIME_EVENTS.PRESENCE_SNAPSHOT);

    await subscribeWorkspace(clientB, { workspaceId: wsAlphaId });

    const [snapshotB, updateA] = await Promise.all([snapshotPromiseB, updatePromiseA]);
    expect(snapshotB.users.length === 2, "User B snapshot contains 2 users");
    expect(updateA.users.length === 2, "User A received presence update with 2 users");

    // =========================================================================
    // 4. Valid Resource Viewing Awareness
    // =========================================================================
    console.log("\n>> 4. Valid Resource Viewing Awareness...");
    const viewingUpdateA = waitForPresenceEvent(clientA, REALTIME_EVENTS.PRESENCE_UPDATED, (s) =>
      s.users.some((u) => u.userId === userMemberB._id.toString() && u.viewing !== null),
    );

    // User B emits viewing state for taskAlpha in Workspace Alpha
    clientB.emit(REALTIME_EVENTS.PRESENCE_VIEWING, {
      workspaceId: wsAlphaId,
      viewing: {
        resourceType: "task",
        resourceId: taskAlpha._id.toString(),
      },
    });

    const updatedSnapshotA = await viewingUpdateA;
    const userB_State = updatedSnapshotA.users.find((u) => u.userId === userMemberB._id.toString());
    expect(userB_State !== undefined && userB_State.viewing?.resourceId === taskAlpha._id.toString(), "User A received User B's task viewing awareness");

    // =========================================================================
    // 5. Cross-Workspace Resource Awareness Attack Prevention
    // =========================================================================
    console.log("\n>> 5. Cross-Workspace Resource Awareness Attack Prevention...");
    let userA_ReceivedCrossWorkspaceViewing = false;
    const crossWorkspaceHandler = (s: WorkspacePresenceSnapshot) => {
      const bState = s.users.find((u: PresenceUser) => u.userId === userMemberB._id.toString());
      if (bState?.viewing?.resourceId === projectBeta._id.toString()) {
        userA_ReceivedCrossWorkspaceViewing = true;
      }
    };
    clientA.on(REALTIME_EVENTS.PRESENCE_UPDATED, crossWorkspaceHandler);

    // User B attempts to claim viewing projectBeta (which belongs to Beta, not Alpha)
    clientB.emit(REALTIME_EVENTS.PRESENCE_VIEWING, {
      workspaceId: wsAlphaId,
      viewing: {
        resourceType: "project",
        resourceId: projectBeta._id.toString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    clientA.off(REALTIME_EVENTS.PRESENCE_UPDATED, crossWorkspaceHandler);
    expect(userA_ReceivedCrossWorkspaceViewing === false, "Cross-workspace resource viewing payload rejected and not broadcast");

    // =========================================================================
    // 6. Viewing State Clear
    // =========================================================================
    console.log("\n>> 6. Viewing State Clear...");
    const clearViewingUpdateA = waitForPresenceEvent(clientA, REALTIME_EVENTS.PRESENCE_UPDATED, (s) =>
      s.users.every((u) => u.viewing === null),
    );

    clientB.emit(REALTIME_EVENTS.PRESENCE_VIEWING, {
      workspaceId: wsAlphaId,
      viewing: null,
    });

    const clearedSnapshot = await clearViewingUpdateA;
    expect(clearedSnapshot.users.every((u) => u.viewing === null), "User B viewing state successfully cleared");

    // =========================================================================
    // 7. Multi-Tab Support & Partial Disconnect
    // =========================================================================
    console.log("\n>> 7. Multi-Tab Support & Partial Disconnect...");
    const clientB_Tab2 = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientB_Tab2);
    await subscribeWorkspace(clientB_Tab2, { workspaceId: wsAlphaId });

    // Collapsed user presence in registry should show 2 unique users (User A, User B)
    const collapsedSnapshot = presenceRegistry.getSnapshot(wsAlphaId);
    expect(collapsedSnapshot.users.length === 2, "Multi-tab User B collapsed to single user presence item");

    // Disconnect Tab 1 for User B
    clientB.disconnect();

    await new Promise((resolve) => setTimeout(resolve, 300));
    const postTab1Snapshot = presenceRegistry.getSnapshot(wsAlphaId);
    expect(postTab1Snapshot.users.some((u) => u.userId === userMemberB._id.toString()), "User B remains online because Tab 2 is active");

    clientB_Tab2.disconnect();

    // =========================================================================
    // 8. Explicit Workspace Unsubscribe (Immediate 0-sec Removal)
    // =========================================================================
    console.log("\n>> 8. Explicit Workspace Unsubscribe (Immediate Removal)...");
    const clientB_Fresh = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientB_Fresh);
    await subscribeWorkspace(clientB_Fresh, { workspaceId: wsAlphaId });

    const unsubUpdateA = waitForPresenceEvent(clientA, REALTIME_EVENTS.PRESENCE_UPDATED, (s) =>
      Boolean(s.users.length === 1 && s.users[0]?.userId === userOwnerA._id.toString()),
    );

    await unsubscribeWorkspace(clientB_Fresh, { workspaceId: wsAlphaId });

    const postUnsubSnapshot = await unsubUpdateA;
    expect(postUnsubSnapshot.users.length === 1, "Explicit unsubscribe immediately removed User B from presence");

    // =========================================================================
    // 9. Membership Revocation Eviction (Immediate 0-sec Removal)
    // =========================================================================
    console.log("\n>> 9. Membership Revocation Eviction (Immediate Removal)...");
    // Re-subscribe User B
    await subscribeWorkspace(clientB_Fresh, { workspaceId: wsAlphaId });

    const evictionUpdateA = waitForPresenceEvent(clientA, REALTIME_EVENTS.PRESENCE_UPDATED, (s) =>
      Boolean(s.users.length === 1 && s.users[0]?.userId === userOwnerA._id.toString()),
    );

    // Owner A removes User B from Workspace Alpha
    await removeWorkspaceMember(wsAlphaId, userMemberB._id.toString(), userOwnerA._id.toString());

    const postEvictionSnapshot = await evictionUpdateA;
    expect(postEvictionSnapshot.users.length === 1, "Membership revocation immediately evicted User B from presence (0-sec grace)");

    clientA.disconnect();
    clientB_Fresh.disconnect();

    console.log("\n==================================================");
    console.log("✅ All Phase 34 WP-6 Server Presence Tests Passed!");
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
    await teardownTestDatabase();
  }
}

runTests().catch((err) => {
  console.error("❌ Ephemeral Presence Test Suite Failed:", err);
  process.exit(1);
});
