import { describe, it, expect } from 'vitest';
import { parseTextArguments } from './index.js';

describe('CLI Argument Parsing', () => {
  describe('parseTextArguments', () => {
    it('should parse single text argument', () => {
      const argv = ['--text', 'Hello'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([[{ text: 'Hello', size: undefined }]]);
      expect(consumedIndices.has(0)).toBe(true); // --text
      expect(consumedIndices.has(1)).toBe(true); // Hello
    });

    it('should parse text with size', () => {
      const argv = ['--text', 'Hello', '24'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([[{ text: 'Hello', size: 24 }]]);
      expect(consumedIndices.has(0)).toBe(true); // --text
      expect(consumedIndices.has(1)).toBe(true); // Hello
      expect(consumedIndices.has(2)).toBe(true); // 24
    });

    it('should parse multiple lines in single --text', () => {
      const argv = ['--text', 'Line 1', 'Line 2'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([[
        { text: 'Line 1', size: undefined },
        { text: 'Line 2', size: undefined }
      ]]);
      expect(consumedIndices.size).toBe(3);
    });

    it('should parse multiple lines with different sizes', () => {
      const argv = ['--text', 'Big', '30', 'Small', '12'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([[
        { text: 'Big', size: 30 },
        { text: 'Small', size: 12 }
      ]]);
      expect(consumedIndices.size).toBe(5);
    });

    it('should parse multiple --text flags', () => {
      const argv = ['--text', 'Pin 1', '--text', 'Pin 2'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([
        [{ text: 'Pin 1', size: undefined }],
        [{ text: 'Pin 2', size: undefined }]
      ]);
      expect(consumedIndices.has(0)).toBe(true); // --text
      expect(consumedIndices.has(1)).toBe(true); // Pin 1
      expect(consumedIndices.has(2)).toBe(true); // --text
      expect(consumedIndices.has(3)).toBe(true); // Pin 2
    });

    it('should handle --text with no arguments', () => {
      const argv = ['--text'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([]);
      expect(consumedIndices.has(0)).toBe(true); // --text
    });

    it('should stop parsing at other flags', () => {
      const argv = ['--text', 'Hello', '-o', 'output.pdf'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([[{ text: 'Hello', size: undefined }]]);
      expect(consumedIndices.has(0)).toBe(true); // --text
      expect(consumedIndices.has(1)).toBe(true); // Hello
      expect(consumedIndices.has(2)).toBe(false); // -o
      expect(consumedIndices.has(3)).toBe(false); // output.pdf
    });

    it('should handle complex multi-text scenario', () => {
      const argv = ['--text', 'Title', '24', 'Subtitle', '16', '--text', 'Another', '--size', '32mm'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([
        [
          { text: 'Title', size: 24 },
          { text: 'Subtitle', size: 16 }
        ],
        [{ text: 'Another', size: undefined }]
      ]);
      expect(consumedIndices.has(0)).toBe(true);  // --text
      expect(consumedIndices.has(1)).toBe(true);  // Title
      expect(consumedIndices.has(2)).toBe(true);  // 24
      expect(consumedIndices.has(3)).toBe(true);  // Subtitle
      expect(consumedIndices.has(4)).toBe(true);  // 16
      expect(consumedIndices.has(5)).toBe(true);  // --text
      expect(consumedIndices.has(6)).toBe(true);  // Another
      expect(consumedIndices.has(7)).toBe(false); // --size
      expect(consumedIndices.has(8)).toBe(false); // 32mm
    });

    it('should handle text that looks like a number', () => {
      const argv = ['--text', '2024'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([[{ text: '2024', size: undefined }]]);
    });

    it('should handle empty array', () => {
      const argv: string[] = [];
      const { textPins } = parseTextArguments(argv);
      
      expect(textPins).toEqual([]);
    });

    it('should handle argv with no --text flags', () => {
      const argv = ['-o', 'output.pdf', '-s', '32mm'];
      const { textPins } = parseTextArguments(argv);
      
      expect(textPins).toEqual([]);
    });

    it('should handle mixed size specifications', () => {
      const argv = ['--text', 'Line1', '20', 'Line2', 'Line3', '30'];
      const { textPins } = parseTextArguments(argv);
      
      expect(textPins).toEqual([[
        { text: 'Line1', size: 20 },
        { text: 'Line2', size: undefined },
        { text: 'Line3', size: 30 }
      ]]);
    });

    it('should handle decimal sizes', () => {
      const argv = ['--text', 'Text', '24.5'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      expect(textPins).toEqual([[{ text: 'Text', size: 24.5 }]]);
    });

    it('should not consume indices outside --text context', () => {
      const argv = ['image.png', '--text', 'Hello', 'image2.png'];
      const { textPins, consumedIndices } = parseTextArguments(argv);
      
      // After --text, all non-flag arguments are consumed as text until another flag is hit
      expect(textPins).toEqual([[
        { text: 'Hello', size: undefined },
        { text: 'image2.png', size: undefined }
      ]]);
      expect(consumedIndices.has(0)).toBe(false); // image.png (before --text)
      expect(consumedIndices.has(1)).toBe(true);  // --text
      expect(consumedIndices.has(2)).toBe(true);  // Hello
      expect(consumedIndices.has(3)).toBe(true);  // image2.png (consumed as text after --text)
    });
  });
});
