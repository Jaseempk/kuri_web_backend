"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubgraphService = void 0;
const graphql_request_1 = require("graphql-request");
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
class SubgraphService {
    constructor() {
        this.endpoint = config_1.config.SUBGRAPH_URL;
    }
    async getActiveMarkets() {
        const query = (0, graphql_request_1.gql) `
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
            const data = await (0, graphql_request_1.request)(this.endpoint, query);
            return {
                deployed: data.kuriMarketDeployeds,
                initialized: data.kuriInitialiseds,
            };
        }
        catch (error) {
            logger_1.logger.error("Failed to fetch active markets:", error);
            throw error;
        }
    }
}
exports.SubgraphService = SubgraphService;
