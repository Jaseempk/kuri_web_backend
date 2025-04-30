"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationService = void 0;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
const SubgraphService_1 = require("./SubgraphService");
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
];
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
    }
    async checkAndExecuteRaffles() {
        try {
            const activeMarkets = await this.subgraphService.getActiveMarkets();
            logger_1.logger.info(`Found ${activeMarkets.length} active markets`);
            for (const market of activeMarkets) {
                await this.processMarket(market);
            }
        }
        catch (error) {
            logger_1.logger.error("Error in checkAndExecuteRaffles:", error);
        }
    }
    async processMarket(market) {
        try {
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const nexRaffleTime = BigInt(market.nexRaffleTime);
            if (currentTime >= nexRaffleTime) {
                logger_1.logger.info(`Initiating raffle for market: ${market.address}`);
                const { request } = await this.publicClient.simulateContract({
                    address: market.address,
                    abi: kuriCoreABI,
                    functionName: "kuriNarukk",
                });
                const hash = await this.walletClient.writeContract(request);
                logger_1.logger.info(`Raffle initiated for market ${market.address}, tx: ${hash}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to process market ${market.address}:`, error);
        }
    }
}
exports.AutomationService = AutomationService;
