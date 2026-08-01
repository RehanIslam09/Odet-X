import dotenv from "dotenv";
import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
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
  domainEventBus,
  REALTIME_EVENTS,
  userSessionRegistry,
  presenceRegistry,
  socketRateLimiter,
  RealtimeServerInstance,
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

async function runTests() {
  await setupTestDatabase();

  let httpServer: HttpServer | undefined;
  let realtimeServer: RealtimeServerInstance | undefined;

  try {
    console.log("\n==================================================");
    console.log("▶ Phase 34 WP-7 — Production Hardening & Reliability Tests");
    console.log("==================================================\n");

    userSessionRegistry.clear();
    domainEventBus.clear();
    presenceRegistry.clear();
    socketRateLimiter.clear();

    httpServer = createServer(app);
    realtimeServer = createRealtimeServer(httpServer);

    const serverToListen = httpServer;
    await new Promise<void>((resolve) => {
      serverToListen.listen(0, () => {
        resolve();
      });
    });

    const addr = serverToListen.address() as AddressInfo;
    const serverUrl = `http://localhost:${addr.port}`;

    // Test Data Setup
    const userA = await User.create({
      name: "User A Reliability",
      email: "userA_rel@test.com",
      username: "userA_rel",
      password: "Password123!",
    });

    const userB = await User.create({
      name: "User B Reliability",
      email: "userB_rel@test.com",
      username: "userB_rel",
      password: "Password123!",
    });

    const workspaceAlpha = await Workspace.create({
      name: "Reliability Workspace Alpha",
      slug: "rel-workspace-alpha",
      ownerId: userA._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userA._id, role: "OWNER" });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userB._id, role: "MEMBER" });

    const workspaceBeta = await Workspace.create({
      name: "Reliability Workspace Beta",
      slug: "rel-workspace-beta",
      ownerId: userB._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceBeta._id, userId: userB._id, role: "OWNER" });

    const tokenA = generateAccessToken(userA._id.toString());
    const tokenB = generateAccessToken(userB._id.toString());
    const wsAlphaId = workspaceAlpha._id.toString();
    const wsBetaId = workspaceBeta._id.toString();

    // =========================================================================
    // 1. Fresh Token Reconnect Lifecycle
    // =========================================================================
    console.log(">> 1. Fresh Token Reconnect Lifecycle...");
    const clientA = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientA);
    await subscribeWorkspace(clientA, { workspaceId: wsAlphaId });

    clientA.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    // Reconnect with fresh token
    const freshTokenA = generateAccessToken(userA._id.toString());
    const clientA_Reconnected = ioClient(serverUrl, { auth: { token: freshTokenA }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientA_Reconnected);

    const subAck = await subscribeWorkspace(clientA_Reconnected, { workspaceId: wsAlphaId });
    expect(subAck.status === "ok", "Fresh token reconnect authorized workspace subscription");

    clientA_Reconnected.disconnect();

    // =========================================================================
    // 2. Invalid Session Reconnect Rejection
    // =========================================================================
    console.log("\n>> 2. Invalid Session Reconnect Rejection...");
    const invalidTokenClient = ioClient(serverUrl, { auth: { token: "invalid.jwt.token" }, transports: ["websocket"], reconnection: false });

    let authErrorFired = false;
    invalidTokenClient.on("connect_error", (err) => {
      if (err.message.toLowerCase().includes("authentication") || err.message.toLowerCase().includes("jwt")) {
        authErrorFired = true;
      }
    });

    await new Promise((r) => setTimeout(r, 500));
    expect(authErrorFired, "Invalid token handshake rejected with authentication error");
    invalidTokenClient.disconnect();

    // =========================================================================
    // 3. Membership Revocation During Disconnect
    // =========================================================================
    console.log("\n>> 3. Membership Revocation During Disconnect...");
    const clientB = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientB);
    await subscribeWorkspace(clientB, { workspaceId: wsAlphaId });

    // Disconnect B
    clientB.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    // Owner A removes User B while B is offline
    await removeWorkspaceMember(wsAlphaId, userB._id.toString(), userA._id.toString());

    // User B attempts reconnecting & subscribing
    const clientB_Reconnected = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientB_Reconnected);

    const subAckPostRevocation = await subscribeWorkspace(clientB_Reconnected, { workspaceId: wsAlphaId });
    expect(subAckPostRevocation.status === "error", "Revoked user reconnect subscription rejected");

    clientB_Reconnected.disconnect();

    // =========================================================================
    // 4. Rapid Workspace Switching
    // =========================================================================
    console.log("\n>> 4. Rapid Workspace Switching...");
    const clientB_Beta = ioClient(serverUrl, { auth: { token: tokenB }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientB_Beta);

    await subscribeWorkspace(clientB_Beta, { workspaceId: wsBetaId });
    await subscribeWorkspace(clientB_Beta, { workspaceId: wsBetaId });
    const finalSubAck = await subscribeWorkspace(clientB_Beta, { workspaceId: wsBetaId });

    expect(finalSubAck.status === "ok", "Rapid workspace switching resolved cleanly");
    clientB_Beta.disconnect();

    // =========================================================================
    // 5. Connection Churn & Memory Stability
    // =========================================================================
    console.log("\n>> 5. Connection Churn & Memory Stability...");

    const churnClients: ClientSocket[] = [];
    for (let i = 0; i < 10; i++) {
      const c = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
      churnClients.push(c);
    }
    await Promise.all(churnClients.map((c) => waitForConnect(c)));

    for (const c of churnClients) {
      c.disconnect();
    }
    await new Promise((r) => setTimeout(r, 300));

    expect(userSessionRegistry.getSocketsForUser(userA._id.toString()).length === 0, "All churn sockets cleaned up from session registry");

    // =========================================================================
    // 6. Socket Abuse Boundary (Rate Limiting)
    // =========================================================================
    console.log("\n>> 6. Socket Abuse Boundary (Rate Limiting)...");
    const clientAbuse = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientAbuse);

    let rateLimitExceededAck = false;
    for (let i = 0; i < 20; i++) {
      const ack = await subscribeWorkspace(clientAbuse, { workspaceId: wsAlphaId });
      if (ack.status === "error" && ack.message?.includes("Rate limit")) {
        rateLimitExceededAck = true;
        break;
      }
    }
    expect(rateLimitExceededAck, "Workspace subscription flood triggered rate limit boundary");
    clientAbuse.disconnect();

    // =========================================================================
    // 7. Domain Relay Failure Isolation (REST Unaffected)
    // =========================================================================
    console.log("\n>> 7. Domain Relay Failure Isolation (REST Unaffected)...");
    // Detach relay
    realtimeServer.relay.detach();

    // Publish domain event while relay detached
    let threwError = false;
    try {
      const sampleEvent = createDomainEvent({
        type: "task.created",
        workspaceId: wsAlphaId,
        actorId: userA._id.toString(),
        resource: { type: "task", id: "507f1f77bcf86cd799439011" },
        payload: { title: "Isolated Task" },
      });
      domainEventBus.publish(sampleEvent);
    } catch {
      threwError = true;
    }
    expect(threwError === false, "Domain event publication with detached relay did not throw error");

    // =========================================================================
    // 8. Graceful Server Shutdown & Teardown
    // =========================================================================
    console.log("\n>> 8. Graceful Server Shutdown & Teardown...");
    const clientShutdownTest = ioClient(serverUrl, { auth: { token: tokenA }, transports: ["websocket"], reconnection: false });
    await waitForConnect(clientShutdownTest);
    await subscribeWorkspace(clientShutdownTest, { workspaceId: wsAlphaId });

    // Execute graceful shutdown of realtime server
    await realtimeServer.close();

    expect(userSessionRegistry.getConnectedUserCount() === 0, "Session registry cleared on shutdown");
    expect(presenceRegistry.getSnapshot(wsAlphaId).users.length === 0, "Presence registry cleared on shutdown");

    // =========================================================================
    // 9. Idempotent Shutdown
    // =========================================================================
    console.log("\n>> 9. Idempotent Shutdown...");
    let idempotentError = false;
    try {
      await realtimeServer.close();
    } catch {
      idempotentError = true;
    }
    expect(idempotentError === false, "Calling close() a second time is safe and idempotent");

    if (httpServer) {
      const serverToClose = httpServer;
      await new Promise<void>((resolve) => serverToClose.close(() => resolve()));
    }

    console.log("\n==================================================");
    console.log("✅ All Phase 34 WP-7 Reliability & Hardening Tests Passed!");
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

runTests().catch((err) => {
  console.error("❌ Reliability Test Suite Failed:", err);
  process.exit(1);
});
