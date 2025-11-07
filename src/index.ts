#!/usr/bin/env node

import { Command } from 'commander';
import { generatePinPDF } from './pdf-generator.js';
import { PinSize } from './types.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

// Helper function to collect multiple text values
function collectText(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

program
  .name('pinmaker')
  .description('Generate PDFs with images in circles for pin making')
  .version('1.0.0');

program
  .argument('[images...]', 'Input image files (omit to generate blank template)')
  .option('-s, --size <size>', 'Pin size: 32mm or 58mm', '32mm')
  .option('-o, --output <file>', 'Output PDF file', 'pins.pdf')
  .option('-f, --fill', 'Fill background with average edge color', false)
  .option('-d, --duplicate', 'Duplicate images to fill page (20 for 32mm, 6 for 58mm)', false)
  .option('--background-color <color>', 'Background color for pins (hex, rgb, or named color)', '')
  .option('--border-color <color>', 'Border color (hex, rgb, or named color)', '')
  .option('--border-width <mm>', 'Border width in mm, extending inward from pin edge', '0')
  .option('--text <string>', 'Text to display on pin (can be specified multiple times)', collectText, [])
  .option('--text-position <position>', 'Text position: top, center, bottom', 'bottom')
  .option('--text-color <color>', 'Text color', 'white')
  .option('--text-size <number>', 'Font size in points (auto-scale if not specified)', '0')
  .option('--text-outline <color>', 'Text outline color for better visibility', 'black')
  .option('--text-outline-width <number>', 'Text outline width in points', '2')
  .action(async (images: string[], options) => {
    try {
      // Validate pin size
      const pinSize = options.size as PinSize;
      if (pinSize !== '32mm' && pinSize !== '58mm') {
        console.error('Error: Size must be either 32mm or 58mm');
        process.exit(1);
      }
      
      // Validate image files exist (if any provided)
      if (images && images.length > 0) {
        const missingFiles: string[] = [];
        for (const imagePath of images) {
          if (!fs.existsSync(imagePath)) {
            missingFiles.push(imagePath);
          }
        }
        
        if (missingFiles.length > 0) {
          console.error('Error: The following image files do not exist:');
          missingFiles.forEach(f => console.error(`  - ${f}`));
          process.exit(1);
        }
      }
      
      // Resolve output path
      const outputPath = path.resolve(options.output);
      
      // Parse border width
      const borderWidth = parseFloat(options.borderWidth);
      if (isNaN(borderWidth) || borderWidth < 0) {
        console.error('Error: Border width must be a non-negative number');
        process.exit(1);
      }
      
      // Validate text position
      const validPositions = ['top', 'center', 'bottom'];
      if (!validPositions.includes(options.textPosition)) {
        console.error('Error: Text position must be one of: top, center, bottom');
        process.exit(1);
      }
      
      // Parse text size and outline width
      const textSize = parseFloat(options.textSize);
      const textOutlineWidth = parseFloat(options.textOutlineWidth);
      if (isNaN(textSize) || textSize < 0) {
        console.error('Error: Text size must be a non-negative number');
        process.exit(1);
      }
      if (isNaN(textOutlineWidth) || textOutlineWidth < 0) {
        console.error('Error: Text outline width must be a non-negative number');
        process.exit(1);
      }
      
      // Generate PDF
      console.log('\n🎨 Pin Maker PDF Generator\n');
      await generatePinPDF(
        images || [], 
        outputPath, 
        pinSize, 
        options.fill, 
        options.duplicate,
        options.backgroundColor,
        options.borderColor,
        borderWidth,
        options.text,
        options.textPosition,
        options.textColor,
        textSize,
        options.textOutline,
        textOutlineWidth
      );
      console.log('\n✨ Done!\n');
      
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
