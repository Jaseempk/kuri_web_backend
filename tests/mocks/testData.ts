import { KuriMarketDeployed, KuriInitialised, KuriState } from '../../src/types/types';

export const mockMarketDeployed: KuriMarketDeployed = {
  id: 'market-1',
  caller: '0x' + '1'.repeat(40),
  marketAddress: '0x' + '2'.repeat(40),
  intervalType: '0', // WEEK
  timestamp: '1704067200', // 2024-01-01
  wannabeMember: true,
  circleCurrencyAddress: '0x' + '3'.repeat(40),
};

export const mockKuriInitialised: KuriInitialised = {
  id: 'init-1',
  _kuriData_0: '0x' + '1'.repeat(40), // creator
  _kuriData_1: '1000000', // kuriAmount (1M wei)
  _kuriData_2: '5', // totalParticipantsCount
  _kuriData_3: '5', // totalActiveParticipantsCount
  _kuriData_4: '604800', // intervalDuration (7 days)
  _kuriData_5: '1704153600', // nexRaffleTime
  _kuriData_6: '1704067200', // nextIntervalDepositTime
  _kuriData_7: '1704067200', // launchPeriod
  _kuriData_8: '1704067200', // startTime
  _kuriData_9: '1706745600', // endTime
  _kuriData_10: '0', // intervalType (WEEK)
  _kuriData_11: KuriState.ACTIVE.toString(), // state (ACTIVE)
  contractAddress: '0x' + '2'.repeat(40),
};

export const mockKuriData = [
  '0x' + '1'.repeat(40), // creator
  BigInt('1000000'), // kuriAmount
  5, // totalParticipantsCount
  5, // totalActiveParticipantsCount
  604800, // intervalDuration
  BigInt('1704153600'), // nexRaffleTime
  BigInt('1704067200'), // nextIntervalDepositTime
  BigInt('1704067200'), // launchPeriod
  BigInt('1704067200'), // startTime
  BigInt('1706745600'), // endTime
  0, // intervalType
  KuriState.ACTIVE, // state (ACTIVE)
];

export const mockSubgraphResponse = {
  kuriMarketDeployeds: [mockMarketDeployed],
  kuriInitialiseds: [mockKuriInitialised],
};

export const mockTransactionReceipt = {
  status: 'success' as const,
  transactionHash: '0x' + 'a'.repeat(64),
  blockNumber: BigInt(12345),
  gasUsed: BigInt(21000),
};

export const mockSubscriptionInfo = [
  BigInt('5000000000000000000'), // balance (5 LINK)
  BigInt(10), // reqCount
  '0x' + '1'.repeat(40), // owner
  ['0x' + '2'.repeat(40)], // consumers
];

export const mockLowBalanceSubscriptionInfo = [
  BigInt('500000000000000000'), // balance (0.5 LINK - below minimum)
  BigInt(10), // reqCount
  '0x' + '1'.repeat(40), // owner
  ['0x' + '2'.repeat(40)], // consumers
];