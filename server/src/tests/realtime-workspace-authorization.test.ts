import dotenv from "dotenv";
import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { Types } from "mongoose";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

dotenv.config();

import app from "../app.js";
import User from "../models/user.model.js";
import Workspace from "../models/workspace.model.js";
import WorkspaceMember from "../models/workspace-member.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import {
  createRealtimeServer,
  getWorkspaceRoom,
  REALTIME_EVENTS,
  userSessionRegistry,
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

function waitForEviction(socket: ClientSocket): Promise<{ workspaceId: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Eviction event timeout")), 4000);
    socket.on(REALTIME_EVENTS.WORKSPACE_EVICTED, (data: { workspaceId: string }) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function runTests() {
  await setupTestDatabase();

  let httpServer: HttpServer | undefined;
  let realtimeServer: RealtimeServerInstance | undefined;
  let serverPort = 0;

  try {
    console.log("\n==================================================");
    console.log("▶ Phase 34 WP-2 — Workspace Connection Authorization & Room Tests");
    console.log("==================================================\n");

    userSessionRegistry.clear();

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

    // -------------------------------------------------------------------------
    // Setup Test Data: Users and Workspaces
    // -------------------------------------------------------------------------
    const userOwnerA = await User.create({
      name: "Owner User A",
      email: "ownerA@ws-test.com",
      username: "ownerA_ws",
      password: "password123!",
    });

    const userMemberB = await User.create({
      name: "Member User B",
      email: "memberB@ws-test.com",
      username: "memberB_ws",
      password: "password123!",
    });

    const userOutsideC = await User.create({
      name: "Outside User C",
      email: "outsideC@ws-test.com",
      username: "outsideC_ws",
      password: "password123!",
    });

    // Workspace Alpha (Owner A, Member B)
    const workspaceAlpha = await Workspace.create({
      name: "Workspace Alpha",
      slug: "workspace-alpha",
      ownerId: userOwnerA._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({
      workspaceId: workspaceAlpha._id,
      userId: userOwnerA._id,
      role: "OWNER",
    });
    await WorkspaceMember.create({
      workspaceId: workspaceAlpha._id,
      userId: userMemberB._id,
      role: "MEMBER",
    });

    // Workspace Beta (Owner B)
    const workspaceBeta = await Workspace.create({
      name: "Workspace Beta",
      slug: "workspace-beta",
      ownerId: userMemberB._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({
      workspaceId: workspaceBeta._id,
      userId: userMemberB._id,
      role: "OWNER",
    });

    const tokenA = generateAccessToken(userOwnerA._id.toString());
    const tokenB = generateAccessToken(userMemberB._id.toString());
    const tokenC = generateAccessToken(userOutsideC._id.toString());

    const wsAlphaId = workspaceAlpha._id.toString();
    const wsBetaId = workspaceBeta._id.toString();
    const roomAlpha = getWorkspaceRoom(wsAlphaId);
    const roomBeta = getWorkspaceRoom(wsBetaId);

    // =========================================================================
    // 1. Authorized Workspace Subscription
    // =========================================================================
    console.log(">> 1. Authorized Member Workspace Subscription...");
    const clientA1 = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientA1);

    const subResultA = await subscribeWorkspace(clientA1, { workspaceId: wsAlphaId });
    expect(subResultA.status === "ok", "Subscription ACK status is 'ok'");
    expect(subResultA.workspaceId === wsAlphaId, "Subscription ACK returns workspaceId");

    const serverSocketA1 = userSessionRegistry.getSocketsForUser(userOwnerA._id.toString())[0];
    expect(Boolean(serverSocketA1 && serverSocketA1.rooms.has(roomAlpha)), "Server socket joined workspace room 'workspace:Alpha'");

    // =========================================================================
    // 2. Non-Member Subscription Rejection
    // =========================================================================
    console.log("\n>> 2. Non-Member Subscription Rejection...");
    const clientC1 = ioClient(serverUrl, { auth: { token: tokenC }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientC1);

    const subResultC = await subscribeWorkspace(clientC1, { workspaceId: wsAlphaId });
    expect(subResultC.status === "error", "Non-member subscription ACK status is 'error'");
    expect(subResultC.message === "Workspace not found.", "Anti-enumeration error message returned");

    const serverSocketC1 = userSessionRegistry.getSocketsForUser(userOutsideC._id.toString())[0];
    expect(Boolean(serverSocketC1 && !serverSocketC1.rooms.has(roomAlpha)), "Server socket NOT joined to workspace:Alpha room");

    // =========================================================================
    // 3. Cross-Tenant Isolation
    // =========================================================================
    console.log("\n>> 3. Cross-Tenant Isolation Check...");
    // User A attempts to join Workspace Beta (only User B is member)
    const crossSubResult = await subscribeWorkspace(clientA1, { workspaceId: wsBetaId });
    expect(crossSubResult.status === "error", "User A cannot subscribe to User B's workspace");
    expect(crossSubResult.message === "Workspace not found.", "Cross-tenant attempt returns 404 anti-enumeration");
    expect(Boolean(serverSocketA1 && !serverSocketA1.rooms.has(roomBeta)), "User A socket NOT in workspace:Beta room");

    // =========================================================================
    // 4. Non-Existent Workspace Anti-Enumeration
    // =========================================================================
    console.log("\n>> 4. Non-Existent Workspace Anti-Enumeration...");
    const randomObjectId = new Types.ObjectId().toString();
    const nonExistentResult = await subscribeWorkspace(clientA1, { workspaceId: randomObjectId });
    expect(nonExistentResult.status === "error", "Non-existent workspace subscription yields error");
    expect(nonExistentResult.message === subResultC.message, "Failure message for non-existent workspace matches non-member error exactly");

    // =========================================================================
    // 5. Malformed Workspace ID Validation
    // =========================================================================
    console.log("\n>> 5. Malformed Payload Validation...");
    const malformed1 = await subscribeWorkspace(clientA1, { workspaceId: "" });
    const malformed2 = await subscribeWorkspace(clientA1, { workspaceId: "not-an-object-id" });
    const malformed3 = await subscribeWorkspace(clientA1, {});
    const malformed4 = await subscribeWorkspace(clientA1, null);

    expect(malformed1.status === "error", "Empty string workspaceId rejected");
    expect(malformed2.status === "error", "Invalid string format workspaceId rejected");
    expect(malformed3.status === "error", "Missing workspaceId rejected");
    expect(malformed4.status === "error", "Null payload rejected");

    // =========================================================================
    // 6. Identity & Role Spoofing Protection
    // =========================================================================
    console.log("\n>> 6. Identity & Role Spoofing Protection...");
    const spoofResult = await subscribeWorkspace(clientC1, {
      workspaceId: wsAlphaId,
      userId: userOwnerA._id.toString(),
      role: "OWNER",
    });
    expect(spoofResult.status === "error", "Client spoofing payload cannot bypass authorization");
    expect(Boolean(serverSocketC1 && !serverSocketC1.rooms.has(roomAlpha)), "Spoofing socket is NOT joined to workspace:Alpha");

    // =========================================================================
    // 7. Idempotent Subscription
    // =========================================================================
    console.log("\n>> 7. Idempotent Subscription...");
    const repeatResult = await subscribeWorkspace(clientA1, { workspaceId: wsAlphaId });
    expect(repeatResult.status === "ok", "Repeat subscription returns status 'ok'");
    expect(Boolean(serverSocketA1 && serverSocketA1.rooms.has(roomAlpha)), "Socket remains in room cleanly");

    // =========================================================================
    // 8. Voluntary Unsubscribe
    // =========================================================================
    console.log("\n>> 8. Voluntary Unsubscribe...");
    const unsubResult = await unsubscribeWorkspace(clientA1, { workspaceId: wsAlphaId });
    expect(unsubResult.status === "ok", "Unsubscription ACK status is 'ok'");
    expect(Boolean(serverSocketA1 && !serverSocketA1.rooms.has(roomAlpha)), "Server socket left workspace:Alpha room");

    // =========================================================================
    // 9. Independent Tab Unsubscription
    // =========================================================================
    console.log("\n>> 9. Independent Tab Unsubscription...");
    const clientB_Tab1 = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    const clientB_Tab2 = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await Promise.all([waitForConnect(clientB_Tab1), waitForConnect(clientB_Tab2)]);

    await subscribeWorkspace(clientB_Tab1, { workspaceId: wsAlphaId });
    await subscribeWorkspace(clientB_Tab2, { workspaceId: wsAlphaId });

    const bSockets = userSessionRegistry.getSocketsForUser(userMemberB._id.toString());
    const socketB1 = bSockets.find((s) => s.id === clientB_Tab1.id);
    const socketB2 = bSockets.find((s) => s.id === clientB_Tab2.id);

    expect(Boolean(socketB1 && socketB1.rooms.has(roomAlpha)), "Tab 1 in workspace:Alpha room");
    expect(Boolean(socketB2 && socketB2.rooms.has(roomAlpha)), "Tab 2 in workspace:Alpha room");

    await unsubscribeWorkspace(clientB_Tab1, { workspaceId: wsAlphaId });
    expect(Boolean(socketB1 && !socketB1.rooms.has(roomAlpha)), "Tab 1 left workspace:Alpha room");
    expect(Boolean(socketB2 && socketB2.rooms.has(roomAlpha)), "Tab 2 remains in workspace:Alpha room");

    // =========================================================================
    // 10. Authoritative Membership Revocation & Eviction
    // =========================================================================
    console.log("\n>> 10. Authoritative Membership Revocation & Eviction...");
    // Ensure Tab 1 re-subscribes
    await subscribeWorkspace(clientB_Tab1, { workspaceId: wsAlphaId });
    expect(Boolean(socketB1 && socketB1.rooms.has(roomAlpha)), "Tab 1 re-subscribed to Alpha");

    const evictionPromiseTab1 = waitForEviction(clientB_Tab1);
    const evictionPromiseTab2 = waitForEviction(clientB_Tab2);

    // Execute authoritative domain service call to remove User B from Workspace Alpha
    await removeWorkspaceMember(wsAlphaId, userMemberB._id.toString(), userOwnerA._id.toString());

    // Verify DB record is deleted
    const memberDoc = await WorkspaceMember.findOne({
      workspaceId: workspaceAlpha._id,
      userId: userMemberB._id,
    });
    expect(memberDoc === null, "WorkspaceMember document deleted in MongoDB");

    // Verify real-time eviction events emitted to both User B tabs
    const evictionData1 = await evictionPromiseTab1;
    const evictionData2 = await evictionPromiseTab2;

    expect(evictionData1.workspaceId === wsAlphaId, "Tab 1 received workspace:evicted signal");
    expect(evictionData2.workspaceId === wsAlphaId, "Tab 2 received workspace:evicted signal");

    expect(Boolean(socketB1 && !socketB1.rooms.has(roomAlpha)), "Socket Tab 1 evicted from workspace:Alpha room");
    expect(Boolean(socketB2 && !socketB2.rooms.has(roomAlpha)), "Socket Tab 2 evicted from workspace:Alpha room");

    // =========================================================================
    // 11. Re-Subscription After Revocation Failure
    // =========================================================================
    console.log("\n>> 11. Re-Subscription Attempt After Revocation...");
    const postEvictSub = await subscribeWorkspace(clientB_Tab1, { workspaceId: wsAlphaId });
    expect(postEvictSub.status === "error", "Evicted user re-subscription is rejected");
    expect(postEvictSub.message === "Workspace not found.", "Evicted user receives 404 anti-enumeration");
    expect(Boolean(socketB1 && !socketB1.rooms.has(roomAlpha)), "Socket remains outside workspace:Alpha room");

    // =========================================================================
    // 12. Multiple Workspace Membership Revocation Isolation
    // =========================================================================
    console.log("\n>> 12. Multiple Workspace Membership Revocation Isolation...");
    // User B is also OWNER of Workspace Beta. Subscribe to Beta.
    const subBetaResult = await subscribeWorkspace(clientB_Tab1, { workspaceId: wsBetaId });
    expect(subBetaResult.status === "ok", "User B subscribes to Workspace Beta");
    expect(Boolean(socketB1 && socketB1.rooms.has(roomBeta)), "User B socket in workspace:Beta room");

    // Eviction from Alpha did NOT remove socket from Beta room!
    expect(Boolean(socketB1 && !socketB1.rooms.has(roomAlpha)), "User B remains evicted from Alpha");

    // =========================================================================
    // 13. Security Broadcast Probe (Cross-Tenant Non-Delivery)
    // =========================================================================
    console.log("\n>> 13. Security Broadcast Probe (Cross-Tenant Non-Delivery)...");
    await subscribeWorkspace(clientA1, { workspaceId: wsAlphaId });
    expect(Boolean(serverSocketA1 && serverSocketA1.rooms.has(roomAlpha)), "Owner A in workspace:Alpha room");

    let receivedByA: boolean = false;
    let receivedByB: boolean = false;

    clientA1.on("probe_message", () => {
      receivedByA = true;
    });
    clientB_Tab1.on("probe_message", () => {
      receivedByB = true;
    });

    // Server emits message to workspace:Alpha room only
    realtimeServer.io.to(roomAlpha).emit("probe_message", { data: "secret_alpha_content" });

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(Boolean(receivedByA) === true, "Authorized User A in workspace:Alpha received room broadcast");
    expect(Boolean(receivedByB) === false, "Evicted User B in workspace:Beta received ZERO room broadcasts from Alpha");

    // Clean up client sockets
    clientA1.disconnect();
    clientC1.disconnect();
    clientB_Tab1.disconnect();
    clientB_Tab2.disconnect();

    console.log("\n==================================================");
    console.log("✅ All Phase 34 WP-2 Real-Time Workspace Authorization Tests Passed!");
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
    await teardownTestDatabase();
  }
}

runTests().catch((err) => {
  console.error("❌ Real-Time Workspace Authorization Test Suite Failed:", err);
  process.exit(1);
});
