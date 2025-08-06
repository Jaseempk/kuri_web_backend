import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockSubgraphResponse } from '../mocks/testData';

// Import request from the mocked module
import * as graphqlRequest from 'graphql-request';

// Cast to get access to the mock
const mockRequest = (graphqlRequest.request as jest.MockedFunction<typeof graphqlRequest.request>);

// Import after mocking
import { SubgraphService } from '../../src/services/SubgraphService';

describe('SubgraphService', () => {
  let subgraphService: SubgraphService;

  beforeEach(() => {
    subgraphService = new SubgraphService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getActiveMarkets', () => {
    it('should successfully fetch active markets', async () => {
      // Arrange
      mockRequest.mockResolvedValueOnce(mockSubgraphResponse);

      // Act
      const result = await subgraphService.getActiveMarkets();

      // Assert
      expect(result).toEqual({
        deployed: mockSubgraphResponse.kuriMarketDeployeds,
        initialized: mockSubgraphResponse.kuriInitialiseds,
      });

      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it('should use correct GraphQL query structure for Envio indexer', async () => {
      // Arrange
      mockRequest.mockResolvedValueOnce(mockSubgraphResponse);

      // Act
      await subgraphService.getActiveMarkets();

      // Assert
      expect(mockRequest).toHaveBeenCalledTimes(1);
      
      const callArgs = mockRequest.mock.calls[0];
      expect(callArgs).toHaveLength(2);
      
      const [endpoint, query] = callArgs;
      expect(typeof query).toBe('string');
      
      // Check that the query uses the new Envio format
      expect(query).toContain('KuriCoreFactory_KuriMarketDeployed');
      expect(query).toContain('KuriCore_KuriInitialised');
      expect(query).toContain('order_by: { timestamp: desc }');
      expect(query).toContain('wannabeMember');
      expect(query).toContain('circleCurrencyAddress');
      expect(query).toContain('_kuriData_0');
      expect(query).toContain('_kuriData_11');
      expect(query).toContain('contractAddress');
    });

    it('should handle empty response', async () => {
      // Arrange
      const emptyResponse = {
        kuriMarketDeployeds: [],
        kuriInitialiseds: [],
      };
      mockRequest.mockResolvedValueOnce(emptyResponse);

      // Act
      const result = await subgraphService.getActiveMarkets();

      // Assert
      expect(result).toEqual({
        deployed: [],
        initialized: [],
      });
    });

    it('should handle GraphQL request errors', async () => {
      // Arrange
      const error = new Error('GraphQL request failed');
      mockRequest.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(subgraphService.getActiveMarkets()).rejects.toThrow('GraphQL request failed');
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Network timeout');
      mockRequest.mockRejectedValueOnce(timeoutError);

      // Act & Assert
      await expect(subgraphService.getActiveMarkets()).rejects.toThrow('Network timeout');
    });

    it('should handle malformed response data', async () => {
      // Arrange
      const malformedResponse = {} as any;
      mockRequest.mockResolvedValueOnce(malformedResponse);

      // Act
      const result = await subgraphService.getActiveMarkets();

      // Assert
      expect(result).toEqual({
        deployed: undefined,
        initialized: undefined,
      });
    });

    it('should use correct endpoint from config', async () => {
      // Arrange
      mockRequest.mockResolvedValueOnce(mockSubgraphResponse);

      // Act
      await subgraphService.getActiveMarkets();

      // Assert
      const [endpoint] = mockRequest.mock.calls[0] as [string, string];
      expect(endpoint).toBe('https://indexer.dev.hyperindex.xyz/009fddc/v1/graphql');
    });

    it('should handle partial data response', async () => {
      // Arrange
      const partialResponse = {
        kuriMarketDeployeds: mockSubgraphResponse.kuriMarketDeployeds,
        kuriInitialiseds: [], // Empty initialized markets
      };
      mockRequest.mockResolvedValueOnce(partialResponse);

      // Act
      const result = await subgraphService.getActiveMarkets();

      // Assert
      expect(result.deployed).toHaveLength(1);
      expect(result.initialized).toHaveLength(0);
    });

    it('should handle large datasets', async () => {
      // Arrange
      const largeResponse = {
        kuriMarketDeployeds: Array(100).fill(mockSubgraphResponse.kuriMarketDeployeds[0]),
        kuriInitialiseds: Array(100).fill(mockSubgraphResponse.kuriInitialiseds[0]),
      };
      mockRequest.mockResolvedValueOnce(largeResponse);

      // Act
      const result = await subgraphService.getActiveMarkets();

      // Assert
      expect(result.deployed).toHaveLength(100);
      expect(result.initialized).toHaveLength(100);
    });
  });

  describe('error handling and logging', () => {
    it('should log errors when request fails', async () => {
      // Arrange
      const error = new Error('Subgraph unavailable');
      mockRequest.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(subgraphService.getActiveMarkets()).rejects.toThrow('Subgraph unavailable');
    });

    it('should handle invalid JSON response', async () => {
      // Arrange
      const invalidJsonError = new Error('Unexpected token in JSON');
      mockRequest.mockRejectedValueOnce(invalidJsonError);

      // Act & Assert
      await expect(subgraphService.getActiveMarkets()).rejects.toThrow('Unexpected token in JSON');
    });
  });
});