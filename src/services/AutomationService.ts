import {
  createPublicClient,
  createWalletClient,
  http,
  TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { config } from "../config/config";
import { logger } from "../utils/logger";
import { SubgraphService } from "./SubgraphService";
import { VRFSubscriptionService } from "./VRFSubscriptionService";
import { KuriMarketDeployed, KuriInitialised, KuriState } from "../types/types";
import * as schedule from "node-schedule";
import { KuriCoreABI } from "../config/newAbi";

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TX_CONFIRMATION_BLOCKS = 2;

interface MarketState {
  isActive: boolean;
  state: KuriState;
  nexRaffleTime: bigint;
  nextIntervalDepositTime: bigint;
  totalParticipants: bigint;
  totalActiveParticipants: bigint;
  currentInterval: number;
}

interface TransactionStatus {
  hash: `0x${string}`;
  status: "pending" | "success" | "failed";
  error?: Error;
  retries: number;
}

export class AutomationService {
  private publicClient;
  private walletClient;
  private subgraphService;
  private vrfSubscriptionService;
  private scheduleJob;
  private pendingTransactions: Map<string, TransactionStatus>;
  private lastRaffleAttempts: Map<string, number>; // Track last raffle attempt per market

  constructor() {
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(config.RPC_URL),
    });

    // Debug private key setup
    logger.info(`Private key available: ${!!config.PRIVATE_KEY}`);
    logger.info(`Private key length: ${config.PRIVATE_KEY?.length || 0}`);
    logger.info(`Private key starts with 0x: ${config.PRIVATE_KEY?.startsWith('0x')}`);

    if (!config.PRIVATE_KEY || config.PRIVATE_KEY.length < 64) {
      throw new Error(`Invalid PRIVATE_KEY: ${config.PRIVATE_KEY ? 'too short' : 'not provided'}`);
    }

    const account = privateKeyToAccount(config.PRIVATE_KEY as `0x${string}`);
    logger.info(`Wallet account address: ${account.address}`);

    this.walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(config.RPC_URL),
    });

    this.subgraphService = new SubgraphService();
    this.vrfSubscriptionService = new VRFSubscriptionService();
    this.pendingTransactions = new Map();
    this.lastRaffleAttempts = new Map();

    // Schedule raffle checks every 5 minutes
    this.scheduleJob = schedule.scheduleJob("*/5 * * * *", () => {
      this.checkAndExecuteRaffles();
    });

    // Schedule VRF subscription funding checks every 2 hours
    schedule.scheduleJob("0 */2 * * *", () => {
      logger.info("Starting scheduled VRF subscription funding check");
      this.vrfSubscriptionService.processUnfundedSubscriptions();
    });

    // Start monitoring pending transactions
    this.startTransactionMonitoring();

    // Perform initial subscription funding check on startup
    this.performInitialSubscriptionCheck();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES,
    delayMs = RETRY_DELAY
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries === 0) throw error;

      logger.warn(`Operation failed, retrying in ${delayMs}ms...`, error);
      await this.delay(delayMs);

      return this.retryWithBackoff(operation, retries - 1, delayMs * 2);
    }
  }

  private async monitorTransaction(
    hash: `0x${string}`,
    marketAddress: string
  ): Promise<void> {
    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: TX_CONFIRMATION_BLOCKS,
      });

      const status = this.pendingTransactions.get(hash);
      if (!status) return;

      if (receipt.status === "success") {
        logger.info(
          `Transaction ${hash} confirmed for market ${marketAddress}`
        );
        this.pendingTransactions.set(hash, { ...status, status: "success" });
      } else {
        logger.error(`Transaction ${hash} failed for market ${marketAddress}`);
        this.pendingTransactions.set(hash, { ...status, status: "failed" });

        // Retry failed transaction if under max retries
        if (status.retries < MAX_RETRIES) {
          await this.retryRaffle(marketAddress, status);
        }
      }
    } catch (error) {
      logger.error(`Error monitoring transaction ${hash}:`, error);
    }
  }

  private async startTransactionMonitoring(): Promise<void> {
    setInterval(async () => {
      for (const [hash, status] of this.pendingTransactions.entries()) {
        if (status.status === "pending") {
          try {
            const receipt = await this.publicClient.getTransactionReceipt({
              hash: hash as `0x${string}`,
            });
            if (receipt.status === "success") {
              this.pendingTransactions.set(hash, {
                ...status,
                status: "success",
              });
            } else if (receipt.status === "reverted") {
              this.pendingTransactions.set(hash, {
                ...status,
                status: "failed",
              });
            }
          } catch (error) {
            logger.error(`Error checking transaction ${hash} status:`, error);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async retryRaffle(
    marketAddress: string,
    previousAttempt: TransactionStatus
  ): Promise<void> {
    try {
      logger.info(`Retrying raffle for market ${marketAddress}`);

      const { request } = await this.publicClient.simulateContract({
        address: marketAddress as `0x${string}`,
        abi: KuriCoreABI,
        functionName: "kuriNarukk",
        account: this.walletClient.account, // Add account to retry simulation
      });

      const hash = await this.walletClient.writeContract(request);

      this.pendingTransactions.set(hash, {
        hash,
        status: "pending",
        retries: previousAttempt.retries + 1,
      });

      this.monitorTransaction(hash, marketAddress);

      logger.info(
        `Retry initiated for market ${marketAddress}, new tx: ${hash}`
      );
    } catch (error) {
      logger.error(
        `Failed to retry raffle for market ${marketAddress}:`,
        error
      );
    }
  }

  private async performInitialSubscriptionCheck(): Promise<void> {
    try {
      logger.info("Starting initial VRF subscription funding check on startup");
      await this.vrfSubscriptionService.processUnfundedSubscriptions();
    } catch (error) {
      logger.error("Error during initial subscription funding check:", error);
    }
  }

  private getStateString(state: KuriState): string {
    switch (state) {
      case KuriState.INLAUNCH:
        return "INLAUNCH";
      case KuriState.ACTIVE:
        return "ACTIVE";
      case KuriState.COMPLETED:
        return "COMPLETED";
      default:
        return `UNKNOWN(${state})`;
    }
  }

  async checkAndExecuteRaffles() {
    try {
      const { deployed, initialized } = await this.retryWithBackoff(() =>
        this.subgraphService.getActiveMarkets()
      );

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

  private async validateMarketState(
    market: KuriMarketDeployed
  ): Promise<MarketState | null> {
    return this.retryWithBackoff(async () => {
      try {
        const marketData = (await this.publicClient.readContract({
          address: market.marketAddress as `0x${string}`,
          abi: KuriCoreABI,
          functionName: "kuriData",
        })) as readonly [any, ...any[]];

        const currentInterval = (await this.publicClient.readContract({
          address: market.marketAddress as `0x${string}`,
          abi: KuriCoreABI,
          functionName: "passedIntervalsCounter",
        })) as number;

        const state = marketData[11] as KuriState;
        return {
          isActive: state === KuriState.ACTIVE,
          state: state,
          nexRaffleTime: BigInt(marketData[5]),
          nextIntervalDepositTime: BigInt(marketData[6]),
          totalParticipants: BigInt(marketData[2]),
          totalActiveParticipants: BigInt(marketData[3]),
          currentInterval: currentInterval,
        };
      } catch (error) {
        logger.error(
          `Failed to validate market state for ${market.marketAddress}:`,
          error
        );
        return null;
      }
    });
  }

  private async verifyPayments(
    marketAddress: string,
    state: MarketState
  ): Promise<boolean> {
    return this.retryWithBackoff(async () => {
      try {
        let allPaid = true;

        // Use totalActiveParticipants instead of totalParticipants
        for (let i = 1; i <= Number(state.totalActiveParticipants); i++) {
          // Get the user address from the user index
          const userAddress = await this.publicClient.readContract({
            address: marketAddress as `0x${string}`,
            abi: KuriCoreABI,
            functionName: "userIdToAddress",
            args: [i],
          });

          // Check if this user has paid for the current interval
          const hasPaid = await this.publicClient.readContract({
            address: marketAddress as `0x${string}`,
            abi: KuriCoreABI,
            functionName: "hasPaid",
            args: [userAddress, BigInt(state.currentInterval)],
          });

          if (!hasPaid) {
            allPaid = false;
            break;
          }
        }

        return allPaid;
      } catch (error) {
        logger.error(
          `Failed to verify payments for market ${marketAddress}:`,
          error
        );
        return false;
      }
    });
  }

  private async processMarket(market: KuriMarketDeployed) {
    try {
      const state = await this.validateMarketState(market);
      if (!state) {
        logger.error(`Invalid market state for ${market.marketAddress}`);
        return;
      }

      if (!state.isActive) {
        logger.info(`Market ${market.marketAddress} is not active (state: ${this.getStateString(state.state)})`);
        return;
      }

      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      if (currentTime < state.nexRaffleTime) {
        logger.info(
          `Raffle time not reached for market ${market.marketAddress}`
        );
        return;
      }

      const paymentsVerified = await this.verifyPayments(
        market.marketAddress,
        state
      );
      if (!paymentsVerified) {
        logger.warn(`Not all payments made for market ${market.marketAddress}`);
        return;
      }

      // Check if raffle has already been executed for current interval
      const existingRaffleWinner = await this.subgraphService.getRecentRaffleWinner(
        market.marketAddress,
        state.currentInterval
      );
      
      if (existingRaffleWinner) {
        logger.info(
          `Raffle already executed for market ${market.marketAddress} interval ${state.currentInterval}. Winner: ${existingRaffleWinner.winnerAddress}`
        );
        return;
      }

      // Check if we've attempted a raffle for this market recently (within 1 hour)
      const lastAttemptTime = this.lastRaffleAttempts.get(market.marketAddress) || 0;
      const currentTimeMs = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      
      if (currentTimeMs - lastAttemptTime < oneHour) {
        logger.info(
          `Raffle attempt for market ${market.marketAddress} was made recently (${Math.round((currentTimeMs - lastAttemptTime) / (60 * 1000))} minutes ago). Waiting before next attempt.`
        );
        return;
      }

      // Record the raffle attempt time
      this.lastRaffleAttempts.set(market.marketAddress, currentTimeMs);

      logger.info(`Initiating raffle for market: ${market.marketAddress}`);
      logger.info(`Using account: ${this.walletClient.account?.address}`);
      
      const { request } = await this.publicClient.simulateContract({
        address: market.marketAddress as `0x${string}`,
        abi: KuriCoreABI,
        functionName: "kuriNarukk",
        account: this.walletClient.account, // Add account to simulation
      });

      const hash = await this.walletClient.writeContract(request);

      // Add to pending transactions
      this.pendingTransactions.set(hash, {
        hash,
        status: "pending",
        retries: 0,
      });

      // Start monitoring the transaction
      this.monitorTransaction(hash, market.marketAddress);

      logger.info(
        `Raffle initiated for market ${market.marketAddress}, tx: ${hash}`
      );
    } catch (error) {
      logger.error(`Failed to process market ${market.marketAddress}:`, error);
    }
  }

  public stopScheduler() {
    if (this.scheduleJob) {
      this.scheduleJob.cancel();
    }
  }

  // Get pending transactions for monitoring
  public getPendingTransactions(): Map<string, TransactionStatus> {
    return this.pendingTransactions;
  }
}
