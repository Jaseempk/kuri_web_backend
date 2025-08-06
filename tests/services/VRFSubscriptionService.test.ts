import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VRFSubscriptionService } from '../../src/services/VRFSubscriptionService';
import { SubgraphService } from '../../src/services/SubgraphService';
import { 
  mockMarketDeployed, 
  mockSubscriptionInfo, 
  mockLowBalanceSubscriptionInfo,
  mockTransactionReceipt 
} from '../mocks/testData';
import * as fs from 'fs';

// Access shared mock instances from global setup
const mockPublicClient = (global as any).__mockPublicClient;
const mockWalletClient = (global as any).__mockWalletClient;

// Create shared mock SubgraphService instance
const mockSubgraphService = {
  getActiveMarkets: jest.fn(),
} as any;

// Mock dependencies
jest.mock('../../src/services/SubgraphService', () => ({
  SubgraphService: jest.fn(() => mockSubgraphService),
}));
jest.mock('../../src/utils/logger');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('VRFSubscriptionService', () => {
  let vrfService: VRFSubscriptionService;

  beforeEach(() => {
    // Reset all mocks first
    jest.clearAllMocks();
    
    // Default file system behavior
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
    
    vrfService = new VRFSubscriptionService();
    
    // Clear mocks again to remove constructor calls but keep the setup
    jest.clearAllMocks();
    
    // Re-setup default file system behavior after clearing
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('processUnfundedSubscriptions', () => {
    it('should process unfunded subscriptions successfully', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123)) // s_subscriptionId
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo); // getSubscription (low balance)

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: '0x123', data: '0x456' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockSubgraphService.getActiveMarkets).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(2);
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should skip already funded subscriptions', async () => {
      // Arrange
      const fundedSubscriptionsData = JSON.stringify({
        fundedSubscriptions: ['123'],
        lastUpdated: new Date().toISOString(),
      });
      
      // Create a new service instance that will load the funded subscriptions
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(fundedSubscriptionsData);
      
      // Create a new VRF service instance to pick up the funded subscriptions
      const vrfServiceWithFundedSubs = new VRFSubscriptionService();

      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract.mockResolvedValueOnce(BigInt(123)); // s_subscriptionId

      // Act
      await vrfServiceWithFundedSubs.processUnfundedSubscriptions();

      // Assert
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(1); // Only s_subscriptionId call
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should skip subscriptions with sufficient balance', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123)) // s_subscriptionId
        .mockResolvedValueOnce(mockSubscriptionInfo); // getSubscription (sufficient balance)

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockSubgraphService.getActiveMarkets).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(2); // s_subscriptionId + getSubscription
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1); // Still saves as funded
    });

    it('should handle markets with zero subscription ID', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract.mockResolvedValueOnce(BigInt(0)); // s_subscriptionId = 0

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockSubgraphService.getActiveMarkets).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(1); // Only s_subscriptionId call
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should handle multiple markets with same subscription ID', async () => {
      // Arrange
      const market2 = { ...mockMarketDeployed, id: 'market-2', marketAddress: '0x' + '5'.repeat(40) };
      
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed, market2],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123)) // market 1 s_subscriptionId
        .mockResolvedValueOnce(BigInt(123)) // market 2 s_subscriptionId (same)
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo); // getSubscription

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: '0x123', data: '0x456' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockSubgraphService.getActiveMarkets).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(3); // 2 for subIds, 1 for balance
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1); // Only fund once
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1); // Save funded subscription
    });

    it('should handle contract read errors gracefully', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract.mockRejectedValueOnce(new Error('Contract call failed'));

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert - Should not throw and continue processing
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });
  });

  describe('funding logic', () => {
    it('should fund subscription with correct parameters', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123)) // s_subscriptionId
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo); // getSubscription

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: '0x123', data: '0x456' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockSubgraphService.getActiveMarkets).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(2);
      expect(mockPublicClient.simulateContract).toHaveBeenCalledWith({
        address: expect.any(String),
        abi: expect.any(Array),
        functionName: 'topUpSubscription',
        args: [BigInt('5000000000000000000'), BigInt(123)], // 5 LINK, subId 123
      });
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle funding transaction failure', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123))
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo);

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: '0x123', data: '0x456' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce({
        ...mockTransactionReceipt,
        status: 'reverted',
      });

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert - Should not save as funded if transaction failed
      const writeFileCall = (mockFs.writeFileSync as jest.Mock).mock.calls[0];
      expect(writeFileCall).toBeUndefined();
    });

    it('should handle simulation errors', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123))
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo);

      mockPublicClient.simulateContract.mockRejectedValueOnce(new Error('Simulation failed'));

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });
  });

  describe('storage management', () => {
    it('should load existing funded subscriptions on initialization', () => {
      // Arrange
      const existingData = {
        fundedSubscriptions: ['123', '456'],
        lastUpdated: '2024-01-01T00:00:00Z',
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingData));

      // Act
      const service = new VRFSubscriptionService();

      // Assert - Constructor should have loaded the data
      // (We can't directly test private properties, but we can test behavior)
      expect(mockFs.existsSync).toHaveBeenCalledTimes(1);
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle corrupted storage file', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      // Act & Assert - Should not throw
      expect(() => new VRFSubscriptionService()).not.toThrow();
    });

    it('should save funded subscriptions with correct format', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123))
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo);

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: '0x123', data: '0x456' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockSubgraphService.getActiveMarkets).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(2);
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('funded-subscriptions.json'),
        expect.stringContaining('\"fundedSubscriptions\":[\"123\"]')
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty markets list', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [],
        initialized: [],
      });

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockPublicClient.readContract).not.toHaveBeenCalled();
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should handle subgraph service errors', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockRejectedValueOnce(new Error('Subgraph error'));

      // Act & Assert - Should not throw
      await expect(vrfService.processUnfundedSubscriptions()).resolves.not.toThrow();
    });

    it('should handle VRF coordinator read errors', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123)) // s_subscriptionId
        .mockRejectedValueOnce(new Error('VRF Coordinator error')); // getSubscription fails

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });
  });
});