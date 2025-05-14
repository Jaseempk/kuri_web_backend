import { request, gql } from "graphql-request";
import { config } from "../config/config";
import {
  SubgraphResponse,
  KuriMarketDeployed,
  KuriInitialised,
} from "../types/types";
import { logger } from "../utils/logger";

export class SubgraphService {
  private endpoint: string;

  constructor() {
    this.endpoint = config.SUBGRAPH_URL;
  }

  async getActiveMarkets(): Promise<{
    deployed: KuriMarketDeployed[];
    initialized: KuriInitialised[];
  }> {
    const query = gql`
      query KuriMarkets {
        kuriMarketDeployeds(orderBy: timestamp, orderDirection: desc) {
          id
          caller
          marketAddress
          intervalType
          timestamp
          blockTimestamp
        }
        kuriInitialiseds {
          id
          _kuriData_creator
          _kuriData_kuriAmount
          _kuriData_totalParticipantsCount
          _kuriData_totalActiveParticipantsCount
          _kuriData_intervalDuration
          _kuriData_nexRaffleTime
          _kuriData_nextIntervalDepositTime
          _kuriData_launchPeriod
          _kuriData_startTime
          _kuriData_endTime
          _kuriData_intervalType
          _kuriData_state
        }
      }
    `;

    try {
      const data = await request<SubgraphResponse>(this.endpoint, query);
      return {
        deployed: data.kuriMarketDeployeds,
        initialized: data.kuriInitialiseds,
      };
    } catch (error) {
      logger.error("Failed to fetch active markets:", error);
      throw error;
    }
  }
}
