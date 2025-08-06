import { describe, it, expect } from '@jest/globals';
import { KuriMarketDeployed, KuriInitialised, SubgraphResponse } from '../../src/types/types';

describe('Type Definitions', () => {
  describe('KuriMarketDeployed', () => {
    it('should have correct structure', () => {
      const mockMarket: KuriMarketDeployed = {
        id: 'test-id',
        caller: '0x123',
        marketAddress: '0x456',
        intervalType: '0',
        timestamp: '1704067200',
        wannabeMember: true,
        circleCurrencyAddress: '0x789',
      };

      expect(mockMarket).toBeDefined();
      expect(typeof mockMarket.id).toBe('string');
      expect(typeof mockMarket.wannabeMember).toBe('boolean');
    });
  });

  describe('KuriInitialised', () => {
    it('should have correct structure with indexed data', () => {
      const mockInit: KuriInitialised = {
        id: 'test-id',
        _kuriData_0: '0x123', // creator
        _kuriData_1: '1000000', // kuriAmount
        _kuriData_2: '5', // totalParticipantsCount
        _kuriData_3: '5', // totalActiveParticipantsCount
        _kuriData_4: '604800', // intervalDuration
        _kuriData_5: '1704153600', // nexRaffleTime
        _kuriData_6: '1704067200', // nextIntervalDepositTime
        _kuriData_7: '1704067200', // launchPeriod
        _kuriData_8: '1704067200', // startTime
        _kuriData_9: '1706745600', // endTime
        _kuriData_10: '0', // intervalType
        _kuriData_11: '2', // state
        contractAddress: '0x456',
      };

      expect(mockInit).toBeDefined();
      expect(typeof mockInit._kuriData_0).toBe('string');
      expect(typeof mockInit.contractAddress).toBe('string');
    });
  });

  describe('SubgraphResponse', () => {
    it('should have correct structure', () => {
      const mockResponse: SubgraphResponse = {
        kuriMarketDeployeds: [],
        kuriInitialiseds: [],
      };

      expect(mockResponse).toBeDefined();
      expect(Array.isArray(mockResponse.kuriMarketDeployeds)).toBe(true);
      expect(Array.isArray(mockResponse.kuriInitialiseds)).toBe(true);
    });
  });
});