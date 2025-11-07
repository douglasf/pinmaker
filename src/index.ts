#!/usr/bin/env node

import { Command } from 'commander';
import { generatePinPDF } from './pdf-generator.js';
import { PinSize } from './types.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

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
  .option('--border-color <color>', 'Border color (hex, rgb, or named color)', '')
  .option('--border-width <mm>', 'Border width in mm, extending inward from pin edge', '0')
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
      
      // Generate PDF
      console.log('\n🎨 Pin Maker PDF Generator\n');
      await generatePinPDF(
        images || [], 
        outputPath, 
        pinSize, 
        options.fill, 
        options.duplicate,
        options.borderColor,
        borderWidth
      );
      console.log('\n✨ Done!\n');
      
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
