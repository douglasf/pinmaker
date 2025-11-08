import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generatePinPDF } from '../core/pdf-generator.js';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const TEST_OUTPUT_DIR = path.join(process.cwd(), 'test-output');
const TEST_IMAGE = path.join(process.cwd(), 'test-images', 'test1.png');

beforeAll(() => {
  // Create test output directory
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }
});

afterAll(() => {
  // Clean up test output directory
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
  }
});

async function getPageCount(pdfPath: string): Promise<number> {
  // Small delay to ensure file is fully written
  await new Promise(resolve => setTimeout(resolve, 100));
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}

describe('Pinmaker PDF Generation', () => {
  describe('Blank Templates (no images, no text)', () => {
    it('should generate 1 page with 20 circles for 32mm without -d', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'blank-32mm-no-dup.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 1 page with 20 circles for 32mm with -d', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'blank-32mm-dup.pdf');
      await generatePinPDF([], output, '32mm', false, true, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 1 page with 6 circles for 58mm without -d', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'blank-58mm-no-dup.pdf');
      await generatePinPDF([], output, '58mm', false, false, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 1 page with 6 circles for 58mm with -d', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'blank-58mm-dup.pdf');
      await generatePinPDF([], output, '58mm', false, true, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });
  });

  describe('Text-only pins (no images, with text)', () => {
    it('should generate 1 circle with single text without -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-single-32mm-no-dup.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [[{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with single text with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-single-32mm-dup.pdf');
      await generatePinPDF([], output, '32mm', false, true, '', '', 0, [[{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 2 circles with two texts without -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-double-32mm-no-dup.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [[{text: 'Clara'}], [{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with two texts distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-double-32mm-dup.pdf');
      await generatePinPDF([], output, '32mm', false, true, '', '', 0, [[{text: 'Clara'}], [{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 6 circles with single text with -d (58mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-single-58mm-dup.pdf');
      await generatePinPDF([], output, '58mm', false, true, '', '', 0, [[{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 6 circles with two texts distributed with -d (58mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-double-58mm-dup.pdf');
      await generatePinPDF([], output, '58mm', false, true, '', '', 0, [[{text: 'Clara'}], [{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });
  });

  describe('Image-only pins (with images, no text)', () => {
    it('should generate 1 circle with single image without -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-single-32mm-no-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with single image with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-single-32mm-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, true, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 2 circles with two images without -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-double-32mm-no-dup.pdf');
      const testImage2 = path.join(process.cwd(), 'test-images', 'test2.png');
      await generatePinPDF([TEST_IMAGE, testImage2], output, '32mm', false, false, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with two images distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-double-32mm-dup.pdf');
      const testImage2 = path.join(process.cwd(), 'test-images', 'test2.png');
      await generatePinPDF([TEST_IMAGE, testImage2], output, '32mm', false, true, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 6 circles with single image with -d (58mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-single-58mm-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '58mm', false, true, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });
  });

  describe('Images with text (combined)', () => {
    it('should generate 1 circle with image and text without -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-single-32mm-no-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, [[{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with image and single text distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-single-32mm-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, true, '', '', 0, [[{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 2 circles with image and two texts without -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-double-32mm-no-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, [[{text: 'Clara'}], [{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with image and two texts distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-double-32mm-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, true, '', '', 0, [[{text: 'Clara'}], [{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with two images and two texts distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-double-text-double-32mm-dup.pdf');
      const testImage2 = path.join(process.cwd(), 'test-images', 'test2.png');
      await generatePinPDF([TEST_IMAGE, testImage2], output, '32mm', false, true, '', '', 0, [[{text: 'Clara'}], [{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 6 circles with image and two texts distributed with -d (58mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-double-58mm-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '58mm', false, true, '', '', 0, [[{text: 'Clara'}], [{text: 'Douglas'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });
  });

  describe('Styling options', () => {
    it('should generate pins with background color', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'style-background.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, 'blue', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
    });

    it('should generate pins with border', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'style-border.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', 'green', 5, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
    });

    it('should generate pins with text at different positions', async () => {
      const outputTop = path.join(TEST_OUTPUT_DIR, 'style-text-top.pdf');
      const outputCenter = path.join(TEST_OUTPUT_DIR, 'style-text-center.pdf');
      const outputBottom = path.join(TEST_OUTPUT_DIR, 'style-text-bottom.pdf');
      
      await generatePinPDF([TEST_IMAGE], outputTop, '32mm', false, false, '', '', 0, [[{text: 'Test'}]], 'top', 'red', 30, 'black', 0);
      await generatePinPDF([TEST_IMAGE], outputCenter, '32mm', false, false, '', '', 0, [[{text: 'Test'}]], 'center', 'red', 30, 'black', 0);
      await generatePinPDF([TEST_IMAGE], outputBottom, '32mm', false, false, '', '', 0, [[{text: 'Test'}]], 'bottom', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(outputTop)).toBe(true);
      expect(fs.existsSync(outputCenter)).toBe(true);
      expect(fs.existsSync(outputBottom)).toBe(true);
    });

    it('should generate pins with text outline', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'style-text-outline.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, [[{text: 'Test'}]], 'center', 'white', 30, 'black', 3);
      
      expect(fs.existsSync(output)).toBe(true);
    });

    it('should generate pins with fill background', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'style-fill.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', true, false, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
    });
  });

  describe('Edge cases and multiple pages', () => {
    it('should generate multiple pages when images exceed circlesPerPage', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiple-pages.pdf');
      const images = Array(25).fill(TEST_IMAGE);
      await generatePinPDF(images, output, '32mm', false, false, '', '', 0, [], 'bottom', 'white', 0, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(2);
    });

    it('should handle more texts than default circles per page', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'many-texts-no-dup.pdf');
      const textPins = Array(25).fill([{text: 'Test'}]);
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, textPins, 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(2);
    });

    it('should distribute 3 texts evenly across 20 pins with -d', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'three-texts-distributed.pdf');
      await generatePinPDF([], output, '32mm', false, true, '', '', 0, [[{text: 'A'}], [{text: 'B'}], [{text: 'C'}]], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });
  });

  describe('Multi-line text features', () => {
    it('should generate pin with 2 lines of text (same size)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-two-lines.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [[{text: 'Line 1'}, {text: 'Line 2'}]], 'center', 'red', 20, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate pin with 3 lines of text (same size)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-three-lines.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [[{text: 'Line 1'}, {text: 'Line 2'}, {text: 'Line 3'}]], 'center', 'blue', 18, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate pin with 2 lines with different sizes', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-diff-sizes.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [[{text: 'Big', size: 30}, {text: 'Small', size: 12}]], 'center', 'red', 20, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate pin with 3 lines with mixed custom and default sizes', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-mixed-sizes.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [[{text: 'Custom', size: 25}, {text: 'Default'}, {text: 'Also Custom', size: 15}]], 'center', 'green', 20, 'black', 1);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate pin with multi-line text at top position', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-position-top.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, [[{text: 'Top Line 1'}, {text: 'Top Line 2'}]], 'top', 'white', 18, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate pin with multi-line text at bottom position', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-position-bottom.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, [[{text: 'Bottom Line 1'}, {text: 'Bottom Line 2'}]], 'bottom', 'yellow', 18, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate multiple pins with different multi-line texts', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-multiple-pins.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [
        [{text: 'Pin 1', size: 24}, {text: 'Line 2'}],
        [{text: 'Pin 2'}, {text: 'Has three', size: 16}, {text: 'Lines!'}]
      ], 'center', 'red', 20, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should distribute multi-line texts with -d flag', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-distributed.pdf');
      await generatePinPDF([], output, '32mm', false, true, '', '', 0, [
        [{text: 'First'}, {text: 'Pin'}],
        [{text: 'Second'}, {text: 'Pin'}]
      ], 'center', 'purple', 20, 'white', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1); // Should create 20 circles
    });

    it('should generate 58mm pin with multi-line text', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-58mm.pdf');
      await generatePinPDF([], output, '58mm', false, false, '', '', 0, [[{text: 'Large', size: 40}, {text: 'Pin', size: 30}, {text: 'Text'}]], 'center', 'red', 25, 'black', 1);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should combine multi-line text with image', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-with-image.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, [[{text: 'NAME', size: 22}, {text: 'Subtitle', size: 14}]], 'bottom', 'white', 18, 'black', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should handle very long multi-line text (5 lines)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-five-lines.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [[
        {text: 'Line 1', size: 16},
        {text: 'Line 2', size: 14},
        {text: 'Line 3', size: 12},
        {text: 'Line 4', size: 10},
        {text: 'Line 5', size: 8}
      ]], 'center', 'red', 14, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should auto-size multi-line text when size not specified', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'multiline-auto-size.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, [[{text: 'Auto'}, {text: 'Sized'}]], 'center', 'blue', 0, 'white', 2);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });
  });
});
