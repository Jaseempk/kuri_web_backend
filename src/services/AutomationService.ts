import {
  createPublicClient,
  createWalletClient,
  http,
  TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { config } from "../config/config";
import { logger } from "../utils/logger";
import { SubgraphService } from "./SubgraphService";
import { KuriMarketDeployed, KuriInitialised } from "../types/types";
import * as schedule from "node-schedule";
import { kuriCoreABI } from "../config/abi";

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TX_CONFIRMATION_BLOCKS = 2;

interface MarketState {
  isActive: boolean;
  nexRaffleTime: bigint;
  nextIntervalDepositTime: bigint;
  totalParticipants: bigint;
  currentInterval: bigint;
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
  private scheduleJob;
  private pendingTransactions: Map<string, TransactionStatus>;

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
    this.pendingTransactions = new Map();

    // Schedule checks every hour
    this.scheduleJob = schedule.scheduleJob("0 * * * *", () => {
      this.checkAndExecuteRaffles();
    });

    // Start monitoring pending transactions
    this.startTransactionMonitoring();
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
        abi: kuriCoreABI,
        functionName: "kuriNarukk",
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
          abi: kuriCoreABI,
          functionName: "kuriData",
        })) as readonly [any, ...any[]];

        const currentInterval = (await this.publicClient.readContract({
          address: market.marketAddress as `0x${string}`,
          abi: kuriCoreABI,
          functionName: "passedIntervalsCounter",
        })) as bigint;

        return {
          isActive: marketData[11] === 2,
          nexRaffleTime: BigInt(marketData[5]),
          nextIntervalDepositTime: BigInt(marketData[6]),
          totalParticipants: BigInt(marketData[2]),
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
        const activeIndicesLength = await this.publicClient.readContract({
          address: marketAddress as `0x${string}`,
          abi: kuriCoreABI,
          functionName: "getActiveIndicesLength",
        });

        let allPaid = true;
        for (let i = 1; i <= Number(state.totalParticipants); i++) {
          const hasPaid = await this.publicClient.readContract({
            address: marketAddress as `0x${string}`,
            abi: kuriCoreABI,
            functionName: "hasPaid",
            args: [`0x${i.toString(16)}`, state.currentInterval],
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
        logger.info(`Market ${market.marketAddress} is not active`);
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

      logger.info(`Initiating raffle for market: ${market.marketAddress}`);
      const { request } = await this.publicClient.simulateContract({
        address: market.marketAddress as `0x${string}`,
        abi: kuriCoreABI,
        functionName: "kuriNarukk",
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
