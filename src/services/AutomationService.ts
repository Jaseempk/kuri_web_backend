import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { config } from "../config/config";
import { logger } from "../utils/logger";
import { SubgraphService } from "./SubgraphService";
import { KuriMarketDeployed, KuriInitialised } from "../types/types";

// KuriCore ABI - you'll need to export this from your contracts
const kuriCoreABI = [
  {
    inputs: [],
    name: "kuriNarukk",
    outputs: [{ name: "_requestId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "kuriData",
    outputs: [
      { name: "creator", type: "address" },
      { name: "kuriAmount", type: "uint64" },
      { name: "totalParticipantsCount", type: "uint16" },
      { name: "totalActiveParticipantsCount", type: "uint16" },
      { name: "intervalDuration", type: "uint24" },
      { name: "nexRaffleTime", type: "uint48" },
      { name: "nextIntervalDepositTime", type: "uint48" },
      { name: "launchPeriod", type: "uint48" },
      { name: "startTime", type: "uint48" },
      { name: "endTime", type: "uint48" },
      { name: "intervalType", type: "uint8" },
      { name: "state", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class AutomationService {
  private publicClient;
  private walletClient;
  private subgraphService;

  constructor() {
    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(config.RPC_URL),
    });

    const account = privateKeyToAccount(config.PRIVATE_KEY as `0x${string}`);

    this.walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(config.RPC_URL),
    });

    this.subgraphService = new SubgraphService();
  }

  async checkAndExecuteRaffles() {
    try {
      const { deployed, initialized } =
        await this.subgraphService.getActiveMarkets();
      logger.info(
        `Found ${deployed.length} deployed markets and ${initialized.length} initialized markets`
      );

      for (const market of deployed) {
        await this.processMarket(market);
      }
    } catch (error) {
      logger.error("Error in checkAndExecuteRaffles:", error);
    }
  }

  private async processMarket(market: KuriMarketDeployed) {
    try {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const nexRaffleTime = BigInt(market.timestamp);

      if (currentTime >= nexRaffleTime) {
        logger.info(`Initiating raffle for market: ${market.marketAddress}`);

        const { request } = await this.publicClient.simulateContract({
          address: market.marketAddress as `0x${string}`,
          abi: kuriCoreABI,
          functionName: "kuriNarukk",
        });

        const hash = await this.walletClient.writeContract(request);

        logger.info(
          `Raffle initiated for market ${market.marketAddress}, tx: ${hash}`
        );
      }
    } catch (error) {
      logger.error(`Failed to process market ${market.marketAddress}:`, error);
    }
  }
}
