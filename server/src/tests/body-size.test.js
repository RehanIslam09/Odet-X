import app from "../app.js";

const server = app.listen(0, async () => {
  const port = server.address().port;
  
  const testPayload = async (name, payload) => {
    const body = JSON.stringify({ notes: payload });
    try {
      const response = await fetch(`http://localhost:${port}/api/v1/tasks/123/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });
      const data = await response.json();
      console.log(`${name} (${payload.length} chars) -> Status: ${response.status}, Response:`, data);
    } catch (e) {
      console.log(`${name} failed:`, e.message);
    }
  };

  const small = "a".repeat(10);
  const near100 = "a".repeat(100 * 1024 - 100);
  const above100 = "a".repeat(100 * 1024 + 100);
  const near250 = "a".repeat(249000);
  const above250 = "a".repeat(251000);

  await testPayload("Small", small);
  await testPayload("Near 100KB", near100);
  await testPayload("Above 100KB", above100);
  await testPayload("Near 250KB", near250);
  await testPayload("Above 250KB", above250);
  
  server.close();
});
