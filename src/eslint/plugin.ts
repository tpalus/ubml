/**
 * ESLint plugin definition for UBML.
 */

import { validUbmlRule } from './rules/valid-ubml.js';
import { VERSION } from '../constants.js';

/**
 * UBML ESLint plugin.
 */
export const plugin = {
  meta: {
    name: 'ubml',
    version: VERSION,
  },
  rules: {
    'valid-ubml': validUbmlRule,
  },
};

/**
 * Predefined configurations.
 */
export const configs = {
  /**
   * Recommended configuration for UBML files.
   */
  recommended: {
    plugins: {
      ubml: plugin,
    },
    rules: {
      'ubml/valid-ubml': 'error',
    },
  },
};
