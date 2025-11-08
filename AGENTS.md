# Agent Guidelines for Pinmaker

## Build/Test Commands
- Build: `npm run build` (compiles TypeScript to `dist/`)
- Test all: `npm test` or `vitest run`
- Test single file: `vitest run src/__tests__/pinmaker.test.ts`
- Watch mode: `npm run test:watch` or `vitest`
- Run CLI: `npm start` or `node dist/index.js`

## Code Style
- **TypeScript**: Strict mode enabled, ES2022 target, ESM modules
- **Imports**: Use `.js` extensions for local imports (e.g., `'../types/index.js'`)
- **Types**: Define interfaces in `src/types/index.ts`, export types explicitly
- **Naming**: camelCase for functions/variables, PascalCase for types/interfaces, UPPER_CASE for constants
- **Functions**: JSDoc comments for exported functions, async/await for promises
- **Error handling**: Check file existence before operations, provide clear error messages with `process.exit(1)`
- **Formatting**: 2-space indentation, semicolons required, single quotes for strings
- **CLI**: Use commander for argument parsing, console.log for user output with emoji prefixes (🎨, ✨, ✓, ❌)

## Architecture

### Directory Structure
```
src/
├── index.ts                  # Main entry point (re-exports from cli/)
├── cli/                      # CLI command-line interface
│   └── index.ts             # CLI entry point with argument parsing
├── core/                     # Core PDF generation logic
│   ├── pdf-generator.ts     # PDFKit + Sharp for PDF generation
│   └── layout.ts            # Layout calculation algorithms
├── interactive/              # Interactive TUI mode
│   └── index.ts             # Terminal UI with inquirer prompts
├── types/                    # TypeScript type definitions
│   └── index.ts             # All shared types and interfaces
└── __tests__/               # All test files
    ├── cli.test.ts          # CLI argument parsing tests
    ├── layout.test.ts       # Layout calculation tests
    ├── interactive.test.ts  # Interactive utility tests
    └── pinmaker.test.ts     # PDF generation integration tests
```

### Module Responsibilities
- **cli/**: Command-line argument parsing, main CLI entry point
- **core/**: PDF generation logic, layout calculations (business logic)
- **interactive/**: Terminal UI, image browsing, interactive configuration
- **types/**: Shared TypeScript interfaces, types, and constants
- **__tests__/**: All test files organized by module
