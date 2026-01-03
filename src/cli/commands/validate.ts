/**
 * Validate command for UBML CLI.
 */

import { Command } from 'commander';
import { statSync } from 'fs';
import { resolve } from 'path';
import { validateFile, validateWorkspace } from '../../node/validator.js';
import { validateReferences } from '../../node/semantic-validator.js';
import { formatStylish } from '../formatters/stylish.js';
import { formatJson } from '../formatters/json.js';
import { formatSarif } from '../formatters/sarif.js';
import type { FormatterResult } from '../formatters/common.js';

export type OutputFormat = 'stylish' | 'json' | 'sarif';

export interface ValidateOptions {
  format: OutputFormat;
  strict: boolean;
  references: boolean;
  quiet: boolean;
}

/**
 * Create the validate command.
 */
export function validateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate UBML documents against schemas')
    .argument('<path>', 'File or directory to validate')
    .option('-f, --format <format>', 'Output format: stylish, json, sarif', 'stylish')
    .option('-s, --strict', 'Treat warnings as errors', false)
    .option('-r, --references', 'Validate cross-document references', true)
    .option('-q, --quiet', 'Only output errors', false)
    .action(async (path: string, options: ValidateOptions) => {
      const absolutePath = resolve(path);
      let isDirectory: boolean;

      try {
        isDirectory = statSync(absolutePath).isDirectory();
      } catch (err) {
        console.error(`Error: Path not found: ${absolutePath}`);
        process.exit(2);
      }

      // Validate
      const rawResult = isDirectory
        ? await validateWorkspace(absolutePath)
        : await validateFile(absolutePath);

      // Convert to unified format for formatters
      const result: FormatterResult = isDirectory
        ? {
            valid: (rawResult as Awaited<ReturnType<typeof validateWorkspace>>).valid,
            errors: (rawResult as Awaited<ReturnType<typeof validateWorkspace>>).files.flatMap(f => 
              f.errors.map(e => ({ ...e, filepath: f.path }))
            ),
            warnings: (rawResult as Awaited<ReturnType<typeof validateWorkspace>>).files.flatMap(f => 
              f.warnings.map(w => ({ ...w, filepath: f.path }))
            ),
            filesValidated: (rawResult as Awaited<ReturnType<typeof validateWorkspace>>).fileCount,
          }
        : {
            valid: (rawResult as Awaited<ReturnType<typeof validateFile>>).valid,
            errors: (rawResult as Awaited<ReturnType<typeof validateFile>>).errors,
            warnings: (rawResult as Awaited<ReturnType<typeof validateFile>>).warnings,
            filesValidated: 1,
          };

      // Validate references if enabled and validating a workspace
      if (options.references && isDirectory) {
        const refResult = await validateReferences(absolutePath);
        result.errors.push(...refResult.errors);
        result.warnings.push(...refResult.warnings);
        result.valid = result.valid && refResult.valid;
      }

      // Apply strict mode
      if (options.strict) {
        result.errors.push(
          ...result.warnings.map((w) => ({ ...w }))
        );
        result.warnings = [];
        result.valid = result.errors.length === 0;
      }

      // Format output
      let output: string;
      switch (options.format) {
        case 'json':
          output = formatJson(result);
          break;
        case 'sarif':
          output = formatSarif(result);
          break;
        case 'stylish':
        default:
          output = formatStylish(result, { quiet: options.quiet });
          break;
      }

      console.log(output);

      // Exit with appropriate code
      process.exit(result.valid ? 0 : 1);
    });

  return command;
}
