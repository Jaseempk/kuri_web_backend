"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubgraphService = void 0;
const client_1 = require("@apollo/client");
const http_1 = require("@apollo/client/link/http");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
class SubgraphService {
    constructor() {
        this.client = new client_1.ApolloClient({
            link: new http_1.HttpLink({ uri: config_1.config.SUBGRAPH_URL, fetch: cross_fetch_1.default }),
            cache: new client_1.InMemoryCache(),
        });
    }
    async getActiveMarkets() {
        const query = (0, client_1.gql) `
      query GetActiveMarkets {
        kuriMarkets(where: { state: "ACTIVE" }) {
          id
          address
          state
          nexRaffleTime
        }
      }
    `;
        try {
            const { data } = await this.client.query({
                query,
            });
            return data.kuriMarkets;
        }
        catch (error) {
            logger_1.logger.error("Failed to fetch active markets:", error);
            throw error;
        }
    }
}
exports.SubgraphService = SubgraphService;
