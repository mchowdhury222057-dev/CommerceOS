import "dotenv/config";
import { app } from "./app.js";
import { logger } from "./lib/logger.js";
import { registerNotificationSubscribers } from "./services/notification.service.js";

const PORT = process.env.PORT ?? 4000;

// Per Part M.3 - subscribers are wired once at process start; publishers
// (the *.service.ts functions) never import a subscriber directly.
registerNotificationSubscribers();

app.listen(PORT, () => {
  logger.info(`CommerceOS API listening on http://localhost:${PORT}`);
});
