"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationService = void 0;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
const SubgraphService_1 = require("./SubgraphService");
const VRFSubscriptionService_1 = require("./VRFSubscriptionService");
const schedule = __importStar(require("node-schedule"));
const abi_1 = require("../config/abi");
// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TX_CONFIRMATION_BLOCKS = 2;
class AutomationService {
    constructor() {
        this.publicClient = (0, viem_1.createPublicClient)({
            chain: chains_1.baseSepolia,
            transport: (0, viem_1.http)(config_1.config.RPC_URL),
        });
        const account = (0, accounts_1.privateKeyToAccount)(config_1.config.PRIVATE_KEY);
        this.walletClient = (0, viem_1.createWalletClient)({
            account,
            chain: chains_1.baseSepolia,
            transport: (0, viem_1.http)(config_1.config.RPC_URL),
        });
        this.subgraphService = new SubgraphService_1.SubgraphService();
        this.vrfSubscriptionService = new VRFSubscriptionService_1.VRFSubscriptionService();
        this.pendingTransactions = new Map();
        // Schedule raffle checks every 5 minutes
        this.scheduleJob = schedule.scheduleJob("*/5 * * * *", () => {
            this.checkAndExecuteRaffles();
        });
        // Schedule VRF subscription checks every 2 hours
        schedule.scheduleJob("0 */2 * * *", () => {
            logger_1.logger.info("Starting scheduled VRF subscription check");
            this.vrfSubscriptionService.processUnsubscribedContracts();
        });
        // Start monitoring pending transactions
        this.startTransactionMonitoring();
    }
    async delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async retryWithBackoff(operation, retries = MAX_RETRIES, delayMs = RETRY_DELAY) {
        try {
            return await operation();
        }
        catch (error) {
            if (retries === 0)
                throw error;
            logger_1.logger.warn(`Operation failed, retrying in ${delayMs}ms...`, error);
            await this.delay(delayMs);
            return this.retryWithBackoff(operation, retries - 1, delayMs * 2);
        }
    }
    async monitorTransaction(hash, marketAddress) {
        try {
            const receipt = await this.publicClient.waitForTransactionReceipt({
                hash,
                confirmations: TX_CONFIRMATION_BLOCKS,
            });
            const status = this.pendingTransactions.get(hash);
            if (!status)
                return;
            if (receipt.status === "success") {
                logger_1.logger.info(`Transaction ${hash} confirmed for market ${marketAddress}`);
                this.pendingTransactions.set(hash, { ...status, status: "success" });
            }
            else {
                logger_1.logger.error(`Transaction ${hash} failed for market ${marketAddress}`);
                this.pendingTransactions.set(hash, { ...status, status: "failed" });
                // Retry failed transaction if under max retries
                if (status.retries < MAX_RETRIES) {
                    await this.retryRaffle(marketAddress, status);
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`Error monitoring transaction ${hash}:`, error);
        }
    }
    async startTransactionMonitoring() {
        setInterval(async () => {
            for (const [hash, status] of this.pendingTransactions.entries()) {
                if (status.status === "pending") {
                    try {
                        const receipt = await this.publicClient.getTransactionReceipt({
                            hash: hash,
                        });
                        if (receipt.status === "success") {
                            this.pendingTransactions.set(hash, {
                                ...status,
                                status: "success",
                            });
                        }
                        else if (receipt.status === "reverted") {
                            this.pendingTransactions.set(hash, {
                                ...status,
                                status: "failed",
                            });
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`Error checking transaction ${hash} status:`, error);
                    }
                }
            }
        }, 30000); // Check every 30 seconds
    }
    async retryRaffle(marketAddress, previousAttempt) {
        try {
            logger_1.logger.info(`Retrying raffle for market ${marketAddress}`);
            const { request } = await this.publicClient.simulateContract({
                address: marketAddress,
                abi: abi_1.kuriCoreABI,
                functionName: "kuriNarukk",
            });
            const hash = await this.walletClient.writeContract(request);
            this.pendingTransactions.set(hash, {
                hash,
                status: "pending",
                retries: previousAttempt.retries + 1,
            });
            this.monitorTransaction(hash, marketAddress);
            logger_1.logger.info(`Retry initiated for market ${marketAddress}, new tx: ${hash}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to retry raffle for market ${marketAddress}:`, error);
        }
    }
    async checkAndExecuteRaffles() {
        try {
            const { deployed, initialized } = await this.retryWithBackoff(() => this.subgraphService.getActiveMarkets());
            logger_1.logger.info(`Found ${deployed.length} deployed markets and ${initialized.length} initialized markets`);
            for (const market of deployed) {
                await this.processMarket(market);
            }
        }
        catch (error) {
            logger_1.logger.error("Error in checkAndExecuteRaffles:", error);
        }
    }
    async validateMarketState(market) {
        return this.retryWithBackoff(async () => {
            try {
                const marketData = (await this.publicClient.readContract({
                    address: market.marketAddress,
                    abi: abi_1.kuriCoreABI,
                    functionName: "kuriData",
                }));
                const currentInterval = (await this.publicClient.readContract({
                    address: market.marketAddress,
                    abi: abi_1.kuriCoreABI,
                    functionName: "passedIntervalsCounter",
                }));
                return {
                    isActive: marketData[11] === 2,
                    nexRaffleTime: BigInt(marketData[5]),
                    nextIntervalDepositTime: BigInt(marketData[6]),
                    totalParticipants: BigInt(marketData[2]),
                    currentInterval: currentInterval,
                };
            }
            catch (error) {
                logger_1.logger.error(`Failed to validate market state for ${market.marketAddress}:`, error);
                return null;
            }
        });
    }
    async verifyPayments(marketAddress, state) {
        return this.retryWithBackoff(async () => {
            try {
                const activeIndicesLength = await this.publicClient.readContract({
                    address: marketAddress,
                    abi: abi_1.kuriCoreABI,
                    functionName: "getActiveIndicesLength",
                });
                let allPaid = true;
                for (let i = 1; i <= Number(state.totalParticipants); i++) {
                    const hasPaid = await this.publicClient.readContract({
                        address: marketAddress,
                        abi: abi_1.kuriCoreABI,
                        functionName: "hasPaid",
                        args: [`0x${i.toString(16)}`, state.currentInterval],
                    });
                    if (!hasPaid) {
                        allPaid = false;
                        break;
                    }
                }
                return allPaid;
            }
            catch (error) {
                logger_1.logger.error(`Failed to verify payments for market ${marketAddress}:`, error);
                return false;
            }
        });
    }
    async processMarket(market) {
        try {
            const state = await this.validateMarketState(market);
            if (!state) {
                logger_1.logger.error(`Invalid market state for ${market.marketAddress}`);
                return;
            }
            if (!state.isActive) {
                logger_1.logger.info(`Market ${market.marketAddress} is not active`);
                return;
            }
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            if (currentTime < state.nexRaffleTime) {
                logger_1.logger.info(`Raffle time not reached for market ${market.marketAddress}`);
                return;
            }
            const paymentsVerified = await this.verifyPayments(market.marketAddress, state);
            if (!paymentsVerified) {
                logger_1.logger.warn(`Not all payments made for market ${market.marketAddress}`);
                return;
            }
            logger_1.logger.info(`Initiating raffle for market: ${market.marketAddress}`);
            const { request } = await this.publicClient.simulateContract({
                address: market.marketAddress,
                abi: abi_1.kuriCoreABI,
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
            logger_1.logger.info(`Raffle initiated for market ${market.marketAddress}, tx: ${hash}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to process market ${market.marketAddress}:`, error);
        }
    }
    stopScheduler() {
        if (this.scheduleJob) {
            this.scheduleJob.cancel();
        }
    }
    // Get pending transactions for monitoring
    getPendingTransactions() {
        return this.pendingTransactions;
    }
}
exports.AutomationService = AutomationService;
