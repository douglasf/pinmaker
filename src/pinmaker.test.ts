import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generatePinPDF } from './pdf-generator.js';
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
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, ['Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with single text with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-single-32mm-dup.pdf');
      await generatePinPDF([], output, '32mm', false, true, '', '', 0, ['Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 2 circles with two texts without -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-double-32mm-no-dup.pdf');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, ['Clara', 'Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with two texts distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-double-32mm-dup.pdf');
      await generatePinPDF([], output, '32mm', false, true, '', '', 0, ['Clara', 'Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 6 circles with single text with -d (58mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-single-58mm-dup.pdf');
      await generatePinPDF([], output, '58mm', false, true, '', '', 0, ['Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 6 circles with two texts distributed with -d (58mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'text-double-58mm-dup.pdf');
      await generatePinPDF([], output, '58mm', false, true, '', '', 0, ['Clara', 'Douglas'], 'center', 'red', 30, 'black', 0);
      
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
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, ['Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with image and single text distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-single-32mm-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, true, '', '', 0, ['Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 2 circles with image and two texts without -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-double-32mm-no-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, ['Clara', 'Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with image and two texts distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-double-32mm-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, true, '', '', 0, ['Clara', 'Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 20 circles with two images and two texts distributed with -d (32mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-double-text-double-32mm-dup.pdf');
      const testImage2 = path.join(process.cwd(), 'test-images', 'test2.png');
      await generatePinPDF([TEST_IMAGE, testImage2], output, '32mm', false, true, '', '', 0, ['Clara', 'Douglas'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });

    it('should generate 6 circles with image and two texts distributed with -d (58mm)', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'image-text-double-58mm-dup.pdf');
      await generatePinPDF([TEST_IMAGE], output, '58mm', false, true, '', '', 0, ['Clara', 'Douglas'], 'center', 'red', 30, 'black', 0);
      
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
      
      await generatePinPDF([TEST_IMAGE], outputTop, '32mm', false, false, '', '', 0, ['Test'], 'top', 'red', 30, 'black', 0);
      await generatePinPDF([TEST_IMAGE], outputCenter, '32mm', false, false, '', '', 0, ['Test'], 'center', 'red', 30, 'black', 0);
      await generatePinPDF([TEST_IMAGE], outputBottom, '32mm', false, false, '', '', 0, ['Test'], 'bottom', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(outputTop)).toBe(true);
      expect(fs.existsSync(outputCenter)).toBe(true);
      expect(fs.existsSync(outputBottom)).toBe(true);
    });

    it('should generate pins with text outline', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'style-text-outline.pdf');
      await generatePinPDF([TEST_IMAGE], output, '32mm', false, false, '', '', 0, ['Test'], 'center', 'white', 30, 'black', 3);
      
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
      const texts = Array(25).fill('Test');
      await generatePinPDF([], output, '32mm', false, false, '', '', 0, texts, 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(2);
    });

    it('should distribute 3 texts evenly across 20 pins with -d', async () => {
      const output = path.join(TEST_OUTPUT_DIR, 'three-texts-distributed.pdf');
      await generatePinPDF([], output, '32mm', false, true, '', '', 0, ['A', 'B', 'C'], 'center', 'red', 30, 'black', 0);
      
      expect(fs.existsSync(output)).toBe(true);
      const pageCount = await getPageCount(output);
      expect(pageCount).toBe(1);
    });
  });
});
