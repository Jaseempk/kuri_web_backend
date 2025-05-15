import dotenv from "dotenv";
dotenv.config();

export const config = {
  RPC_URL: process.env.RPC_URL || "https://sepolia.base.org",
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  SUBGRAPH_URL:
    process.env.SUBGRAPH_URL ||
    "https://api.thegraph.com/subgraphs/name/your-subgraph",
  CRON_SCHEDULE: process.env.CRON_SCHEDULE || "*/5 * * * *", // every 5 minutes
  CHAIN_ID: 84532, // Base Sepolia
  VRF_COORDINATOR: "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE",
  VRF_CHECK_INTERVAL: process.env.VRF_CHECK_INTERVAL || "30 * * * *", // 30 minutes past every hour
};
