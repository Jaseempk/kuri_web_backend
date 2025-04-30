import { ApolloClient, InMemoryCache, gql } from "@apollo/client";
import { HttpLink } from "@apollo/client/link/http";
import fetch from "cross-fetch";
import { config } from "../config/config";
import {
  SubgraphResponse,
  KuriMarketDeployed,
  KuriInitialised,
} from "../types/types";
import { logger } from "../utils/logger";

export class SubgraphService {
  private client;

  constructor() {
    this.client = new ApolloClient({
      link: new HttpLink({ uri: config.SUBGRAPH_URL, fetch }),
      cache: new InMemoryCache(),
    });
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
      const { data } = await this.client.query<SubgraphResponse>({
        query,
      });
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
