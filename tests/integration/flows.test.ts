import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AutomationService } from '../../src/services/AutomationService';
import { VRFSubscriptionService } from '../../src/services/VRFSubscriptionService';
import { SubgraphService } from '../../src/services/SubgraphService';
import { 
  mockMarketDeployed, 
  mockKuriData,
  mockTransactionReceipt,
  mockLowBalanceSubscriptionInfo,
  mockSubgraphResponse
} from '../mocks/testData';
import { KuriState } from '../../src/types/types';
import { mockPublicClient, mockWalletClient } from '../mocks/viemMocks';
import * as fs from 'fs';

// Mock all dependencies
jest.mock('../../src/services/SubgraphService');
jest.mock('../../src/utils/logger');
jest.mock('node-schedule');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Integration Tests - Complete Automation Flows', () => {
  let automationService: AutomationService;
  let vrfService: VRFSubscriptionService;
  let mockSubgraphService: jest.Mocked<SubgraphService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock current time
    jest.spyOn(Date, 'now').mockReturnValue(1704200000000);
    
    // Setup file system mocks
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
    
    // Initialize services
    automationService = new AutomationService();
    vrfService = new VRFSubscriptionService();
    mockSubgraphService = new SubgraphService() as jest.Mocked<SubgraphService>;
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('End-to-End Raffle Execution Flow', () => {
    it('should execute complete raffle flow successfully', async () => {
      // Arrange - Set up the complete flow
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      // Mock all contract calls for successful raffle
      mockPublicClient.readContract
        // Market state validation
        .mockResolvedValueOnce(mockKuriData) // kuriData
        .mockResolvedValueOnce(1) // passedIntervalsCounter
        // Payment verification for all 5 users
        .mockResolvedValueOnce('0x' + '1'.repeat(40)) // userIdToAddress(1)
        .mockResolvedValueOnce(true) // hasPaid(user1)
        .mockResolvedValueOnce('0x' + '2'.repeat(40)) // userIdToAddress(2)
        .mockResolvedValueOnce(true) // hasPaid(user2)
        .mockResolvedValueOnce('0x' + '3'.repeat(40)) // userIdToAddress(3)
        .mockResolvedValueOnce(true) // hasPaid(user3)
        .mockResolvedValueOnce('0x' + '4'.repeat(40)) // userIdToAddress(4)
        .mockResolvedValueOnce(true) // hasPaid(user4)
        .mockResolvedValueOnce('0x' + '5'.repeat(40)) // userIdToAddress(5)
        .mockResolvedValueOnce(true); // hasPaid(user5)

      // Mock transaction execution
      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: mockMarketDeployed.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xraffleHash');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert - Verify complete flow execution
      expect(mockSubgraphService.getActiveMarkets).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.readContract).toHaveBeenCalledTimes(12); // 2 for state + 10 for payment verification
      expect(mockPublicClient.simulateContract).toHaveBeenCalledWith({
        address: mockMarketDeployed.marketAddress,
        abi: expect.any(Array),
        functionName: 'kuriNarukk',
      });
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledTimes(1);

      // Verify transaction is tracked
      const pendingTransactions = automationService.getPendingTransactions();
      expect(pendingTransactions.has('0xraffleHash')).toBe(true);
      expect(pendingTransactions.get('0xraffleHash')?.status).toBe('success');
    });

    it('should handle mixed market conditions correctly', async () => {
      // Arrange - Multiple markets with different states
      const activeMarket = mockMarketDeployed;
      const inactiveMarket = { 
        ...mockMarketDeployed, 
        id: 'inactive-market', 
        marketAddress: '0x' + '3'.repeat(40) 
      };
      const unpaidMarket = { 
        ...mockMarketDeployed, 
        id: 'unpaid-market', 
        marketAddress: '0x' + '4'.repeat(40) 
      };

      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [activeMarket, inactiveMarket, unpaidMarket],
        initialized: [],
      });

      // Mock responses for different market states
      const inactiveKuriData = [...mockKuriData];
      inactiveKuriData[11] = KuriState.INLAUNCH; // INLAUNCH state

      mockPublicClient.readContract
        // Active market - should execute
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true)
        // Inactive market - should skip
        .mockResolvedValueOnce(inactiveKuriData).mockResolvedValueOnce(1)
        // Unpaid market - should skip
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(false); // User 2 hasn't paid

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: activeMarket.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash1');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert - Only active market should execute
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.simulateContract).toHaveBeenCalledTimes(1);
    });
  });

  describe('End-to-End VRF Subscription Funding Flow', () => {
    it('should execute complete funding flow successfully', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      // Mock contract calls for funding flow
      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123)) // s_subscriptionId
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo); // getSubscription (low balance)

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: '0x' + '2'.repeat(40), data: '0x456' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xfundingHash');
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
        args: [BigInt('5000000000000000000'), BigInt(123)],
      });
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple subscriptions with different funding needs', async () => {
      // Arrange
      const market1 = mockMarketDeployed;
      const market2 = { ...mockMarketDeployed, id: 'market-2', marketAddress: '0x' + '5'.repeat(40) };
      const market3 = { ...mockMarketDeployed, id: 'market-3', marketAddress: '0x' + '6'.repeat(40) };

      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [market1, market2, market3],
        initialized: [],
      });

      // Mock different subscription scenarios
      const sufficientBalanceInfo = [...mockLowBalanceSubscriptionInfo];
      sufficientBalanceInfo[0] = BigInt('5000000000000000000'); // 5 LINK (sufficient)

      mockPublicClient.readContract
        .mockResolvedValueOnce(BigInt(123)) // market1 subId - needs funding
        .mockResolvedValueOnce(BigInt(456)) // market2 subId - has sufficient balance
        .mockResolvedValueOnce(BigInt(123)) // market3 subId - same as market1
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo) // subId 123 - low balance
        .mockResolvedValueOnce(sufficientBalanceInfo); // subId 456 - sufficient balance

      // Only one funding transaction should happen (for subId 123)
      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: '0x' + '2'.repeat(40), data: '0x456' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xfundingHash');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await vrfService.processUnfundedSubscriptions();

      // Assert
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1); // Only one funding transaction
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2); // One for funding, one for sufficient balance
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue processing other markets when one fails', async () => {
      // Arrange
      const workingMarket = mockMarketDeployed;
      const failingMarket = { ...mockMarketDeployed, id: 'failing', marketAddress: '0x' + '7'.repeat(40) };

      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [failingMarket, workingMarket],
        initialized: [],
      });

      mockPublicClient.readContract
        // Failing market - contract call fails
        .mockRejectedValueOnce(new Error('Contract call failed'))
        // Working market - successful flow
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true);

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: workingMarket.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert - Working market should still execute despite failing market
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
    });

    it('should handle persistent storage errors gracefully', async () => {
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

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Mock file system error
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      // Act & Assert - Should not throw despite storage error
      await expect(vrfService.processUnfundedSubscriptions()).resolves.not.toThrow();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent raffle and funding operations', async () => {
      // This test simulates what would happen if both services run simultaneously
      
      // Arrange
      mockSubgraphService.getActiveMarkets
        .mockResolvedValueOnce({
          deployed: mockSubgraphResponse.kuriMarketDeployeds,
          initialized: mockSubgraphResponse.kuriInitialiseds,
        }) // For raffle service
        .mockResolvedValueOnce({
          deployed: mockSubgraphResponse.kuriMarketDeployeds,
          initialized: mockSubgraphResponse.kuriInitialiseds,
        }); // For funding service

      // Mock raffle flow
      mockPublicClient.readContract
        // Raffle flow
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true)
        // Funding flow
        .mockResolvedValueOnce(BigInt(123))
        .mockResolvedValueOnce(mockLowBalanceSubscriptionInfo);

      mockPublicClient.simulateContract
        .mockResolvedValueOnce({ request: { to: '0x1', data: '0x1' } }) // Raffle
        .mockResolvedValueOnce({ request: { to: '0x2', data: '0x2' } }); // Funding

      mockWalletClient.writeContract
        .mockResolvedValueOnce('0xraffleHash')
        .mockResolvedValueOnce('0xfundingHash');

      mockPublicClient.waitForTransactionReceipt
        .mockResolvedValueOnce(mockTransactionReceipt)
        .mockResolvedValueOnce(mockTransactionReceipt);

      // Act - Run both services concurrently
      await Promise.all([
        automationService.checkAndExecuteRaffles(),
        vrfService.processUnfundedSubscriptions(),
      ]);

      // Assert - Both operations should complete successfully
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(2);
      expect(automationService.getPendingTransactions().size).toBe(1);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent state across service restarts', async () => {
      // Arrange - Simulate existing funded subscriptions
      const existingData = {
        fundedSubscriptions: ['123', '456'],
        lastUpdated: '2024-01-01T00:00:00Z',
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(existingData));

      // Create new service instance (simulating restart)
      const newVrfService = new VRFSubscriptionService();

      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      // Mock subscription that's already funded
      mockPublicClient.readContract.mockResolvedValueOnce(BigInt(123));

      // Act
      await newVrfService.processUnfundedSubscriptions();

      // Assert - Should skip already funded subscription
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });
  });
});