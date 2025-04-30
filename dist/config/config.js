"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    RPC_URL: process.env.RPC_URL || "https://sepolia.base.org",
    PRIVATE_KEY: process.env.PRIVATE_KEY || "",
    SUBGRAPH_URL: process.env.SUBGRAPH_URL ||
        "https://api.thegraph.com/subgraphs/name/your-subgraph",
    CRON_SCHEDULE: process.env.CRON_SCHEDULE || "*/5 * * * *", // every 5 minutes
    CHAIN_ID: 84532, // Base Sepolia
};
