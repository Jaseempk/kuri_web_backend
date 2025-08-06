import { jest, describe, it, expect } from '@jest/globals';
import { logger } from '../../src/utils/logger';

describe('Logger', () => {
  it('should be defined and have required methods', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it('should handle logging without throwing errors', () => {
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.warn('Test warning message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });
});