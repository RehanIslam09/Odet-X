import app from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function bootstrap() {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 AI Project Manager API");
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`📡 Server: http://localhost:${env.PORT}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });
}

bootstrap();