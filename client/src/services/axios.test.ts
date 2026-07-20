import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { apiClient, setAccessToken, getAccessToken, clearAccessToken } from "./axios.js";
import { useAuthStore } from "@/store/auth.store.js";

// Mock Zustand store
vi.mock("@/store/auth.store", () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      clearUser: vi.fn(),
    })),
  },
}));

describe("Axios Refresh Interceptor", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    clearAccessToken();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  it("adds Authorization header if access token exists", async () => {
    setAccessToken("test-token");
    mock.onGet("/test").reply(200, { success: true });

    const response = await apiClient.get("/test");
    expect(response.config.headers.Authorization).toBe("Bearer test-token");
  });

  it("refreshes token on 401 and retries the original request", async () => {
    // 1. Original request fails with 401
    mock.onGet("/protected").replyOnce(401);
    
    // 2. Refresh endpoint succeeds
    mock.onPost("/auth/refresh").replyOnce(200, {
      data: { accessToken: "new-token" }
    });

    // 3. Original request retried successfully
    mock.onGet("/protected").replyOnce(200, { success: true });

    const response = await apiClient.get("/protected");

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(getAccessToken()).toBe("new-token");
  });

  it("shares the refresh lock for concurrent 401s", async () => {
    mock.onGet("/protected1").replyOnce(401);
    mock.onGet("/protected2").replyOnce(401);
    
    // Setup refresh endpoint with a small delay to simulate network
    mock.onPost("/auth/refresh").reply(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return [200, { data: { accessToken: "shared-token" } }];
    });

    mock.onGet("/protected1").replyOnce(200, { id: 1 });
    mock.onGet("/protected2").replyOnce(200, { id: 2 });

    const [res1, res2] = await Promise.all([
      apiClient.get("/protected1"),
      apiClient.get("/protected2")
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    
    // Check that /auth/refresh was only called ONCE despite two 401s
    const refreshCalls = mock.history.post.filter(req => req.url === "/auth/refresh");
    expect(refreshCalls.length).toBe(1);
    expect(getAccessToken()).toBe("shared-token");
  });

  it("clears user state and throws if refresh fails", async () => {
    mock.onGet("/protected").replyOnce(401);
    
    // Refresh fails
    mock.onPost("/auth/refresh").replyOnce(401);

    const clearUserMock = vi.fn();
    (useAuthStore.getState as Mock).mockReturnValue({ clearUser: clearUserMock });

    await expect(apiClient.get("/protected")).rejects.toThrow();

    expect(getAccessToken()).toBeNull();
    expect(clearUserMock).toHaveBeenCalledTimes(1);
  });
});
