import { Logger } from "winston";
import { logger } from "../utils/logger";
import { MonitoringService } from "./MonitoringService";
import fs from "fs/promises";
import path from "path";

interface ReportConfig {
  outputDir: string;
  retentionDays: number;
  reportTypes: ("daily" | "weekly" | "performance" | "incident")[];
}

interface MarketReport {
  marketAddress: string;
  timestamp: number;
  metrics: {
    successRate: number;
    averageGasUsage: string;
    averageConfirmationTime: number;
    totalTransactions: number;
    failedTransactions: number;
  };
  incidents: {
    timestamp: number;
    type: string;
    description: string;
  }[];
}

export class ReportingService {
  private readonly logger: Logger;
  private reportConfig: ReportConfig;
  private scheduledReports: Map<string, NodeJS.Timeout>;

  constructor(
    private readonly monitoringService: MonitoringService,
    config?: Partial<ReportConfig>
  ) {
    this.logger = logger;
    this.reportConfig = {
      outputDir: path.join(process.cwd(), "reports"),
      retentionDays: 30,
      reportTypes: ["daily", "weekly", "performance", "incident"],
      ...config,
    };
    this.scheduledReports = new Map();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Ensure report directory exists
      await fs.mkdir(this.reportConfig.outputDir, { recursive: true });

      // Schedule regular reports
      this.scheduleReports();

      // Start report cleanup job
      this.scheduleCleanup();
    } catch (error) {
      this.logger.error("Failed to initialize reporting service:", error);
    }
  }

  private scheduleReports(): void {
    // Schedule daily reports at midnight
    const dailyReport = setInterval(() => {
      this.generateDailyReport().catch((error) =>
        this.logger.error("Failed to generate daily report:", error)
      );
    }, 24 * 60 * 60 * 1000);
    this.scheduledReports.set("daily", dailyReport);

    // Schedule weekly reports on Sunday midnight
    const weeklyReport = setInterval(() => {
      const now = new Date();
      if (now.getDay() === 0) {
        // Sunday
        this.generateWeeklyReport().catch((error) =>
          this.logger.error("Failed to generate weekly report:", error)
        );
      }
    }, 24 * 60 * 60 * 1000);
    this.scheduledReports.set("weekly", weeklyReport);

    // Schedule performance reports every 6 hours
    const performanceReport = setInterval(() => {
      this.generatePerformanceReport().catch((error) =>
        this.logger.error("Failed to generate performance report:", error)
      );
    }, 6 * 60 * 60 * 1000);
    this.scheduledReports.set("performance", performanceReport);
  }

  private async generateDailyReport(): Promise<void> {
    const timestamp = Date.now();
    const date = new Date().toISOString().split("T")[0];
    const reportPath = path.join(
      this.reportConfig.outputDir,
      `daily-report-${date}.json`
    );

    const systemHealth = this.monitoringService.getSystemHealth();
    const markets = await this.getActiveMarkets();
    const marketReports: MarketReport[] = [];

    for (const marketAddress of markets) {
      const metrics = this.monitoringService.getMarketMetrics(marketAddress);
      const report = this.generateMarketReport(marketAddress, metrics);
      marketReports.push(report);
    }

    const report = {
      type: "daily",
      timestamp,
      systemHealth,
      markets: marketReports,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.logger.info(`Daily report generated: ${reportPath}`);
  }

  private async generateWeeklyReport(): Promise<void> {
    const timestamp = Date.now();
    const date = new Date().toISOString().split("T")[0];
    const reportPath = path.join(
      this.reportConfig.outputDir,
      `weekly-report-${date}.json`
    );

    // Get daily reports from the past week
    const dailyReports = await this.getRecentReports("daily", 7);

    const report = {
      type: "weekly",
      timestamp,
      summary: this.generateWeeklySummary(dailyReports),
      dailyReports,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.logger.info(`Weekly report generated: ${reportPath}`);
  }

  private async generatePerformanceReport(): Promise<void> {
    const timestamp = Date.now();
    const datetime = new Date().toISOString().replace(/:/g, "-");
    const reportPath = path.join(
      this.reportConfig.outputDir,
      `performance-report-${datetime}.json`
    );

    const systemHealth = this.monitoringService.getSystemHealth();
    const markets = await this.getActiveMarkets();
    const performanceMetrics = [];

    for (const marketAddress of markets) {
      const metrics = this.monitoringService.getMarketMetrics(marketAddress);
      const last6Hours = metrics.filter(
        (m) => timestamp - m.timestamp < 6 * 60 * 60 * 1000
      );

      if (last6Hours.length > 0) {
        const avgGasUsage =
          last6Hours.reduce((sum, m) => sum + m.gasUsage, BigInt(0)) /
          BigInt(last6Hours.length);
        const avgConfirmationTime =
          last6Hours.reduce((sum, m) => sum + m.confirmationTime, 0) /
          last6Hours.length;

        performanceMetrics.push({
          marketAddress,
          metrics: {
            averageGasUsage: avgGasUsage.toString(),
            averageConfirmationTime: avgConfirmationTime,
            transactionCount: last6Hours.length,
            successRate:
              last6Hours.filter((m) => m.success).length / last6Hours.length,
          },
        });
      }
    }

    const report = {
      type: "performance",
      timestamp,
      systemHealth,
      performanceMetrics,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.logger.info(`Performance report generated: ${reportPath}`);
  }

  public async generateIncidentReport(
    marketAddress: string,
    incident: {
      type: string;
      description: string;
      severity: "low" | "medium" | "high";
      timestamp?: number;
    }
  ): Promise<void> {
    const timestamp = incident.timestamp || Date.now();
    const datetime = new Date(timestamp).toISOString().replace(/:/g, "-");
    const reportPath = path.join(
      this.reportConfig.outputDir,
      `incident-report-${marketAddress}-${datetime}.json`
    );

    const systemHealth = this.monitoringService.getSystemHealth();
    const marketMetrics =
      this.monitoringService.getMarketMetrics(marketAddress);
    const recentMetrics = marketMetrics.filter(
      (m) => timestamp - m.timestamp < 60 * 60 * 1000
    );

    const report = {
      type: "incident",
      timestamp,
      marketAddress,
      incident: {
        ...incident,
        timestamp,
      },
      systemState: {
        health: systemHealth,
        recentMetrics,
      },
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.logger.info(`Incident report generated: ${reportPath}`);
  }

  private generateMarketReport(
    marketAddress: string,
    metrics: any[]
  ): MarketReport {
    const timestamp = Date.now();
    const dailyMetrics = metrics.filter(
      (m) => timestamp - m.timestamp < 24 * 60 * 60 * 1000
    );

    return {
      marketAddress,
      timestamp,
      metrics: {
        successRate:
          dailyMetrics.filter((m) => m.success).length / dailyMetrics.length,
        averageGasUsage: (
          dailyMetrics.reduce((sum, m) => sum + m.gasUsage, BigInt(0)) /
          BigInt(dailyMetrics.length)
        ).toString(),
        averageConfirmationTime:
          dailyMetrics.reduce((sum, m) => sum + m.confirmationTime, 0) /
          dailyMetrics.length,
        totalTransactions: dailyMetrics.length,
        failedTransactions: dailyMetrics.filter((m) => !m.success).length,
      },
      incidents: [], // To be populated from incident reports
    };
  }

  private generateWeeklySummary(dailyReports: any[]): any {
    // Aggregate daily metrics into weekly summary
    const summary = {
      totalTransactions: 0,
      successfulTransactions: 0,
      averageGasUsage: BigInt(0),
      averageConfirmationTime: 0,
      totalIncidents: 0,
      marketPerformance: new Map<string, any>(),
    };

    for (const report of dailyReports) {
      for (const market of report.markets) {
        summary.totalTransactions += market.metrics.totalTransactions;
        summary.successfulTransactions +=
          market.metrics.totalTransactions - market.metrics.failedTransactions;
        summary.averageGasUsage += BigInt(market.metrics.averageGasUsage);
        summary.averageConfirmationTime +=
          market.metrics.averageConfirmationTime;
        summary.totalIncidents += market.incidents.length;

        // Aggregate market-specific metrics
        if (!summary.marketPerformance.has(market.marketAddress)) {
          summary.marketPerformance.set(market.marketAddress, {
            totalTransactions: 0,
            successfulTransactions: 0,
            incidents: [],
          });
        }
        const marketStats = summary.marketPerformance.get(market.marketAddress);
        marketStats.totalTransactions += market.metrics.totalTransactions;
        marketStats.successfulTransactions +=
          market.metrics.totalTransactions - market.metrics.failedTransactions;
        marketStats.incidents.push(...market.incidents);
      }
    }

    // Calculate averages
    const reportCount = dailyReports.length;
    summary.averageGasUsage = summary.averageGasUsage / BigInt(reportCount);
    summary.averageConfirmationTime =
      summary.averageConfirmationTime / reportCount;

    return {
      ...summary,
      marketPerformance: Object.fromEntries(summary.marketPerformance),
    };
  }

  public async getRecentReports(
    type: "daily" | "weekly" | "performance" | "incident",
    days: number
  ): Promise<any[]> {
    const files = await fs.readdir(this.reportConfig.outputDir);
    const reports = [];
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith(`${type}-report-`)) {
        const filePath = path.join(this.reportConfig.outputDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const report = JSON.parse(content);

        if (report.timestamp > cutoffTime) {
          reports.push(report);
        }
      }
    }

    return reports.sort((a, b) => b.timestamp - a.timestamp);
  }

  private async getActiveMarkets(): Promise<string[]> {
    // This should be implemented to return a list of active market addresses
    // For now, returning an empty array as placeholder
    return [];
  }

  private async scheduleCleanup(): Promise<void> {
    setInterval(async () => {
      try {
        const files = await fs.readdir(this.reportConfig.outputDir);
        const cutoffTime =
          Date.now() - this.reportConfig.retentionDays * 24 * 60 * 60 * 1000;

        for (const file of files) {
          const filePath = path.join(this.reportConfig.outputDir, file);
          const stats = await fs.stat(filePath);

          if (stats.ctimeMs < cutoffTime) {
            await fs.unlink(filePath);
            this.logger.info(`Deleted old report: ${file}`);
          }
        }
      } catch (error) {
        this.logger.error("Failed to cleanup old reports:", error);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  public updateConfig(config: Partial<ReportConfig>): void {
    this.reportConfig = { ...this.reportConfig, ...config };
  }

  public async getReport(reportId: string): Promise<any> {
    const filePath = path.join(this.reportConfig.outputDir, reportId);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Failed to read report ${reportId}:`, error);
      throw new Error(`Report ${reportId} not found`);
    }
  }
}
