import dotenv from "dotenv";
dotenv.config();

// Debug environment loading
console.log("Environment debug:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PRIVATE_KEY available:", !!process.env.PRIVATE_KEY);
console.log("PRIVATE_KEY length:", process.env.PRIVATE_KEY?.length || 0);
console.log("RPC_URL available:", !!process.env.RPC_URL);

// Validate critical environment variables
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("PRIVATE_KEY environment variable is required");
}

if (!privateKey.startsWith("0x")) {
  throw new Error("PRIVATE_KEY must start with 0x");
}

if (privateKey.length !== 66) {
  throw new Error(
    `PRIVATE_KEY must be 66 characters long, got ${privateKey.length}`
  );
}

export const config = {
  RPC_URL: process.env.RPC_URL || "",
  PRIVATE_KEY: privateKey,
  SUBGRAPH_URL:
    process.env.SUBGRAPH_URL ||
    "https://indexer.dev.hyperindex.xyz/11c60b7/v1/graphql",
  CRON_SCHEDULE: process.env.CRON_SCHEDULE || "*/5 * * * *", // every 5 minutes
  CHAIN_ID: 8453, // Base
  VRF_COORDINATOR: "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634",
  VRF_CHECK_INTERVAL: process.env.VRF_CHECK_INTERVAL || "30 * * * *", // 30 minutes past every hour
  SUBSCRIPTION_MANAGER:
    process.env.SUBSCRIPTION_MANAGER ||
    "0xfe9e01aB2d887Ebfc8cb6C7e7bD04cCb659F9e6B",
};
