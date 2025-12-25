import { startHttpServer } from "./http-server";
import { config } from "./config";

startHttpServer(config.port).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

