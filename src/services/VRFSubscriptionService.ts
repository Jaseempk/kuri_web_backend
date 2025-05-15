import {
  createPublicClient,
  createWalletClient,
  http,
  decodeEventLog,
  Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { config } from "../config/config";
import { logger } from "../utils/logger";
import { SubgraphService } from "./SubgraphService";
import { kuriCoreABI } from "../config/abi";

interface VRFIntegrationDoneEvent {
  eventName: "VRFIntegrationDone";
  args: {
    caller: string;
    subscriptionId: bigint;
    consumerCount: bigint;
    contractAddress: string;
    timestamp: bigint;
  };
}

interface VRFSubscriptionTracker {
  currentSubscriptionId: bigint;
  lastCheckedContract: string;
  lastUpdateTime: number;
}

export class VRFSubscriptionService {
  private publicClient;
  private walletClient;
  private subgraphService;
  private subscriptionTracker: VRFSubscriptionTracker | null = null;

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

  async processUnsubscribedContracts() {
    try {
      // Get all deployed markets from subgraph
      const { deployed } = await this.subgraphService.getActiveMarkets();

      // Filter for unsubscribed markets
      const unsubscribedMarkets = await this.filterUnsubscribedMarkets(
        deployed
      );

      if (unsubscribedMarkets.length === 0) {
        logger.info("No unsubscribed markets found");
        return;
      }

      logger.info(`Found ${unsubscribedMarkets.length} unsubscribed markets`);

      // Process each unsubscribed market
      for (const market of unsubscribedMarkets) {
        await this.handleContractSubscription(market.marketAddress);
      }
    } catch (error) {
      logger.error("Error in processUnsubscribedContracts:", error);
    }
  }

  private async handleContractSubscription(marketAddress: string) {
    try {
      // If we don't have a current subscription ID, start with 1
      if (!this.subscriptionTracker) {
        this.subscriptionTracker = {
          currentSubscriptionId: BigInt(1),
          lastCheckedContract: marketAddress,
          lastUpdateTime: Date.now(),
        };
      }

      logger.info(
        `Processing VRF subscription for market ${marketAddress} with subscription ID ${this.subscriptionTracker.currentSubscriptionId}`
      );

      // Call createSubscriptionOrAddConsumer
      const { request } = await this.publicClient.simulateContract({
        address: marketAddress as `0x${string}`,
        abi: kuriCoreABI,
        functionName: "createSubscriptionOrAddConsumer",
        args: [this.subscriptionTracker.currentSubscriptionId],
      });

      const hash = await this.walletClient.writeContract(request);

      logger.info(`VRF subscription transaction sent: ${hash}`);

      // Wait for transaction receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      // Look for VRFIntegrationDone event
      const vrfEvent = await this.findVRFIntegrationDoneEvent(receipt);

      if (vrfEvent) {
        // Update our tracker with the subscription ID from the event
        this.subscriptionTracker = {
          currentSubscriptionId: BigInt(vrfEvent.subscriptionId),
          lastCheckedContract: marketAddress,
          lastUpdateTime: Date.now(),
        };

        logger.info(
          `Market ${marketAddress} subscribed to VRF. SubID: ${vrfEvent.subscriptionId}, Consumer Count: ${vrfEvent.consumerCount}`
        );
      } else {
        logger.warn(
          `No VRFIntegrationDone event found for market ${marketAddress}`
        );
      }
    } catch (error) {
      logger.error(`Error subscribing market ${marketAddress} to VRF:`, error);
    }
  }

  private async findVRFIntegrationDoneEvent(receipt: any) {
    const logs = receipt.logs;

    // Find the VRFIntegrationDone event
    for (const log of logs) {
      try {
        // Find the event in the ABI
        const vrfIntegrationEvent = kuriCoreABI.find(
          (item) => item.type === "event" && item.name === "VRFIntegrationDone"
        );

        if (!vrfIntegrationEvent) continue;

        // Use decodeEventLog from viem with proper typing
        const decodedLog = decodeEventLog({
          abi: [vrfIntegrationEvent] as Abi,
          data: log.data,
          topics: log.topics,
        });

        // Type check and safe access
        if (
          decodedLog.eventName === "VRFIntegrationDone" &&
          Array.isArray(decodedLog.args) &&
          decodedLog.args.length >= 5
        ) {
          const [
            caller,
            subscriptionId,
            consumerCount,
            contractAddress,
            timestamp,
          ] = decodedLog.args;

          return {
            subscriptionId: BigInt(subscriptionId.toString()),
            consumerCount: BigInt(consumerCount.toString()),
            contractAddress: contractAddress as string,
          };
        }
      } catch (e) {
        // Skip logs that can't be decoded as this event
        continue;
      }
    }
    return null;
  }

  private async filterUnsubscribedMarkets(markets: any[]) {
    const unsubscribed = [];

    for (const market of markets) {
      const isSubscribed = await this.checkIfSubscribed(market.marketAddress);
      if (!isSubscribed) {
        unsubscribed.push(market);
      }
    }

    return unsubscribed;
  }

  private async checkIfSubscribed(marketAddress: string): Promise<boolean> {
    try {
      const data = await this.publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: kuriCoreABI,
        functionName: "isSubscribed",
      });
      return data as boolean;
    } catch (error) {
      logger.error(`Error checking subscription for ${marketAddress}:`, error);
      return false;
    }
  }
}
