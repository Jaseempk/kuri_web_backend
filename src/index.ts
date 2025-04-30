import cron from "node-cron";
import { AutomationService } from "./services/AutomationService";
import { config } from "./config/config";
import { logger } from "./utils/logger";

const automationService = new AutomationService();

// Schedule the automation task
cron.schedule(config.CRON_SCHEDULE, async () => {
  logger.info("Starting automation check...");
  await automationService.checkAndExecuteRaffles();
});

logger.info("Kuri automation service started");
