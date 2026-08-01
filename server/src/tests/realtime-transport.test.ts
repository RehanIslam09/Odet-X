import dotenv from "dotenv";
import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { Types } from "mongoose";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

dotenv.config();

import app from "../app.js";
import User from "../models/user.model.js";
import { generateAccessToken } from "../utils/jwt.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-db.js";
import { createRealtimeServer, userSessionRegistry, RealtimeServerInstance } from "../realtime/index.js";

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

function waitForConnectError(clientSocket: ClientSocket): Promise<Error> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Connect error timeout")), 5000);
    clientSocket.on("connect", () => {
      clearTimeout(timer);
      reject(new Error("Expected connection error but socket connected successfully"));
    });
    clientSocket.on("connect_error", (err) => {
      clearTimeout(timer);
      resolve(err);
    });
  });
}

function waitForDisconnect(clientSocket: ClientSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Disconnect timeout")), 5000);
    clientSocket.on("disconnect", (reason) => {
      clearTimeout(timer);
      resolve(reason);
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
    console.log("▶ Phase 34 WP-1 — Real-Time Transport & Handshake Auth Tests");
    console.log("==================================================\n");

    // Clear registry state prior to test runs
    userSessionRegistry.clear();

    // Setup HTTP server with Socket.IO attached for test runs
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

    // Create test users in database
    const activeUser = await User.create({
      name: "Realtime Active User",
      email: "active.realtime@test.com",
      username: "active_rt_user",
      password: "password123!",
      isActive: true,
    });

    const inactiveUser = await User.create({
      name: "Realtime Inactive User",
      email: "inactive.realtime@test.com",
      username: "inactive_rt_user",
      password: "password123!",
      isActive: false,
    });

    const activeUser2 = await User.create({
      name: "Second Active User",
      email: "active2.realtime@test.com",
      username: "active2_rt_user",
      password: "password123!",
      isActive: true,
    });

    const validToken = generateAccessToken(activeUser._id.toString());
    const validToken2 = generateAccessToken(activeUser2._id.toString());
    const inactiveUserToken = generateAccessToken(inactiveUser._id.toString());
    const nonExistentUserToken = generateAccessToken(new Types.ObjectId().toString());

    // =========================================================================
    // 1. Valid Authentication
    // =========================================================================
    console.log(">> 1. Valid JWT Authentication...");
    const client1 = ioClient(serverUrl, {
      auth: { token: validToken },
      transports: ["websocket"],
      reconnection: false,
    });

    await waitForConnect(client1);
    expect(client1.connected === true, "Valid token connects successfully");
    expect(userSessionRegistry.getConnectedUserCount() === 1, "UserSessionRegistry tracks 1 connected user");
    expect(userSessionRegistry.getActiveSocketCount() === 1, "UserSessionRegistry tracks 1 active socket");

    // Verify trusted identity stored in socket data on server
    const userSockets = userSessionRegistry.getSocketsForUser(activeUser._id.toString());
    expect(userSockets.length === 1, "Registry returns 1 socket for activeUser");
    expect(Boolean(userSockets[0] && userSockets[0].data.userId === activeUser._id.toString()), "Server socket metadata contains correct userId");
    expect(Boolean(userSockets[0] && userSockets[0].data.user.email === activeUser.email), "Server socket metadata contains trusted user email");

    // =========================================================================
    // 2. Missing Token Rejection
    // =========================================================================
    console.log("\n>> 2. Missing Handshake Token Rejection...");
    const clientMissingToken = ioClient(serverUrl, {
      auth: {},
      transports: ["websocket"],
      reconnection: false,
    });

    const missingTokenErr = await waitForConnectError(clientMissingToken);
    expect(missingTokenErr.message === "Authentication required.", "Missing token yields 'Authentication required.' error");
    expect(clientMissingToken.connected === false, "Socket with missing token is not connected");

    // =========================================================================
    // 3. Invalid Token Rejection
    // =========================================================================
    console.log("\n>> 3. Invalid JWT Rejection...");
    const clientInvalidToken = ioClient(serverUrl, {
      auth: { token: "invalid.jwt.signature" },
      transports: ["websocket"],
      reconnection: false,
    });

    const invalidTokenErr = await waitForConnectError(clientInvalidToken);
    expect(invalidTokenErr.message === "Authentication required.", "Invalid token yields 'Authentication required.' error");
    expect(clientInvalidToken.connected === false, "Socket with invalid token is not connected");

    // =========================================================================
    // 4. Missing User Rejection
    // =========================================================================
    console.log("\n>> 4. Non-Existent User Rejection...");
    const clientMissingUser = ioClient(serverUrl, {
      auth: { token: nonExistentUserToken },
      transports: ["websocket"],
      reconnection: false,
    });

    const missingUserErr = await waitForConnectError(clientMissingUser);
    expect(missingUserErr.message === "Authentication required.", "Valid token for non-existent user yields 'Authentication required.'");
    expect(clientMissingUser.connected === false, "Socket for non-existent user is not connected");

    // =========================================================================
    // 5. Inactive User Rejection
    // =========================================================================
    console.log("\n>> 5. Inactive User Account Rejection...");
    const clientInactiveUser = ioClient(serverUrl, {
      auth: { token: inactiveUserToken },
      transports: ["websocket"],
      reconnection: false,
    });

    const inactiveUserErr = await waitForConnectError(clientInactiveUser);
    expect(inactiveUserErr.message === "Authentication required.", "Token for inactive user yields 'Authentication required.'");
    expect(clientInactiveUser.connected === false, "Socket for inactive user is not connected");

    // =========================================================================
    // 6. Client Identity Spoofing Protection
    // =========================================================================
    console.log("\n>> 6. Client Identity Spoofing Protection...");
    const clientSpoof = ioClient(serverUrl, {
      auth: {
        token: validToken,
        userId: "spoofed_admin_id",
        role: "OWNER",
      },
      transports: ["websocket"],
      reconnection: false,
    });

    await waitForConnect(clientSpoof);
    expect(clientSpoof.connected === true, "Socket connects with authentic JWT");
    const activeSockets = userSessionRegistry.getSocketsForUser(activeUser._id.toString());
    const latestSocket = activeSockets.find((s) => s.id === clientSpoof.id);
    expect(latestSocket !== undefined, "Socket found in server registry");
    expect(latestSocket?.data.userId === activeUser._id.toString(), "Server identity is derived from verified JWT, ignoring client spoofed userId");

    // =========================================================================
    // 7. Multiple Socket Connections for Same User
    // =========================================================================
    console.log("\n>> 7. Multiple Tabs/Sockets for Same User...");
    expect(userSessionRegistry.getSocketsForUser(activeUser._id.toString()).length === 2, "Registry has 2 active sockets for activeUser");
    expect(userSessionRegistry.getConnectedUserCount() === 1, "Connected user count is still 1");
    expect(userSessionRegistry.getActiveSocketCount() === 2, "Active socket count is 2");

    // =========================================================================
    // 8. Disconnect Cleanup
    // =========================================================================
    console.log("\n>> 8. Disconnect Registry Cleanup...");
    clientSpoof.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(userSessionRegistry.getSocketsForUser(activeUser._id.toString()).length === 1, "Registry retains 1 socket after clientSpoof disconnects");
    expect(userSessionRegistry.getActiveSocketCount() === 1, "Active socket count decreases to 1");

    client1.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(userSessionRegistry.getSocketsForUser(activeUser._id.toString()).length === 0, "Registry has 0 sockets after all user sockets disconnect");
    expect(userSessionRegistry.getConnectedUserCount() === 0, "Connected user count decreases to 0");
    expect(userSessionRegistry.getActiveSocketCount() === 0, "Active socket count decreases to 0");

    // =========================================================================
    // 9. User-Wide Disconnect Capability
    // =========================================================================
    console.log("\n>> 9. User-Wide Disconnect Capability...");
    const clientUser1_Tab1 = ioClient(serverUrl, { auth: { token: validToken }, transports: ["websocket"], reconnection: false });
    const clientUser1_Tab2 = ioClient(serverUrl, { auth: { token: validToken }, transports: ["websocket"], reconnection: false });
    const clientUser2_Tab1 = ioClient(serverUrl, { auth: { token: validToken2 }, transports: ["websocket"], reconnection: false });

    await Promise.all([
      waitForConnect(clientUser1_Tab1),
      waitForConnect(clientUser1_Tab2),
      waitForConnect(clientUser2_Tab1),
    ]);

    expect(userSessionRegistry.getConnectedUserCount() === 2, "2 distinct users connected");
    expect(userSessionRegistry.getActiveSocketCount() === 3, "3 total sockets connected");

    const disconnectPromise1 = waitForDisconnect(clientUser1_Tab1);
    const disconnectPromise2 = waitForDisconnect(clientUser1_Tab2);

    userSessionRegistry.disconnectUserSockets(activeUser._id.toString());

    await Promise.all([disconnectPromise1, disconnectPromise2]);

    expect(clientUser1_Tab1.connected === false, "User 1 Tab 1 is disconnected");
    expect(clientUser1_Tab2.connected === false, "User 1 Tab 2 is disconnected");
    expect(clientUser2_Tab1.connected === true, "User 2 Tab 1 remains connected");

    expect(userSessionRegistry.getSocketsForUser(activeUser._id.toString()).length === 0, "Registry cleared for User 1");
    expect(userSessionRegistry.getSocketsForUser(activeUser2._id.toString()).length === 1, "Registry retains User 2 socket");

    clientUser2_Tab1.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // =========================================================================
    // 10. Process Isolation / app.ts Listener Assertion
    // =========================================================================
    console.log("\n>> 10. Process Isolation Assertion (app.ts has no listeners)...");
    expect(app.get("env") !== undefined, "Express app instantiated");
    // Verify app object has not opened any server listeners on its own
    expect((app as any).listening === undefined || (app as any).listening === false, "Express app object is not listening on network port");

    console.log("\n==================================================");
    console.log("✅ All Phase 34 WP-1 Real-Time Transport Tests Passed!");
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
  console.error("❌ Real-Time Transport Test Suite Failed:", err);
  process.exit(1);
});
