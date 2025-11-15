#!/usr/bin/env node

/**
 * Main entry point for the Pinmaker CLI
 * Re-exports everything from the CLI module
 */
export * from './cli/index.js';

// If running as a script (not imported), import and run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  import('./cli/index.js');
}
