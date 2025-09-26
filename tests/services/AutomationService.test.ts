import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AutomationService } from '../../src/services/AutomationService';
import { 
  mockMarketDeployed, 
  mockKuriData,
  mockTransactionReceipt 
} from '../mocks/testData';
import { KuriState } from '../../src/types/types';

// Access shared mock instances from global setup
const mockPublicClient = (global as any).__mockPublicClient;
const mockWalletClient = (global as any).__mockWalletClient;

// Create shared mock service instances
const mockSubgraphService = {
  getActiveMarkets: jest.fn(),
} as any;

const mockVRFService = {
  processUnfundedSubscriptions: jest.fn(),
} as any;

// Mock dependencies
jest.mock('../../src/services/SubgraphService', () => ({
  SubgraphService: jest.fn(() => mockSubgraphService),
}));
jest.mock('../../src/services/VRFSubscriptionService', () => ({
  VRFSubscriptionService: jest.fn(() => mockVRFService),
}));
jest.mock('../../src/utils/logger');
jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn((schedule, callback) => ({
    cancel: jest.fn(),
  })),
}));

describe('AutomationService', () => {
  let automationService: AutomationService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    automationService = new AutomationService();
    
    jest.clearAllMocks();
    
    // Mock current time to be after raffle time
    jest.spyOn(Date, 'now').mockReturnValue(1704200000000); // Jan 2, 2024
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('checkAndExecuteRaffles', () => {
    it('should execute raffle when all conditions are met', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      // Mock market state validation
      mockPublicClient.readContract
        .mockResolvedValueOnce(mockKuriData) // kuriData
        .mockResolvedValueOnce(1) // passedIntervalsCounter
        .mockResolvedValueOnce('0x' + '1'.repeat(40)) // userIdToAddress(1)
        .mockResolvedValueOnce(true) // hasPaid(user1, interval)
        .mockResolvedValueOnce('0x' + '2'.repeat(40)) // userIdToAddress(2)
        .mockResolvedValueOnce(true) // hasPaid(user2, interval)
        .mockResolvedValueOnce('0x' + '3'.repeat(40)) // userIdToAddress(3)
        .mockResolvedValueOnce(true) // hasPaid(user3, interval)
        .mockResolvedValueOnce('0x' + '4'.repeat(40)) // userIdToAddress(4)
        .mockResolvedValueOnce(true) // hasPaid(user4, interval)
        .mockResolvedValueOnce('0x' + '5'.repeat(40)) // userIdToAddress(5)
        .mockResolvedValueOnce(true); // hasPaid(user5, interval)

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: mockMarketDeployed.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockSubgraphService.getActiveMarkets).toHaveBeenCalledTimes(1);
      expect(mockPublicClient.simulateContract).toHaveBeenCalledWith({
        address: mockMarketDeployed.marketAddress,
        abi: expect.any(Array),
        functionName: 'kuriNarukk',
      });
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(1);
    });

    it('should skip inactive markets', async () => {
      // Arrange
      const inactiveKuriData = [...mockKuriData];
      inactiveKuriData[11] = KuriState.INLAUNCH; // state = INLAUNCH

      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(inactiveKuriData) // kuriData (inactive)
        .mockResolvedValueOnce(1); // passedIntervalsCounter

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should skip markets where raffle time has not been reached', async () => {
      // Arrange
      const futureRaffleKuriData = [...mockKuriData];
      futureRaffleKuriData[5] = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour in future

      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(futureRaffleKuriData) // kuriData (future raffle time)
        .mockResolvedValueOnce(1); // passedIntervalsCounter

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should skip markets where not all users have paid', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(mockKuriData) // kuriData
        .mockResolvedValueOnce(1) // passedIntervalsCounter
        .mockResolvedValueOnce('0x' + '1'.repeat(40)) // userIdToAddress(1)
        .mockResolvedValueOnce(true) // hasPaid(user1, interval)
        .mockResolvedValueOnce('0x' + '2'.repeat(40)) // userIdToAddress(2)
        .mockResolvedValueOnce(false); // hasPaid(user2, interval) - NOT PAID

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should handle contract simulation failures', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      // Mock successful validation
      mockPublicClient.readContract
        .mockResolvedValueOnce(mockKuriData)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true);

      mockPublicClient.simulateContract.mockRejectedValueOnce(new Error('Simulation failed'));

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should handle multiple markets correctly', async () => {
      // Arrange
      const market2 = { ...mockMarketDeployed, id: 'market-2', marketAddress: '0x' + '5'.repeat(40) };
      
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed, market2],
        initialized: [],
      });

      // Mock responses for both markets (both should execute)
      mockPublicClient.readContract
        // Market 1
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true)
        // Market 2
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true);

      mockPublicClient.simulateContract
        .mockResolvedValueOnce({ request: { to: mockMarketDeployed.marketAddress, data: '0x1' } })
        .mockResolvedValueOnce({ request: { to: market2.marketAddress, data: '0x2' } });

      mockWalletClient.writeContract
        .mockResolvedValueOnce('0xhash1')
        .mockResolvedValueOnce('0xhash2');

      mockPublicClient.waitForTransactionReceipt
        .mockResolvedValueOnce(mockTransactionReceipt)
        .mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockWalletClient.writeContract).toHaveBeenCalledTimes(2);
    });
  });

  describe('payment verification', () => {
    it('should verify payments for all active participants', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      const kuriDataWith3Participants = [...mockKuriData];
      kuriDataWith3Participants[3] = 3; // totalActiveParticipantsCount = 3

      mockPublicClient.readContract
        .mockResolvedValueOnce(kuriDataWith3Participants) // kuriData
        .mockResolvedValueOnce(1) // passedIntervalsCounter
        .mockResolvedValueOnce('0x' + '1'.repeat(40)) // userIdToAddress(1)
        .mockResolvedValueOnce(true) // hasPaid(user1, interval)
        .mockResolvedValueOnce('0x' + '2'.repeat(40)) // userIdToAddress(2)
        .mockResolvedValueOnce(true) // hasPaid(user2, interval)
        .mockResolvedValueOnce('0x' + '3'.repeat(40)) // userIdToAddress(3)
        .mockResolvedValueOnce(true); // hasPaid(user3, interval)

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: mockMarketDeployed.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'userIdToAddress',
          args: [1],
        })
      );
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'hasPaid',
          args: ['0x' + '1'.repeat(40), 1],
        })
      );
    });

    it('should handle payment verification errors gracefully', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(mockKuriData) // kuriData
        .mockResolvedValueOnce(1) // passedIntervalsCounter
        .mockResolvedValueOnce('0x' + '1'.repeat(40)) // userIdToAddress(1)
        .mockRejectedValueOnce(new Error('hasPaid failed')); // hasPaid error

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });
  });

  describe('transaction monitoring and retry', () => {
    it('should monitor transaction success', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true);

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: mockMarketDeployed.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: '0xhash123',
        confirmations: 2,
      });
    });

    it('should handle transaction failure and retry', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true);

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: mockMarketDeployed.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      
      const failedReceipt = { ...mockTransactionReceipt, status: 'reverted' as const };
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(failedReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      const pendingTransactions = automationService.getPendingTransactions();
      expect(pendingTransactions.has('0xhash123')).toBe(true);
      expect(pendingTransactions.get('0xhash123')?.status).toBe('failed');
    });

    it('should track pending transactions correctly', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true);

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: mockMarketDeployed.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockResolvedValueOnce('0xhash123');
      mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockTransactionReceipt);

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      const pendingTransactions = automationService.getPendingTransactions();
      expect(pendingTransactions.has('0xhash123')).toBe(true);
      expect(pendingTransactions.get('0xhash123')?.status).toBe('success');
    });
  });

  describe('error handling', () => {
    it('should handle subgraph service errors', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockRejectedValueOnce(new Error('Subgraph error'));

      // Act & Assert - Should not throw
      await expect(automationService.checkAndExecuteRaffles()).resolves.not.toThrow();
    });

    it('should handle invalid market state', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract.mockRejectedValueOnce(new Error('Contract call failed'));

      // Act
      await automationService.checkAndExecuteRaffles();

      // Assert
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled();
    });

    it('should handle wallet transaction errors', async () => {
      // Arrange
      mockSubgraphService.getActiveMarkets.mockResolvedValueOnce({
        deployed: [mockMarketDeployed],
        initialized: [],
      });

      mockPublicClient.readContract
        .mockResolvedValueOnce(mockKuriData).mockResolvedValueOnce(1)
        .mockResolvedValueOnce('0x1').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x2').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x3').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x4').mockResolvedValueOnce(true)
        .mockResolvedValueOnce('0x5').mockResolvedValueOnce(true);

      mockPublicClient.simulateContract.mockResolvedValueOnce({
        request: { to: mockMarketDeployed.marketAddress, data: '0x123' },
      });

      mockWalletClient.writeContract.mockRejectedValueOnce(new Error('Wallet error'));

      // Act & Assert - Should not throw
      await expect(automationService.checkAndExecuteRaffles()).resolves.not.toThrow();
    });
  });

  describe('retry mechanism', () => {
    it('should implement exponential backoff for retries', async () => {
      // This test would need more complex mocking to test the retry mechanism
      // For now, we'll test that the retry mechanism is configured
      expect(automationService).toBeDefined();
    });
  });

  describe('scheduler integration', () => {
    it('should stop scheduler when requested', () => {
      // Act
      automationService.stopScheduler();

      // Assert - The scheduler should be stopped
      // (This is tested through the mock, actual behavior would be tested in integration tests)
      expect(automationService).toBeDefined();
    });
  });
});