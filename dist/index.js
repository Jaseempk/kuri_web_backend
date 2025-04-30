"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const AutomationService_1 = require("./services/AutomationService");
const config_1 = require("./config/config");
const logger_1 = require("./utils/logger");
const automationService = new AutomationService_1.AutomationService();
// Schedule the automation task
node_cron_1.default.schedule(config_1.config.CRON_SCHEDULE, async () => {
    logger_1.logger.info("Starting automation check...");
    await automationService.checkAndExecuteRaffles();
});
logger_1.logger.info("Kuri automation service started");
