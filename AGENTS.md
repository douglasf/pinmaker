# Agent Guidelines for Pinmaker

## Build/Test Commands
- Build: `npm run build` (compiles TypeScript to `dist/`)
- Test all: `npm test` or `vitest run`
- Test single file: `vitest run src/pinmaker.test.ts`
- Watch mode: `npm run test:watch` or `vitest`
- Run CLI: `npm start` or `node dist/index.js`

## Code Style
- **TypeScript**: Strict mode enabled, ES2022 target, ESM modules
- **Imports**: Use `.js` extensions for local imports (e.g., `'./types.js'`)
- **Types**: Define interfaces in `types.ts`, export types explicitly
- **Naming**: camelCase for functions/variables, PascalCase for types/interfaces, UPPER_CASE for constants
- **Functions**: JSDoc comments for exported functions, async/await for promises
- **Error handling**: Check file existence before operations, provide clear error messages with `process.exit(1)`
- **Formatting**: 2-space indentation, semicolons required, single quotes for strings
- **CLI**: Use commander for argument parsing, console.log for user output with emoji prefixes (🎨, ✨, ✓, ❌)

## Architecture
- Entry point: `src/index.ts` (CLI with commander)
- PDF generation: `src/pdf-generator.ts` (PDFKit + Sharp)
- Layout calculations: `src/layout.ts`
- Type definitions: `src/types.ts`
