import express, { Request, Response } from "express";
import { Logger } from "winston";
import { logger } from "../utils/logger";
import { MonitoringService } from "./MonitoringService";
import { ReportingService } from "./ReportingService";
import path from "path";
import WebSocket from "ws";
import http from "http";

interface DashboardConfig {
  port: number;
  updateInterval: number;
  maxDataPoints: number;
}

interface MetricDataPoint {
  timestamp: number;
  value: number | string;
}

interface MarketMetrics {
  gasUsage: MetricDataPoint[];
  confirmationTime: MetricDataPoint[];
  successRate: MetricDataPoint[];
  transactionCount: MetricDataPoint[];
}

export class DashboardService {
  private readonly logger: Logger;
  private readonly app: express.Application;
  private readonly server: http.Server;
  private readonly wss: WebSocket.Server;
  private readonly config: DashboardConfig;
  private marketMetrics: Map<string, MarketMetrics>;
  private clients: Set<WebSocket>;
  private updateInterval: NodeJS.Timeout | null;

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly reportingService: ReportingService,
    config?: Partial<DashboardConfig>
  ) {
    this.logger = logger;
    this.config = {
      port: 3000,
      updateInterval: 5000, // 5 seconds
      maxDataPoints: 100,
      ...config,
    };

    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.marketMetrics = new Map();
    this.clients = new Set();
    this.updateInterval = null;

    this.setupRoutes();
    this.setupWebSocket();
    this.initialize();
  }

  private setupRoutes(): void {
    // Serve static dashboard files
    this.app.use(express.static(path.join(__dirname, "../dashboard")));

    // API endpoints
    this.app.get("/api/health", (req: Request, res: Response) => {
      const health = this.monitoringService.getSystemHealth();
      res.json(health);
    });

    this.app.get("/api/markets", async (req: Request, res: Response) => {
      try {
        const markets = await this.getActiveMarkets();
        res.json(markets);
      } catch (error) {
        this.logger.error("Failed to fetch markets:", error);
        res.status(500).json({ error: "Failed to fetch markets" });
      }
    });

    this.app.get(
      "/api/market/:address/metrics",
      (req: Request, res: Response) => {
        const { address } = req.params;
        const metrics = this.marketMetrics.get(address);
        if (metrics) {
          res.json(metrics);
        } else {
          res.status(404).json({ error: "Market metrics not found" });
        }
      }
    );

    this.app.get("/api/reports/:type", async (req: Request, res: Response) => {
      try {
        const { type } = req.params;
        const { days = "7" } = req.query;
        const reports = await this.reportingService.getRecentReports(
          type as "daily" | "weekly" | "performance" | "incident",
          parseInt(days as string, 10)
        );
        res.json(reports);
      } catch (error) {
        this.logger.error("Failed to fetch reports:", error);
        res.status(500).json({ error: "Failed to fetch reports" });
      }
    });
  }

  private setupWebSocket(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          this.logger.error("Failed to handle WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      // Send initial data
      this.sendInitialData(ws);
    });
  }

  private async handleWebSocketMessage(
    ws: WebSocket,
    data: any
  ): Promise<void> {
    switch (data.type) {
      case "subscribe":
        if (data.market) {
          // Subscribe to specific market updates
          ws.send(
            JSON.stringify({
              type: "marketMetrics",
              market: data.market,
              data: this.marketMetrics.get(data.market),
            })
          );
        }
        break;

      case "getHealth":
        ws.send(
          JSON.stringify({
            type: "health",
            data: this.monitoringService.getSystemHealth(),
          })
        );
        break;

      default:
        this.logger.warn("Unknown WebSocket message type:", data.type);
    }
  }

  private async sendInitialData(ws: WebSocket): Promise<void> {
    try {
      const health = this.monitoringService.getSystemHealth();
      const markets = await this.getActiveMarkets();

      ws.send(
        JSON.stringify({
          type: "initial",
          data: {
            health,
            markets,
            metrics: Object.fromEntries(this.marketMetrics),
          },
        })
      );
    } catch (error) {
      this.logger.error("Failed to send initial data:", error);
    }
  }

  private async initialize(): Promise<void> {
    try {
      // Start the server
      this.server.listen(this.config.port, () => {
        this.logger.info(
          `Dashboard server listening on port ${this.config.port}`
        );
      });

      // Start periodic updates
      this.updateInterval = setInterval(
        () => this.updateMetrics(),
        this.config.updateInterval
      );

      // Initialize metrics for active markets
      const markets = await this.getActiveMarkets();
      for (const market of markets) {
        this.initializeMarketMetrics(market);
      }
    } catch (error) {
      this.logger.error("Failed to initialize dashboard service:", error);
    }
  }

  private initializeMarketMetrics(marketAddress: string): void {
    this.marketMetrics.set(marketAddress, {
      gasUsage: [],
      confirmationTime: [],
      successRate: [],
      transactionCount: [],
    });
  }

  private async updateMetrics(): Promise<void> {
    try {
      const markets = await this.getActiveMarkets();
      const timestamp = Date.now();

      for (const marketAddress of markets) {
        const metrics = this.monitoringService.getMarketMetrics(marketAddress);
        if (!metrics.length) continue;

        // Calculate current metrics
        const recentMetrics = metrics.filter(
          (m) => timestamp - m.timestamp < 300000
        ); // Last 5 minutes
        if (recentMetrics.length === 0) continue;

        const avgGasUsage =
          recentMetrics.reduce((sum, m) => sum + m.gasUsage, BigInt(0)) /
          BigInt(recentMetrics.length);
        const avgConfirmationTime =
          recentMetrics.reduce((sum, m) => sum + m.confirmationTime, 0) /
          recentMetrics.length;
        const successRate =
          recentMetrics.filter((m) => m.success).length / recentMetrics.length;

        // Update market metrics
        let marketMetrics = this.marketMetrics.get(marketAddress);
        if (!marketMetrics) {
          this.initializeMarketMetrics(marketAddress);
          marketMetrics = this.marketMetrics.get(marketAddress)!;
        }

        // Add new data points
        this.addMetricDataPoint(
          marketMetrics.gasUsage,
          timestamp,
          avgGasUsage.toString()
        );
        this.addMetricDataPoint(
          marketMetrics.confirmationTime,
          timestamp,
          avgConfirmationTime
        );
        this.addMetricDataPoint(
          marketMetrics.successRate,
          timestamp,
          successRate
        );
        this.addMetricDataPoint(
          marketMetrics.transactionCount,
          timestamp,
          recentMetrics.length
        );

        // Broadcast updates to connected clients
        this.broadcastMetricsUpdate(marketAddress, marketMetrics);
      }

      // Broadcast system health
      const health = this.monitoringService.getSystemHealth();
      this.broadcastHealthUpdate(health);
    } catch (error) {
      this.logger.error("Failed to update metrics:", error);
    }
  }

  private addMetricDataPoint(
    dataPoints: MetricDataPoint[],
    timestamp: number,
    value: number | string
  ): void {
    dataPoints.push({ timestamp, value });
    if (dataPoints.length > this.config.maxDataPoints) {
      dataPoints.shift();
    }
  }

  private broadcastMetricsUpdate(
    marketAddress: string,
    metrics: MarketMetrics
  ): void {
    const message = JSON.stringify({
      type: "metricsUpdate",
      market: marketAddress,
      data: metrics,
    });

    this.broadcast(message);
  }

  private broadcastHealthUpdate(health: any): void {
    const message = JSON.stringify({
      type: "healthUpdate",
      data: health,
    });

    this.broadcast(message);
  }

  private broadcast(message: string): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  private async getActiveMarkets(): Promise<string[]> {
    // This should be implemented to return a list of active market addresses
    // For now, returning an empty array as placeholder
    return [];
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.server.close(() => {
      this.logger.info("Dashboard server stopped");
    });

    for (const client of this.clients) {
      client.close();
    }
  }

  public updateConfig(config: Partial<DashboardConfig>): void {
    Object.assign(this.config, config);

    // Restart update interval with new configuration
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = setInterval(
        () => this.updateMetrics(),
        this.config.updateInterval
      );
    }
  }
}
