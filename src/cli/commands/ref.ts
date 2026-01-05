/**
 * Quick reference commands for UBML CLI.
 *
 * Provides fast syntax lookups for terminal users.
 *
 * @module ubml/cli/commands/ref
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAllElementTypes,
  getElementTypeInfo,
  type ElementTypeInfo,
} from '../schema-introspection';
import { ID_PREFIXES } from '../../generated/metadata';

// =============================================================================
// Formatting Helpers
// =============================================================================

const INDENT = '  ';

function header(text: string): string {
  return chalk.bold.cyan(text);
}

function subheader(text: string): string {
  return chalk.bold.white(text);
}

function dim(text: string): string {
  return chalk.dim(text);
}

function highlight(text: string): string {
  return chalk.yellow(text);
}

function code(text: string): string {
  return chalk.cyan(text);
}

// =============================================================================
// Syntax Command
// =============================================================================

function showSyntax(elementType: string): void {
  const info = getElementTypeInfo(elementType);
  if (!info) {
    console.error(chalk.red(`Unknown element type: ${elementType}`));
    console.log();
    console.log('Available: step, actor, entity, process, hypothesis, scenario');
    process.exit(1);
  }
  
  console.log();
  console.log(header(`${info.type.charAt(0).toUpperCase() + info.type.slice(1)} Syntax`));
  console.log(dim('────────────────────────────────────────────────────────────'));
  console.log();
  
  for (const prop of info.properties) {
    const req = prop.required ? ' (required)' : '';
    const typeInfo = prop.enumValues 
      ? prop.enumValues.join(' | ')
      : prop.type;
    
    console.log(`  ${highlight(prop.name)}: ${typeInfo}${req}`);
    
    if (prop.examples && prop.examples.length > 0) {
      const ex = prop.examples[0];
      const exStr = typeof ex === 'string' ? `"${ex}"` : JSON.stringify(ex);
      console.log(`    ${dim('Example:')} ${exStr}`);
    }
  }
  
  console.log();
}

// =============================================================================
// Examples Command
// =============================================================================

function showExamples(typeOrProperty: string): void {
  // Parse: could be "duration" or "step.kind"
  const parts = typeOrProperty.split('.');
  const elementType = parts[0];
  const propName = parts[1];
  
  const info = getElementTypeInfo(elementType);
  if (!info) {
    console.error(chalk.red(`Unknown type: ${elementType}`));
    process.exit(1);
  }
  
  console.log();
  
  if (propName) {
    // Show examples for specific property
    const prop = info.properties.find(p => p.name === propName);
    if (!prop || !prop.examples) {
      console.log(`No examples found for ${typeOrProperty}`);
      return;
    }
    
    console.log(header(`${elementType}.${propName} Examples`));
    console.log(dim('────────────────────────────────────────────────────────────'));
    console.log();
    prop.examples.forEach(ex => {
      const str = typeof ex === 'string' ? `"${ex}"` : JSON.stringify(ex, null, 2);
      console.log(`  ${str}`);
    });
  } else {
    // Show all examples for element type
    console.log(header(`${info.type.charAt(0).toUpperCase() + info.type.slice(1)} Examples`));
    console.log(dim('────────────────────────────────────────────────────────────'));
    console.log();
    
    for (const prop of info.properties) {
      if (prop.examples && prop.examples.length > 0) {
        console.log(`  ${highlight(prop.name)}:`);
        prop.examples.slice(0, 2).forEach(ex => {
          const str = typeof ex === 'string' ? `"${ex}"` : JSON.stringify(ex);
          console.log(`    ${str}`);
        });
        console.log();
      }
    }
  }
  
  console.log();
}

// =============================================================================
// IDs Command
// =============================================================================

function showIdPatterns(): void {
  console.log();
  console.log(header('UBML ID Patterns'));
  console.log(dim('────────────────────────────────────────────────────────────'));
  console.log();
  console.log('Format: PREFIX + 3+ digits (e.g., AC001, ST010, EN100)');
  console.log();
  
  const prefixDescriptions: Record<string, string> = {
    AC: 'Actors (people, teams, systems)',
    ST: 'Steps in processes',
    PR: 'Processes',
    EN: 'Entities (data objects)',
    HY: 'Hypotheses',
    SC: 'Scenarios',
    MT: 'Metrics',
    KP: 'KPIs',
    CP: 'Capabilities',
    VS: 'Value Streams',
    SV: 'Services',
    PD: 'Products',
    PF: 'Portfolios',
    VW: 'Views',
    EQ: 'Equipment',
    LC: 'Locations',
    SK: 'Skills',
    RP: 'Resource Pools',
    PS: 'Personas',
    BK: 'Blocks',
    PH: 'Phases',
    DC: 'Documents',
    EV: 'Evidence',
  };
  
  // ID_PREFIXES is an object, get keys
  const prefixes = Object.keys(ID_PREFIXES);
  
  for (const prefix of prefixes) {
    const description = prefixDescriptions[prefix] || prefix;
    console.log(`  ${highlight(prefix + '###')}  - ${description}`);
  }
  
  console.log();
  console.log(dim('Best Practice: Use gaps of 10 for easy insertion'));
  console.log(dim('  ✓ AC010, AC020, AC030'));
  console.log(dim('  ✗ AC001, AC002, AC003'));
  console.log();
}

// =============================================================================
// Enums Command
// =============================================================================

function showAllEnums(): void {
  const elements = getAllElementTypes();
  
  console.log();
  console.log(header('UBML Enum Values'));
  console.log(dim('────────────────────────────────────────────────────────────'));
  console.log();
  
  for (const elem of elements) {
    const info = getElementTypeInfo(elem.type);
    if (!info) continue;
    
    const enumProps = info.properties.filter(p => p.enumValues);
    if (enumProps.length === 0) continue;
    
    console.log(subheader(info.type.charAt(0).toUpperCase() + info.type.slice(1)));
    for (const prop of enumProps) {
      console.log(`  ${highlight(prop.name)}:`);
      console.log(`    ${prop.enumValues!.join(', ')}`);
    }
    console.log();
  }
}

// =============================================================================
// Command Definitions
// =============================================================================

/**
 * Create the syntax command.
 */
export function syntaxCommand(): Command {
  const command = new Command('syntax');
  
  command
    .description('Show compact syntax reference for an element type')
    .argument('<element>', 'Element type (e.g., step, actor, entity)')
    .action(showSyntax);
  
  return command;
}

/**
 * Create the examples command.
 */
export function examplesCommand(): Command {
  const command = new Command('examples');
  
  command
    .description('Show examples for a type or property')
    .argument('<type>', 'Type or property (e.g., duration, step.kind)')
    .action(showExamples);
  
  return command;
}

/**
 * Create the ids command.
 */
export function idsCommand(): Command {
  const command = new Command('ids');
  
  command
    .description('Show ID pattern reference')
    .action(showIdPatterns);
  
  return command;
}

/**
 * Create the enums command.
 */
export function enumsCommand(): Command {
  const command = new Command('enums');
  
  command
    .description('Show all enum values')
    .action(showAllEnums);
  
  return command;
}
