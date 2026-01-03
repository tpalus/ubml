/**
 * UBML Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION,
  DOCUMENT_TYPES,
  ID_PATTERNS,
  DURATION_PATTERN,
  validateId,
  detectDocumentType,
} from '../src/index';

describe('Schema Constants', () => {
  it('should have correct schema version', () => {
    expect(SCHEMA_VERSION).toBe('1.0');
  });

  it('should have all document types', () => {
    expect(DOCUMENT_TYPES).toContain('workspace');
    expect(DOCUMENT_TYPES).toContain('process');
    expect(DOCUMENT_TYPES).toContain('actors');
    expect(DOCUMENT_TYPES).toContain('entities');
    expect(DOCUMENT_TYPES).toContain('hypotheses');
    expect(DOCUMENT_TYPES.length).toBe(12);
  });
});

describe('ID Patterns', () => {
  it('should validate actor IDs', () => {
    expect(validateId('actor', 'AC001')).toBe(true);
    expect(validateId('actor', 'AC100')).toBe(true);
    expect(validateId('actor', 'AC1234')).toBe(true);
    expect(validateId('actor', 'AC01')).toBe(false);
    expect(validateId('actor', 'PR001')).toBe(false);
  });

  it('should validate process IDs', () => {
    expect(validateId('process', 'PR001')).toBe(true);
    expect(validateId('process', 'PR999')).toBe(true);
    expect(validateId('process', 'AC001')).toBe(false);
  });

  it('should validate step IDs', () => {
    expect(validateId('step', 'ST001')).toBe(true);
    expect(validateId('step', 'ST1234')).toBe(true);
    expect(validateId('step', 'ST01')).toBe(false);
  });

  it('should validate hypothesis IDs', () => {
    expect(validateId('hypothesis', 'HY001')).toBe(true);
    expect(validateId('hypothesis', 'HY100')).toBe(true);
    expect(validateId('hypothesis', 'HT001')).toBe(false);
  });
});

describe('Duration Pattern', () => {
  it('should match valid durations', () => {
    expect(DURATION_PATTERN.test('30min')).toBe(true);
    expect(DURATION_PATTERN.test('2h')).toBe(true);
    expect(DURATION_PATTERN.test('1.5d')).toBe(true);
    expect(DURATION_PATTERN.test('2wk')).toBe(true);
    expect(DURATION_PATTERN.test('3mo')).toBe(true);
  });

  it('should reject invalid durations', () => {
    expect(DURATION_PATTERN.test('2 hours')).toBe(false);
    expect(DURATION_PATTERN.test('2hrs')).toBe(false);
    expect(DURATION_PATTERN.test('minutes')).toBe(false);
  });
});

describe('Document Type Detection', () => {
  it('should detect workspace files', () => {
    expect(detectDocumentType('project.workspace.ubml.yaml')).toBe('workspace');
    expect(detectDocumentType('my-project.workspace.ubml.yml')).toBe('workspace');
  });

  it('should detect process files', () => {
    expect(detectDocumentType('onboarding.process.ubml.yaml')).toBe('process');
  });

  it('should detect actors files', () => {
    expect(detectDocumentType('organization.actors.ubml.yaml')).toBe('actors');
  });

  it('should detect hypotheses files', () => {
    expect(detectDocumentType('problem.hypotheses.ubml.yaml')).toBe('hypotheses');
  });

  it('should return undefined for unknown files', () => {
    expect(detectDocumentType('random.yaml')).toBe(undefined);
    expect(detectDocumentType('file.json')).toBe(undefined);
  });
});
