import { checkbox, input, select, confirm, editor } from '@inquirer/prompts';
import { PinSize, TextPin, TextLine } from './types.js';
import fs from 'fs';
import path from 'path';
import terminalKit from 'terminal-kit';
import sharp from 'sharp';

const term = terminalKit.terminal;

export interface InteractiveConfig {
  images: string[];
  size: PinSize;
  output: string;
  duplicate: boolean;
  fillWithEdgeColor: boolean;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  textPins: TextPin[];
  textPosition: 'top' | 'center' | 'bottom';
  textColor: string;
  textSize: number;
  textOutline: string;
  textOutlineWidth: number;
}

/**
 * Get list of image files in the current directory
 */
function getImageFiles(directory: string = '.'): string[] {
  try {
    const files = fs.readdirSync(directory);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff'];
    
    return files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => path.resolve(directory, file))
      .sort();
  } catch (error) {
    return [];
  }
}

/**
 * Get image dimensions using sharp
 */
async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return { width: metadata.width || 0, height: metadata.height || 0 };
  } catch {
    return null;
  }
}

/**
 * Display image preview using Kitty graphics protocol if supported
 */
async function showImagePreview(imagePath: string, size: { width: number; height: number } = { width: 400, height: 400 }): Promise<void> {
  // Check if drawImage method exists (terminal-kit feature)
  if (typeof term.drawImage !== 'function') {
    return;
  }

  try {
    // Create a thumbnail
    const thumbnailBuffer = await sharp(imagePath)
      .resize(size.width, size.height, { fit: 'inside' })
      .toBuffer();
    
    // Save to temp file (terminal-kit needs a file path)
    const tempPath = path.join('/tmp', `preview-${Date.now()}.png`);
    fs.writeFileSync(tempPath, thumbnailBuffer);
    
    // Display the image
    await term.drawImage(tempPath, {
      shrink: {
        width: Math.floor(size.width / 8),  // Larger display
        height: Math.floor(size.height / 16)
      }
    });
    
    // Clean up
    fs.unlinkSync(tempPath);
  } catch (error) {
    // Silently fail if image preview doesn't work
  }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Custom image selector with live preview
 */
async function selectImagesWithPreview(imageFiles: string[]): Promise<string[]> {
  return new Promise(async (resolve) => {
    const selected = new Set<string>();
    let currentIndex = 0;
    let scrollOffset = 0;
    const pageSize = 10;
    
    // Prepare image info
    const imageInfo = await Promise.all(
      imageFiles.map(async (file) => {
        const fileName = path.basename(file);
        const stats = fs.statSync(file);
        const dims = await getImageDimensions(file);
        const dimsStr = dims ? `${dims.width}×${dims.height}` : 'unknown';
        return {
          file,
          fileName,
          size: formatFileSize(stats.size),
          dimensions: dimsStr
        };
      })
    );
    
    const canShowPreview = typeof term.drawImage === 'function';
    
    async function render() {
      term.clear();
      term.bold.cyan('🎨 Select images\n');
      term.gray('↑↓: navigate | Space: toggle | Enter: confirm | q: cancel\n\n');
      
      // Calculate visible range
      const startIdx = scrollOffset;
      const endIdx = Math.min(startIdx + pageSize, imageFiles.length);
      
      // Show list
      for (let i = startIdx; i < endIdx; i++) {
        const info = imageInfo[i];
        const isSelected = selected.has(info.file);
        const isCurrent = i === currentIndex;
        
        if (isCurrent) {
          term.bold.white('▶ ');
        } else {
          term('  ');
        }
        
        if (isSelected) {
          term.green('✓ ');
        } else {
          term.gray('○ ');
        }
        
        if (isCurrent) {
          term.bold.cyan(info.fileName);
        } else {
          term.white(info.fileName);
        }
        
        term.gray(` (${info.size} | ${info.dimensions})`);
        term('\n');
      }
      
      // Show scroll indicator
      if (imageFiles.length > pageSize) {
        term.gray(`\nShowing ${startIdx + 1}-${endIdx} of ${imageFiles.length}`);
      }
      
      term.gray(` | Selected: ${selected.size}\n`);
      
      // Show preview of current image
      if (canShowPreview && currentIndex < imageFiles.length) {
        const currentInfo = imageInfo[currentIndex];
        term('\n').bold.cyan('━'.repeat(50)).dim('\n');
        term.bold.white(`Preview: ${currentInfo.fileName}\n`);
        term.gray(`${currentInfo.dimensions} | ${currentInfo.size}\n`);
        await showImagePreview(imageFiles[currentIndex], { width: 600, height: 600 });
        term.bold.cyan('━'.repeat(50)).dim('\n');
      }
    }
    
    term.grabInput(true);
    
    await render();
    
    term.on('key', async (name: string) => {
      switch (name) {
        case 'UP':
          if (currentIndex > 0) {
            currentIndex--;
            if (currentIndex < scrollOffset) {
              scrollOffset = currentIndex;
            }
            await render();
          }
          break;
          
        case 'DOWN':
          if (currentIndex < imageFiles.length - 1) {
            currentIndex++;
            if (currentIndex >= scrollOffset + pageSize) {
              scrollOffset = currentIndex - pageSize + 1;
            }
            await render();
          }
          break;
          
        case 'SPACE':
          const current = imageFiles[currentIndex];
          if (selected.has(current)) {
            selected.delete(current);
          } else {
            selected.add(current);
          }
          await render();
          break;
          
        case 'ENTER':
          term.grabInput(false);
          term('\n');
          resolve(Array.from(selected));
          break;
          
        case 'q':
        case 'CTRL_C':
          term.grabInput(false);
          term('\n');
          resolve([]);
          break;
      }
    });
  });
}

/**
 * Main interactive mode function
 */
export async function runInteractiveMode(): Promise<InteractiveConfig> {
  console.clear();
  term.bold.cyan('🎨 Pin Maker - Interactive Mode\n\n');
  
  // Step 1: Image Selection
  const imageFiles = getImageFiles('.');
  let selectedImages: string[] = [];
  
  if (imageFiles.length === 0) {
    term.yellow('⚠️  No image files found in current directory.\n');
    const createBlank = await confirm({
      message: 'Create blank template?',
      default: true
    });
    
    if (!createBlank) {
      term.red('\n❌ No images to process. Exiting.\n');
      process.exit(0);
    }
  } else {
    term.green(`Found ${imageFiles.length} image(s) in current directory\n\n`);
    
    // Use custom selector with live preview
    selectedImages = await selectImagesWithPreview(imageFiles);
    
    if (selectedImages.length === 0) {
      term.yellow('⚠️  No images selected.\n');
      const createBlank = await confirm({
        message: 'Continue with blank template?',
        default: false
      });
      
      if (!createBlank) {
        term.red('\n❌ Cancelled.\n');
        process.exit(0);
      }
    }
  }
  
  // Step 2: Basic Configuration
  term('\n').bold.cyan('📏 Basic Configuration\n\n');
  
  const size = await select({
    message: 'Pin size:',
    choices: [
      { name: '32mm (20 pins per page)', value: '32mm' },
      { name: '58mm (6 pins per page)', value: '58mm' }
    ],
    default: '32mm'
  }) as PinSize;
  
  const output = await input({
    message: 'Output PDF filename:',
    default: 'pins.pdf',
    validate: (value) => {
      if (!value.endsWith('.pdf')) {
        return 'Filename must end with .pdf';
      }
      return true;
    }
  });
  
  let duplicate = false;
  if (selectedImages.length > 0) {
    duplicate = await confirm({
      message: `Duplicate images to fill page (${size === '32mm' ? '20' : '6'} per page)?`,
      default: false
    });
  }
  
  // Step 3: Styling Options
  term('\n').bold.cyan('🎨 Styling Options\n\n');
  
  const customizeStyling = await confirm({
    message: 'Customize background and border?',
    default: false
  });
  
  let fillWithEdgeColor = false;
  let backgroundColor = '';
  let borderColor = '';
  let borderWidth = 0;
  
  if (customizeStyling) {
    const backgroundMode = await select({
      message: 'Background fill:',
      choices: [
        { name: 'None (transparent)', value: 'none' },
        { name: 'Auto (edge color)', value: 'auto' },
        { name: 'Custom color', value: 'custom' }
      ],
      default: 'none'
    });
    
    if (backgroundMode === 'auto') {
      fillWithEdgeColor = true;
    } else if (backgroundMode === 'custom') {
      backgroundColor = await input({
        message: 'Background color (hex, rgb, or named):',
        default: '#ffffff'
      });
    }
    
    const addBorder = await confirm({
      message: 'Add border?',
      default: false
    });
    
    if (addBorder) {
      borderColor = await input({
        message: 'Border color (hex, rgb, or named):',
        default: '#000000'
      });
      
      const borderWidthStr = await input({
        message: 'Border width in mm:',
        default: '1',
        validate: (value) => {
          const num = parseFloat(value);
          if (isNaN(num) || num < 0) {
            return 'Must be a non-negative number';
          }
          return true;
        }
      });
      borderWidth = parseFloat(borderWidthStr);
    }
  }
  
  // Step 4: Text Configuration
  term('\n').bold.cyan('✍️  Text Options\n\n');
  
  const addText = await confirm({
    message: 'Add text to pins?',
    default: false
  });
  
  let textPins: TextPin[] = [];
  let textPosition: 'top' | 'center' | 'bottom' = 'bottom';
  let textColor = 'white';
  let textSize = 0;
  let textOutline = 'black';
  let textOutlineWidth = 2;
  
  if (addText) {
    const textMode = await select({
      message: 'Text configuration:',
      choices: [
        { name: 'Same text on all pins', value: 'global' },
        { name: 'Different text per pin', value: 'per-pin' }
      ],
      default: 'global'
    });
    
    if (textMode === 'global') {
      const textInput = await editor({
        message: 'Enter text lines (one per line, empty line to finish):',
        default: '',
        postfix: '.txt'
      });
      
      const lines = textInput.trim().split('\n').filter(line => line.trim() !== '');
      const textLines: TextLine[] = [];
      
      for (const line of lines) {
        const customizeSize = await confirm({
          message: `Set custom size for "${line.substring(0, 30)}"?`,
          default: false
        });
        
        if (customizeSize) {
          const sizeStr = await input({
            message: 'Font size in points:',
            default: '24',
            validate: (value) => {
              const num = parseFloat(value);
              if (isNaN(num) || num <= 0) {
                return 'Must be a positive number';
              }
              return true;
            }
          });
          textLines.push({ text: line, size: parseFloat(sizeStr) });
        } else {
          textLines.push({ text: line });
        }
      }
      
      textPins = [textLines];
    } else {
      // Per-pin text
      const numPins = selectedImages.length > 0 ? selectedImages.length : 1;
      term.gray(`\nConfiguring text for ${numPins} pin(s)...\n\n`);
      
      for (let i = 0; i < numPins; i++) {
        term.cyan(`Pin ${i + 1}/${numPins}${selectedImages[i] ? ` (${path.basename(selectedImages[i])})` : ''}:\n`);
        
        const textInput = await editor({
          message: `Enter text lines for pin ${i + 1}:`,
          default: '',
          postfix: '.txt'
        });
        
        const lines = textInput.trim().split('\n').filter(line => line.trim() !== '');
        const textLines: TextLine[] = lines.map(line => ({ text: line }));
        
        textPins.push(textLines);
      }
    }
    
    // Text styling options
    term('\n');
    textPosition = await select({
      message: 'Text position:',
      choices: [
        { name: 'Top', value: 'top' },
        { name: 'Center', value: 'center' },
        { name: 'Bottom', value: 'bottom' }
      ],
      default: 'bottom'
    }) as 'top' | 'center' | 'bottom';
    
    textColor = await input({
      message: 'Text color (hex, rgb, or named):',
      default: 'white'
    });
    
    const autoSize = await confirm({
      message: 'Auto-scale text size?',
      default: true
    });
    
    if (!autoSize) {
      const sizeStr = await input({
        message: 'Default text size in points:',
        default: '24',
        validate: (value) => {
          const num = parseFloat(value);
          if (isNaN(num) || num <= 0) {
            return 'Must be a positive number';
          }
          return true;
        }
      });
      textSize = parseFloat(sizeStr);
    }
    
    const addOutline = await confirm({
      message: 'Add text outline for better visibility?',
      default: true
    });
    
    if (addOutline) {
      textOutline = await input({
        message: 'Outline color:',
        default: 'black'
      });
      
      const outlineWidthStr = await input({
        message: 'Outline width in points:',
        default: '2',
        validate: (value) => {
          const num = parseFloat(value);
          if (isNaN(num) || num < 0) {
            return 'Must be a non-negative number';
          }
          return true;
        }
      });
      textOutlineWidth = parseFloat(outlineWidthStr);
    } else {
      textOutline = '';
      textOutlineWidth = 0;
    }
  }
  
  // Step 5: Confirmation
  term('\n').bold.cyan('📋 Summary\n\n');
  term.gray('Images: ').white(`${selectedImages.length || 'blank template'}\n`);
  term.gray('Pin size: ').white(`${size}\n`);
  term.gray('Output: ').white(`${output}\n`);
  term.gray('Duplicate: ').white(`${duplicate ? 'Yes' : 'No'}\n`);
  if (fillWithEdgeColor || backgroundColor || borderColor) {
    term.gray('Styling: ').white(`${fillWithEdgeColor ? 'Auto background' : backgroundColor ? `Background: ${backgroundColor}` : ''}`);
    if (borderColor) term.white(` | Border: ${borderColor} (${borderWidth}mm)`);
    term('\n');
  }
  if (textPins.length > 0) {
    term.gray('Text: ').white(`${textPins.length} pin(s) with text\n`);
  }
  term('\n');
  
  const proceed = await confirm({
    message: 'Generate PDF?',
    default: true
  });
  
  if (!proceed) {
    term.red('\n❌ Cancelled.\n');
    process.exit(0);
  }
  
  return {
    images: selectedImages,
    size,
    output,
    duplicate,
    fillWithEdgeColor,
    backgroundColor,
    borderColor,
    borderWidth,
    textPins,
    textPosition,
    textColor,
    textSize,
    textOutline,
    textOutlineWidth
  };
}
