import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { config } from "../config/config";
import { logger } from "../utils/logger";
import { SubgraphService } from "./SubgraphService";
import { KuriCoreABI } from "../config/newAbi";
import { SubscriptionManagerABI } from "../config/subscriptionManagerAbi";
import * as fs from "fs";
import * as path from "path";

interface FundedSubscriptionData {
  fundedSubscriptions: string[];
  lastUpdated: string;
}

interface SubscriptionInfo {
  balance: bigint;
  nativeBalance: bigint;
  reqCount: bigint;
  subOwner: string;
  consumers: string[];
}

export class VRFSubscriptionService {
  private publicClient;
  private walletClient;
  private subgraphService;
  private fundedSubscriptions: Set<string> = new Set();
  private failedFundingAttempts: Map<string, number> = new Map();
  private readonly storageFile = path.join(
    process.cwd(),
    "funded-subscriptions.json"
  );
  private readonly minimumBalance = BigInt("100000000000000000"); // 0.1 LINK
  private readonly fundingAmount = BigInt("1000000000000000000"); // 1 LINK
  private readonly subscriptionManagerAddress = config.SUBSCRIPTION_MANAGER;
  private readonly maxRetryAttempts = 3;

  constructor() {
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(config.RPC_URL),
    });

    const account = privateKeyToAccount(config.PRIVATE_KEY as `0x${string}`);

    this.walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(config.RPC_URL),
    });

    this.subgraphService = new SubgraphService();
    this.loadFundedSubscriptions();
  }

  async processUnfundedSubscriptions() {
    try {
      // Get all deployed markets from subgraph
      const { deployed } = await this.subgraphService.getActiveMarkets();

      logger.info(
        `Checking ${deployed.length} markets for subscription funding needs`
      );

      // Extract unique subscription IDs from markets
      const subscriptionIds = await this.getUniqueSubscriptionIds(deployed);

      logger.info(`Found ${subscriptionIds.size} unique subscription IDs`);

      // Check and fund unfunded subscriptions
      for (const subId of subscriptionIds) {
        await this.checkAndFundSubscription(subId);
      }
    } catch (error) {
      logger.error("Error in processUnfundedSubscriptions:", error);
    }
  }

  private async getUniqueSubscriptionIds(markets: any[]): Promise<Set<string>> {
    const subscriptionIds = new Set<string>();

    for (const market of markets) {
      try {
        const subId = (await this.publicClient.readContract({
          address: market.marketAddress as `0x${string}`,
          abi: KuriCoreABI,
          functionName: "s_subscriptionId",
        })) as bigint;

        if (subId > 0) {
          subscriptionIds.add(subId.toString());
        }
      } catch (error) {
        logger.error(
          `Error reading subscription ID for market ${market.marketAddress}:`,
          error
        );
      }
    }

    return subscriptionIds;
  }

  private async checkAndFundSubscription(subId: string): Promise<void> {
    try {
      // Skip if already funded
      if (this.fundedSubscriptions.has(subId)) {
        logger.debug(`Subscription ${subId} already funded, skipping`);
        return;
      }

      // Get subscription info from VRF Coordinator
      const subscriptionInfo = await this.getSubscriptionInfo(subId);

      if (!subscriptionInfo) {
        logger.warn(`Could not get info for subscription ${subId}`);
        return;
      }

      // Check if funding is needed
      if (subscriptionInfo.balance < this.minimumBalance) {
        // Check if we've exceeded max retry attempts
        const attempts = this.failedFundingAttempts.get(subId) || 0;
        if (attempts >= this.maxRetryAttempts) {
          logger.error(
            `Subscription ${subId} has exceeded max funding attempts (${this.maxRetryAttempts}). Skipping.`
          );
          return;
        }

        logger.info(
          `Subscription ${subId} needs funding. Balance: ${
            subscriptionInfo.balance
          }, Minimum: ${this.minimumBalance} (Attempt ${attempts + 1}/${
            this.maxRetryAttempts
          })`
        );
        await this.fundSubscription(subId);
      } else {
        logger.debug(
          `Subscription ${subId} has sufficient balance: ${subscriptionInfo.balance}`
        );
        // Clear any previous failed attempts and mark as funded
        this.failedFundingAttempts.delete(subId);
        this.addToFundedList(subId);
      }
    } catch (error) {
      logger.error(`Error checking/funding subscription ${subId}:`, error);
    }
  }

  private async getSubscriptionInfo(
    subId: string
  ): Promise<SubscriptionInfo | null> {
    try {
      // Read subscription info from VRF Coordinator
      const subscriptionData = (await this.publicClient.readContract({
        address: config.VRF_COORDINATOR as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "uint256", name: "subId", type: "uint256" },
            ],
            name: "getSubscription",
            outputs: [
              { internalType: "uint96", name: "balance", type: "uint96" },
              { internalType: "uint96", name: "nativeBalance", type: "uint96" },
              { internalType: "uint64", name: "reqCount", type: "uint64" },
              { internalType: "address", name: "subOwner", type: "address" },
              {
                internalType: "address[]",
                name: "consumers",
                type: "address[]",
              },
            ],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "getSubscription",
        args: [BigInt(subId)],
      })) as [bigint, bigint, bigint, string, string[]];

      return {
        balance: subscriptionData[0],
        nativeBalance: subscriptionData[1],
        reqCount: subscriptionData[2],
        subOwner: subscriptionData[3],
        consumers: subscriptionData[4],
      };
    } catch (error) {
      logger.error(`Error getting subscription info for ${subId}:`, error);
      return null;
    }
  }

  private async fundSubscription(subId: string): Promise<void> {
    try {
      logger.info(
        `Funding subscription ${subId} with ${this.fundingAmount} wei`
      );

      // Debug: Check wallet client account before contract call
      logger.info(
        `Wallet client account: ${
          this.walletClient.account?.address || "undefined"
        }`
      );

      // Call topUpSubscription on the subscription manager
      const { request } = await this.publicClient.simulateContract({
        address: this.subscriptionManagerAddress as `0x${string}`,
        abi: SubscriptionManagerABI,
        functionName: "topUpSubscription",
        args: [this.fundingAmount, BigInt(subId)],
        account: this.walletClient.account, // Explicitly set the account
      });

      const hash = await this.walletClient.writeContract(request);

      logger.info(`Funding transaction sent: ${hash}`);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      if (receipt.status === "success") {
        // Verify funding was successful by checking updated balance
        const verificationResult = await this.verifyFundingSuccess(subId);

        if (verificationResult.success) {
          // Reset failed attempts counter and mark as funded
          this.failedFundingAttempts.delete(subId);
          this.addToFundedList(subId);
          logger.info(
            `Successfully funded subscription ${subId}. New balance: ${verificationResult.newBalance}`
          );
        } else {
          // Increment failed attempts counter
          const attempts = (this.failedFundingAttempts.get(subId) || 0) + 1;
          this.failedFundingAttempts.set(subId, attempts);
          logger.error(
            `Funding verification failed for subscription ${subId}. Current balance: ${verificationResult.newBalance}, Expected minimum: ${this.minimumBalance} (Failed attempts: ${attempts})`
          );
        }
      } else {
        // Increment failed attempts counter for transaction failure
        const attempts = (this.failedFundingAttempts.get(subId) || 0) + 1;
        this.failedFundingAttempts.set(subId, attempts);
        logger.error(
          `Funding transaction failed for subscription ${subId} (Failed attempts: ${attempts})`
        );
      }
    } catch (error) {
      // Increment failed attempts counter for errors
      const attempts = (this.failedFundingAttempts.get(subId) || 0) + 1;
      this.failedFundingAttempts.set(subId, attempts);
      logger.error(
        `Error funding subscription ${subId} (Failed attempts: ${attempts}):`,
        error
      );
    }
  }

  private async verifyFundingSuccess(
    subId: string
  ): Promise<{ success: boolean; newBalance: bigint }> {
    try {
      // Wait a bit for the balance to update on-chain
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get updated subscription info
      const subscriptionInfo = await this.getSubscriptionInfo(subId);

      if (!subscriptionInfo) {
        logger.warn(
          `Could not verify funding for subscription ${subId} - unable to fetch subscription info`
        );
        return { success: false, newBalance: BigInt(0) };
      }

      // Check if balance now meets minimum requirement
      const fundingSuccessful = subscriptionInfo.balance >= this.minimumBalance;

      logger.info(
        `Funding verification for subscription ${subId}: Balance=${subscriptionInfo.balance}, Minimum=${this.minimumBalance}, Success=${fundingSuccessful}`
      );

      return {
        success: fundingSuccessful,
        newBalance: subscriptionInfo.balance,
      };
    } catch (error) {
      logger.error(`Error verifying funding for subscription ${subId}:`, error);
      return { success: false, newBalance: BigInt(0) };
    }
  }

  private loadFundedSubscriptions(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, "utf8");
        const parsed: FundedSubscriptionData = JSON.parse(data);
        this.fundedSubscriptions = new Set(parsed.fundedSubscriptions);
        logger.info(
          `Loaded ${this.fundedSubscriptions.size} funded subscriptions from storage`
        );
      } else {
        logger.info(
          "No existing funded subscriptions file found, starting fresh"
        );
      }
    } catch (error) {
      logger.error("Error loading funded subscriptions:", error);
    }
  }

  private addToFundedList(subId: string): void {
    this.fundedSubscriptions.add(subId);
    this.saveFundedSubscriptions();
  }

  private saveFundedSubscriptions(): void {
    try {
      const data: FundedSubscriptionData = {
        fundedSubscriptions: Array.from(this.fundedSubscriptions),
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error("Error saving funded subscriptions:", error);
    }
  }
}
