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
  createDomainEvent,
  createRealtimeServer,
  domainEventBus,
  domainEventEnvelopeSchema,
  REALTIME_EVENTS,
  RealtimeEventEnvelope,
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

function waitForDomainEvent(
  socket: ClientSocket,
  timeoutMs = 3000,
): Promise<RealtimeEventEnvelope> {
  return new Promise((resolve, reject) => {
    const handler = (event: RealtimeEventEnvelope) => {
      clearTimeout(timer);
      socket.off(REALTIME_EVENTS.DOMAIN_EVENT, handler);
      resolve(event);
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
  let serverPort = 0;
  let ioServer: RealtimeServerInstance | undefined;

  try {
    console.log("\n==================================================");
    console.log("▶ Phase 34 WP-3 & Gate 2 — Typed Domain Event Bus & Isolation Tests");
    console.log("==================================================\n");

    userSessionRegistry.clear();
    domainEventBus.clear();

    httpServer = createServer(app);
    ioServer = createRealtimeServer(httpServer);

    const serverToListen = httpServer;
    await new Promise<void>((resolve) => {
      serverToListen.listen(0, () => {
        const addr = serverToListen.address() as AddressInfo;
        serverPort = addr.port;
        resolve();
      });
    });

    const serverUrl = `http://localhost:${serverPort}`;
    const mockWsId = new Types.ObjectId().toString();
    const mockUserId = new Types.ObjectId().toString();
    const mockTaskId = new Types.ObjectId().toString();

    // =========================================================================
    // 1. Domain Event Factory & Envelope Integrity
    // =========================================================================
    console.log(">> 1. Domain Event Factory & Envelope Integrity...");
    const event1 = createDomainEvent({
      type: "task.created",
      workspaceId: mockWsId,
      actorId: mockUserId,
      resource: { type: "task", id: mockTaskId, version: 1 },
      payload: { title: "Test Task" },
    });

    expect(typeof event1.id === "string" && event1.id.length > 0, "Event UUID assigned");
    expect(event1.protocolVersion === 1, "protocolVersion is 1");
    expect(event1.type === "task.created", "Event type assigned");
    expect(event1.workspaceId === mockWsId, "workspaceId matches");
    expect(event1.actorId === mockUserId, "actorId matches");
    expect(!isNaN(Date.parse(event1.occurredAt)), "occurredAt is valid ISO timestamp");
    expect(event1.resource.type === "task" && event1.resource.id === mockTaskId, "Resource ref accurate");

    // =========================================================================
    // 2. Unique Event IDs
    // =========================================================================
    console.log("\n>> 2. Unique Event ID Generation...");
    const event2 = createDomainEvent({
      type: "task.updated",
      workspaceId: mockWsId,
      resource: { type: "task", id: mockTaskId },
      payload: { title: "Updated Task" },
    });
    expect(event1.id !== event2.id, "Consecutive events generate unique IDs");

    // =========================================================================
    // 3. Runtime Zod Schema Validation
    // =========================================================================
    console.log("\n>> 3. Runtime Zod Schema Validation...");
    const validParse = domainEventEnvelopeSchema.safeParse(event1);
    expect(validParse.success === true, "Valid domain event passes Zod schema validation");

    const malformed1 = domainEventEnvelopeSchema.safeParse({ ...event1, workspaceId: "invalid-id" });
    const malformed2 = domainEventEnvelopeSchema.safeParse({ ...event1, protocolVersion: 2 });
    const malformed3 = domainEventEnvelopeSchema.safeParse({ ...event1, type: "UNKNOWN_TYPE" });

    expect(malformed1.success === false, "Invalid workspaceId rejected by Zod schema");
    expect(malformed2.success === false, "Unsupported protocolVersion rejected by Zod schema");
    expect(malformed3.success === false, "Unsupported event type rejected by Zod schema");

    // =========================================================================
    // 4. Publisher / Subscriber Architecture
    // =========================================================================
    console.log("\n>> 4. Publisher / Subscriber Architecture...");
    let receivedEvent: RealtimeEventEnvelope | null = null;
    const unsub = domainEventBus.subscribe("task.created", (evt) => {
      receivedEvent = evt;
    });

    await domainEventBus.publish(event1);
    expect(Boolean(receivedEvent && (receivedEvent as RealtimeEventEnvelope).id === event1.id), "Subscriber received published event");

    // Test Unsubscribe
    unsub();
    receivedEvent = null;
    await domainEventBus.publish(event1);
    expect(receivedEvent === null, "Unsubscribed handler receives ZERO events");

    // =========================================================================
    // 5. Subscriber Failure Isolation
    // =========================================================================
    console.log("\n>> 5. Subscriber Failure Isolation...");
    let subscriberB_Called: boolean = false;

    // Failing subscriber A
    domainEventBus.subscribe("task.updated", () => {
      throw new Error("Simulated Subscriber Crash");
    });

    // Healthy subscriber B
    domainEventBus.subscribe("task.updated", () => {
      subscriberB_Called = true;
    });

    await domainEventBus.publish(event2);
    expect(Boolean(subscriberB_Called) === true, "Subscriber B received event despite Subscriber A failure");

    // Clean test bus handlers
    domainEventBus.clear();

    // Re-attach RealtimeEventRelay since clear() removed listeners
    ioServer.relay.attach();

    // =========================================================================
    // Setup End-to-End Realtime Transport Test Data
    // =========================================================================
    const userOwnerA = await User.create({
      name: "Owner User A",
      email: "ownerA@relay-test.com",
      username: "ownerA_relay",
      password: "password123!",
    });

    const userMemberB = await User.create({
      name: "Member User B",
      email: "memberB@relay-test.com",
      username: "memberB_relay",
      password: "password123!",
    });

    const workspaceAlpha = await Workspace.create({
      name: "Relay Workspace Alpha",
      slug: "relay-workspace-alpha",
      ownerId: userOwnerA._id,
      isPersonal: false,
    });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userOwnerA._id, role: "OWNER" });
    await WorkspaceMember.create({ workspaceId: workspaceAlpha._id, userId: userMemberB._id, role: "MEMBER" });

    const workspaceBeta = await Workspace.create({
      name: "Relay Workspace Beta",
      slug: "relay-workspace-beta",
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
    // 6. RealtimeEventRelay & Tenant Isolation (Workspace A -> Socket A)
    // =========================================================================
    console.log("\n>> 6. RealtimeEventRelay & Tenant-Isolated Fanout...");
    const alphaDomainEvent = createDomainEvent({
      type: "task.created",
      workspaceId: wsAlphaId,
      actorId: userOwnerA._id.toString(),
      resource: { type: "task", id: new Types.ObjectId().toString(), version: 1 },
      payload: { title: "Alpha Task 1" },
    });

    const eventPromiseA = waitForDomainEvent(clientA);
    let clientB_ReceivedAlphaEvent: boolean = false;
    clientB.on(REALTIME_EVENTS.DOMAIN_EVENT, () => {
      clientB_ReceivedAlphaEvent = true;
    });

    await domainEventBus.publish(alphaDomainEvent);

    const receivedAlphaEvent = await eventPromiseA;
    expect(receivedAlphaEvent.id === alphaDomainEvent.id, "User A received Workspace Alpha domain event");

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(Boolean(clientB_ReceivedAlphaEvent) === false, "User B in Workspace Beta received ZERO events from Workspace Alpha");

    // =========================================================================
    // 7. Evicted Member Receives ZERO Domain Events
    // =========================================================================
    console.log("\n>> 7. Evicted Member Domain Event Isolation...");
    // Connect User B to Workspace Alpha
    await subscribeWorkspace(clientB, { workspaceId: wsAlphaId });

    // Authoritative DB removal of User B from Workspace Alpha
    await removeWorkspaceMember(wsAlphaId, userMemberB._id.toString(), userOwnerA._id.toString());

    let postEvictionEventReceived: boolean = false;
    clientB.on(REALTIME_EVENTS.DOMAIN_EVENT, (evt: RealtimeEventEnvelope) => {
      if (evt.workspaceId === wsAlphaId) {
        postEvictionEventReceived = true;
      }
    });

    const postEvictEvent = createDomainEvent({
      type: "task.updated",
      workspaceId: wsAlphaId,
      actorId: userOwnerA._id.toString(),
      resource: { type: "task", id: new Types.ObjectId().toString(), version: 2 },
      payload: { title: "Alpha Task 1 Updated" },
    });

    await domainEventBus.publish(postEvictEvent);
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(Boolean(postEvictionEventReceived) === false, "Evicted User B received ZERO post-eviction domain events from Workspace Alpha");

    // =========================================================================
    // 8. User B Workspace Beta Subscription Intact
    // =========================================================================
    console.log("\n>> 8. Unaffected Workspace Subscription Intact...");
    const betaDomainEvent = createDomainEvent({
      type: "project.created",
      workspaceId: wsBetaId,
      actorId: userMemberB._id.toString(),
      resource: { type: "project", id: new Types.ObjectId().toString(), version: 1 },
      payload: { name: "Beta Project 1" },
    });

    const eventPromiseB = waitForDomainEvent(clientB);
    await domainEventBus.publish(betaDomainEvent);

    const receivedBetaEvent = await eventPromiseB;
    expect(receivedBetaEvent.id === betaDomainEvent.id, "User B received Workspace Beta domain event after Alpha eviction");

    // =========================================================================
    // 9. Client Forgery Prevention (CLIENT -> SERVER domain:event ignored)
    // =========================================================================
    console.log("\n>> 9. Client Event Forgery Protection...");
    let clientA_ReceivedForgedEvent: boolean = false;
    clientA.on(REALTIME_EVENTS.DOMAIN_EVENT, (evt: RealtimeEventEnvelope) => {
      if (evt.id === "forged-event-id") {
        clientA_ReceivedForgedEvent = true;
      }
    });

    // Client B attempts to emit a forged domain:event to server
    clientB.emit(REALTIME_EVENTS.DOMAIN_EVENT, {
      id: "forged-event-id",
      protocolVersion: 1,
      type: "task.created",
      workspaceId: wsAlphaId,
      resource: { type: "task", id: new Types.ObjectId().toString() },
      payload: { title: "Forged Task" },
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(Boolean(clientA_ReceivedForgedEvent) === false, "Client-emitted domain:event was ignored and NOT relayed to other sockets");

    // Clean up connections
    clientA.disconnect();
    clientB.disconnect();

    console.log("\n==================================================");
    console.log("✅ All Phase 34 WP-3 & Gate 2 Real-Time Event Bus Tests Passed!");
    console.log("==================================================\n");
  } finally {
    if (ioServer) {
      await ioServer.close();
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
  console.error("❌ Typed Domain Event Bus Test Suite Failed:", err);
  process.exit(1);
});
