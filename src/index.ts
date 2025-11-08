#!/usr/bin/env node

import { Command } from 'commander';
import { generatePinPDF } from './pdf-generator.js';
import { PinSize, TextPin } from './types.js';
import { runInteractiveMode } from './interactive.js';
import fs from 'fs';
import path from 'path';

/**
 * Parse --text arguments with optional sizes.
 * Format: --text "string1" [size1] "string2" [size2] --text "string3"
 * Each --text flag creates one TextPin (array of lines).
 * Returns both parsed pins and indices of consumed arguments.
 */
function parseTextArguments(argv: string[]): { textPins: TextPin[], consumedIndices: Set<number> } {
  const textPins: TextPin[] = [];
  const consumedIndices = new Set<number>();
  let currentPin: TextPin | null = null;
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '--text') {
      consumedIndices.add(i);
      // Save previous pin if it exists
      if (currentPin && currentPin.length > 0) {
        textPins.push(currentPin);
      }
      // Start a new pin
      currentPin = [];
      continue;
    }
    
    // If we're currently building a pin and hit another flag, save and stop
    if (currentPin !== null && arg.startsWith('-')) {
      if (currentPin.length > 0) {
        textPins.push(currentPin);
      }
      currentPin = null;
      continue;
    }
    
    // If we're building a pin, check if this is a string or number
    if (currentPin !== null) {
      consumedIndices.add(i);
      // Check if it's a number (size for previous line)
      const asNumber = parseFloat(arg);
      if (!isNaN(asNumber) && currentPin.length > 0) {
        // Update the size of the last line we added
        currentPin[currentPin.length - 1].size = asNumber;
      } else {
        // It's a text string, add a new line
        currentPin.push({ text: arg, size: undefined });
      }
    }
  }
  
  // Don't forget the last pin if it exists
  if (currentPin && currentPin.length > 0) {
    textPins.push(currentPin);
  }
  
  return { textPins, consumedIndices };
}

// Check if running in interactive mode (no arguments except possibly node and script path)
const isInteractiveMode = process.argv.length === 2 || 
  (process.argv.length === 3 && process.argv[2] === 'interactive');

if (isInteractiveMode) {
  // Run interactive mode
  (async () => {
    try {
      const config = await runInteractiveMode();
      
      // Generate PDF with the config from interactive mode
      await generatePinPDF(
        config.images,
        path.resolve(config.output),
        config.size,
        config.fillWithEdgeColor,
        config.duplicate,
        config.backgroundColor,
        config.borderColor,
        config.borderWidth,
        config.textPins,
        config.textPosition,
        config.textColor,
        config.textSize,
        config.textOutline,
        config.textOutlineWidth
      );
      
      console.log('\n✨ Done!\n');
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  })();
} else {
  // Run CLI mode with commander
  const program = new Command();

  program
    .name('pinmaker')
    .description('Generate PDFs with images in circles for pin making')
    .version('1.0.0');

  program
    .argument('[images...]', 'Input image files (omit to generate blank template)')
    .option('-s, --size <size>', 'Pin size: 32mm or 58mm', '32mm')
    .option('-o, --output <file>', 'Output PDF file', 'pins.pdf')
    .option('-d, --duplicate', 'Duplicate images to fill page (20 for 32mm, 6 for 58mm)', false)
    .option('--background-color [color]', 'Background color for pins (hex, rgb, or named color). If no color specified, uses average edge color from image')
    .option('--border-color <color>', 'Border color (hex, rgb, or named color)', '')
    .option('--border-width <mm>', 'Border width in mm, extending inward from pin edge', '0')
    .option('--text-position <position>', 'Text position: top, center, bottom', 'bottom')
    .option('--text-color <color>', 'Text color', 'white')
    .option('--text-size <number>', 'Default font size in points (auto-scale if not specified)', '0')
    .option('--text-outline <color>', 'Text outline color for better visibility', 'black')
    .option('--text-outline-width <number>', 'Text outline width in points', '2')
    .allowUnknownOption() // Allow --text to be parsed manually
    .action(async (images: string[], options) => {
    try {
      // Parse --text arguments manually from process.argv
      const { textPins, consumedIndices } = parseTextArguments(process.argv.slice(2));
      
      // Filter out --text and its arguments from images array
      // Commander incorrectly captures them as image arguments
      const processedArgs = process.argv.slice(2);
      const filteredImages = images.filter((img, idx) => {
        // Find the actual index in process.argv
        // We need to account for the fact that commander may have reordered things
        const argIndex = processedArgs.indexOf(img);
        return argIndex === -1 || !consumedIndices.has(argIndex);
      });
      
      // Validate pin size
      const pinSize = options.size as PinSize;
      if (pinSize !== '32mm' && pinSize !== '58mm') {
        console.error('Error: Size must be either 32mm or 58mm');
        process.exit(1);
      }
      
      // Validate image files exist (if any provided)
      if (filteredImages && filteredImages.length > 0) {
        const missingFiles: string[] = [];
        for (const imagePath of filteredImages) {
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
      
      // Determine if we should fill with edge color
      // If --background-color is provided without a value, it will be true
      // If --background-color has a value, it will be that color string
      // If --background-color is not provided, it will be undefined
      const fillWithEdgeColor = options.backgroundColor === true;
      const backgroundColor = typeof options.backgroundColor === 'string' ? options.backgroundColor : '';
      
      // Generate PDF
      console.log('\n🎨 Pin Maker PDF Generator\n');
      await generatePinPDF(
        filteredImages || [], 
        outputPath, 
        pinSize, 
        fillWithEdgeColor, 
        options.duplicate,
        backgroundColor,
        options.borderColor,
        borderWidth,
        textPins,
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
}
