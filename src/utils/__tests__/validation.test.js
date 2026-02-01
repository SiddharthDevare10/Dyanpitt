/**
 * Tests for validation utility
 * Example test file - run with: npm test
 */

import { validateEmail, validatePhone, validateName } from '../validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    test('accepts valid email', () => {
      const result = validateEmail('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });

    test('rejects invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('rejects empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePhone', () => {
    test('accepts valid Indian mobile number', () => {
      const result = validatePhone('9876543210');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('+919876543210');
    });

    test('rejects invalid phone number', () => {
      const result = validatePhone('1234567890');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateName', () => {
    test('accepts valid name', () => {
      const result = validateName('John Doe');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('John Doe');
    });

    test('rejects too short name', () => {
      const result = validateName('J');
      expect(result.valid).toBe(false);
    });

    test('rejects name with numbers', () => {
      const result = validateName('John123');
      expect(result.valid).toBe(false);
    });
  });
});
