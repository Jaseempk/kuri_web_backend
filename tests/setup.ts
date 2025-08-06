// Global test setup
import { jest } from '@jest/globals';

// Mock Winston logger globally
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(() => jest.fn()),
    timestamp: jest.fn(() => jest.fn()),
    printf: jest.fn(() => jest.fn()),
    colorize: jest.fn(() => jest.fn()),
    json: jest.fn(() => jest.fn()),
    simple: jest.fn(() => jest.fn()),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Mock file system operations
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock path operations  
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/')),
}));

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Create shared mock instances for viem clients
const mockPublicClient = {
  readContract: jest.fn(),
  simulateContract: jest.fn(), 
  waitForTransactionReceipt: jest.fn(),
  getTransactionReceipt: jest.fn(),
};

const mockWalletClient = {
  writeContract: jest.fn(),
};

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => mockPublicClient),
  createWalletClient: jest.fn(() => mockWalletClient),
  http: jest.fn(),
}));

jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn(() => ({
    address: '0x' + '1'.repeat(40),
  })),
}));

jest.mock('viem/chains', () => ({
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
  },
}));

// Export the shared mock instances so tests can access them
(global as any).__mockPublicClient = mockPublicClient;
(global as any).__mockWalletClient = mockWalletClient;

// Mock node-schedule
jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn(() => ({
    cancel: jest.fn(),
  })),
}));

// Mock graphql-request
jest.mock('graphql-request', () => ({
  request: jest.fn(),
  gql: (template: TemplateStringsArray, ...substitutions: any[]) => {
    // Handle template literal properly - this is not a jest.fn() but a regular function
    if (typeof template === 'string') {
      return template;
    }
    if (Array.isArray(template)) {
      let result = template[0] || '';
      for (let i = 0; i < substitutions.length; i++) {
        result += String(substitutions[i]) + (template[i + 1] || '');
      }
      return result;
    }
    return String(template);
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.RPC_URL = 'https://test-rpc.example.com';
process.env.PRIVATE_KEY = '0x' + '1'.repeat(64);
process.env.SUBGRAPH_URL = 'https://indexer.dev.hyperindex.xyz/009fddc/v1/graphql';
process.env.SUBSCRIPTION_MANAGER = '0x' + '2'.repeat(40);