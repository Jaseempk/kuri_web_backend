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
        kuriMarketDeployeds: KuriCoreFactory_KuriMarketDeployed(
          order_by: { timestamp: desc }
        ) {
          id
          caller
          marketAddress
          intervalType
          timestamp
          wannabeMember
          circleCurrencyAddress
        }
        kuriInitialiseds: KuriCore_KuriInitialised {
          id
          _kuriData_0
          _kuriData_1
          _kuriData_10
          _kuriData_11
          _kuriData_2
          _kuriData_3
          _kuriData_4
          _kuriData_5
          _kuriData_6
          _kuriData_7
          _kuriData_8
          _kuriData_9
          contractAddress
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
