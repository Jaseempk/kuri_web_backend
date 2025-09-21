import { request, gql } from "graphql-request";
import { config } from "../config/config";
import {
  SubgraphResponse,
  KuriMarketDeployed,
  KuriInitialised,
  RaffleWinnerResponse,
  RaffleWinnerSelected,
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
          order_by: [{timestamp: desc}]
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

  async getRecentRaffleWinner(
    marketAddress: string,
    currentInterval: number
  ): Promise<RaffleWinnerSelected | null> {
    const query = gql`
      query RecentRaffleWinner($marketAddress: String!, $intervalIndex: BigInt!) {
        raffleWinnerSelecteds: KuriCore_RaffleWinnerSelected(
          where: { 
            contractAddress: { _ilike: $marketAddress }
            intervalIndex: { _eq: $intervalIndex }
          }
          order_by: { winnerTimestamp: desc }
          limit: 1
        ) {
          id
          intervalIndex
          winnerIndex
          winnerAddress
          winnerTimestamp
          requestId
          contractAddress
        }
      }
    `;

    try {
      const data = await request<RaffleWinnerResponse>(this.endpoint, query, {
        marketAddress,
        intervalIndex: currentInterval,
      });
      
      return data.raffleWinnerSelecteds.length > 0 
        ? data.raffleWinnerSelecteds[0] 
        : null;
    } catch (error) {
      logger.error("Failed to fetch raffle winner:", error);
      throw error;
    }
  }
}
