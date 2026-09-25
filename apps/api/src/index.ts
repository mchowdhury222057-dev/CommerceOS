import "dotenv/config";
import { app } from "./app.js";
import { logger } from "./lib/logger.js";
import { registerNotificationSubscribers } from "./services/notification.service.js";
import { verifyEmailConnection } from "./lib/email.js";

const PORT = process.env.PORT ?? 4000;

// Per Part M.3 - subscribers are wired once at process start; publishers
// (the *.service.ts functions) never import a subscriber directly.
registerNotificationSubscribers();

// Fire-and-forget (not awaited) - checking this must not delay server
// startup/tsx's dev-restart loop, it only needs to log clearly once
// resolved. See lib/email.ts's verifyEmailConnection for what this reports.
void verifyEmailConnection();

app.listen(PORT, () => {
  logger.info(`CommerceOS API listening on http://localhost:${PORT}`);
});
