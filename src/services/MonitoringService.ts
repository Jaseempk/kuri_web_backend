import { Logger } from "winston";
import { PublicClient } from "viem";
import { logger } from "../utils/logger";

interface PerformanceMetrics {
  gasUsage: bigint;
  confirmationTime: number;
  timestamp: number;
  success: boolean;
  marketAddress: string;
  operationType: "raffle" | "payment" | "validation";
}

interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  lastUpdateTime: number;
  nodeStatus: "healthy" | "degraded" | "error";
  networkLatency: number;
}

interface AlertConfig {
  gasThreshold: bigint;
  errorRateThreshold: number;
  responseTimeThreshold: number;
  networkLatencyThreshold: number;
}

export class MonitoringService {
  private metrics: Map<string, PerformanceMetrics[]>;
  private systemHealth: SystemHealth;
  private alertConfig: AlertConfig;
  private readonly logger: Logger;
  private alertCallbacks: ((
    message: string,
    severity: "info" | "warning" | "error"
  ) => void)[];

  constructor(private readonly publicClient: PublicClient) {
    this.metrics = new Map();
    this.systemHealth = {
      cpuUsage: 0,
      memoryUsage: 0,
      lastUpdateTime: Date.now(),
      nodeStatus: "healthy",
      networkLatency: 0,
    };
    this.alertConfig = {
      gasThreshold: BigInt(500000), // 500k gas units
      errorRateThreshold: 0.1, // 10% error rate
      responseTimeThreshold: 5000, // 5 seconds
      networkLatencyThreshold: 1000, // 1 second
    };
    this.logger = logger;
    this.alertCallbacks = [];
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Start periodic health checks
    setInterval(() => this.updateSystemHealth(), 60000); // Every minute
    setInterval(() => this.analyzeMetrics(), 300000); // Every 5 minutes
    setInterval(() => this.cleanupOldMetrics(), 86400000); // Every 24 hours
  }

  public async recordTransactionMetrics(
    txHash: `0x${string}`,
    marketAddress: string,
    operationType: "raffle" | "payment" | "validation"
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      const confirmationTime = Date.now() - startTime;

      const metrics: PerformanceMetrics = {
        gasUsage: receipt.gasUsed,
        confirmationTime,
        timestamp: Date.now(),
        success: receipt.status === "success",
        marketAddress,
        operationType,
      };

      const marketMetrics = this.metrics.get(marketAddress) || [];
      marketMetrics.push(metrics);
      this.metrics.set(marketAddress, marketMetrics);

      // Check for alerts
      this.checkMetricsThresholds(metrics);
    } catch (error) {
      this.logger.error("Error recording transaction metrics:", error);
      this.triggerAlert("Failed to record transaction metrics", "error");
    }
  }

  private async updateSystemHealth(): Promise<void> {
    try {
      // Measure network latency
      const startTime = Date.now();
      await this.publicClient.getBlockNumber();
      const networkLatency = Date.now() - startTime;

      // Update system health metrics
      this.systemHealth = {
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
        lastUpdateTime: Date.now(),
        nodeStatus: this.determineNodeStatus(networkLatency),
        networkLatency,
      };

      this.logger.info("System health updated:", this.systemHealth);
    } catch (error) {
      this.logger.error("Error updating system health:", error);
      this.triggerAlert("System health update failed", "error");
    }
  }

  private determineNodeStatus(
    networkLatency: number
  ): "healthy" | "degraded" | "error" {
    if (networkLatency > this.alertConfig.networkLatencyThreshold * 2) {
      return "error";
    } else if (networkLatency > this.alertConfig.networkLatencyThreshold) {
      return "degraded";
    }
    return "healthy";
  }

  private analyzeMetrics(): void {
    for (const [marketAddress, marketMetrics] of this.metrics.entries()) {
      const recentMetrics = marketMetrics.filter(
        (m) => Date.now() - m.timestamp < 3600000 // Last hour
      );

      if (recentMetrics.length === 0) continue;

      // Calculate success rate
      const successRate =
        recentMetrics.filter((m) => m.success).length / recentMetrics.length;
      const avgConfirmationTime =
        recentMetrics.reduce((sum, m) => sum + m.confirmationTime, 0) /
        recentMetrics.length;
      const avgGasUsage =
        recentMetrics.reduce((sum, m) => sum + m.gasUsage, BigInt(0)) /
        BigInt(recentMetrics.length);

      this.logger.info("Market metrics analysis:", {
        marketAddress,
        successRate,
        avgConfirmationTime,
        avgGasUsage: avgGasUsage.toString(),
        metricsCount: recentMetrics.length,
      });

      // Check for concerning patterns
      if (successRate < 1 - this.alertConfig.errorRateThreshold) {
        this.triggerAlert(
          `High failure rate detected for market ${marketAddress}: ${
            (1 - successRate) * 100
          }%`,
          "warning"
        );
      }
    }
  }

  private cleanupOldMetrics(): void {
    const retentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    for (const [marketAddress, marketMetrics] of this.metrics.entries()) {
      const filteredMetrics = marketMetrics.filter(
        (m) => Date.now() - m.timestamp < retentionPeriod
      );
      this.metrics.set(marketAddress, filteredMetrics);
    }
  }

  private checkMetricsThresholds(metrics: PerformanceMetrics): void {
    if (metrics.gasUsage > this.alertConfig.gasThreshold) {
      this.triggerAlert(
        `High gas usage detected for ${metrics.operationType} in market ${metrics.marketAddress}`,
        "warning"
      );
    }

    if (metrics.confirmationTime > this.alertConfig.responseTimeThreshold) {
      this.triggerAlert(
        `Slow transaction confirmation for ${metrics.operationType} in market ${metrics.marketAddress}`,
        "warning"
      );
    }
  }

  public registerAlertCallback(
    callback: (message: string, severity: "info" | "warning" | "error") => void
  ): void {
    this.alertCallbacks.push(callback);
  }

  private triggerAlert(
    message: string,
    severity: "info" | "warning" | "error"
  ): void {
    this.logger.log(severity, message);
    this.alertCallbacks.forEach((callback) => callback(message, severity));
  }

  public getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  public getMarketMetrics(marketAddress: string): PerformanceMetrics[] {
    return this.metrics.get(marketAddress) || [];
  }

  public updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }
}
