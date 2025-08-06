import { jest } from '@jest/globals';

// Mock viem clients with properly typed methods
export const mockPublicClient = {
  readContract: jest.fn<any>(),
  simulateContract: jest.fn<any>(), 
  waitForTransactionReceipt: jest.fn<any>(),
  getTransactionReceipt: jest.fn<any>(),
};

export const mockWalletClient = {
  writeContract: jest.fn<any>(),
};

// Mock viem functions
export const mockCreatePublicClient = jest.fn(() => mockPublicClient);
export const mockCreateWalletClient = jest.fn(() => mockWalletClient);
export const mockPrivateKeyToAccount = jest.fn(() => ({
  address: '0x' + '1'.repeat(40),
}));

// These mocks are already applied in setup.ts, so we just export the instances here
export default {
  mockPublicClient,
  mockWalletClient,
  mockCreatePublicClient,
  mockCreateWalletClient,
  mockPrivateKeyToAccount,
};