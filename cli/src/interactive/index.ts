import { input, select, confirm } from '@inquirer/prompts';
import { PinSize, TextPin } from '../types/index.js';
import fs from 'fs';
import path from 'path';
import terminalKit from 'terminal-kit';
import sharp from 'sharp';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  zoomLevels: number[];
  offsetXValues: number[];
  offsetYValues: number[];
}

export interface ImageFileInfo {
  file: string;
  fileName: string;
  size: number;
  sizeFormatted: string;
  dimensions: string;
  width: number;
  height: number;
  modifiedTime: number;
}

export type SortOption = 'name' | 'size' | 'dimensions' | 'date';

/**
 * Get list of image files in the current directory
 */
async function getImageFiles(directory: string = '.'): Promise<ImageFileInfo[]> {
  try {
    const files = fs.readdirSync(directory);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff'];
    
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => path.resolve(directory, file));
    
    // Get detailed info for each image
    const imageInfo = await Promise.all(
      imageFiles.map(async (file) => {
        const fileName = path.basename(file);
        const stats = fs.statSync(file);
        const dims = await getImageDimensions(file);
        return {
          file,
          fileName,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          dimensions: dims ? `${dims.width}×${dims.height}` : 'unknown',
          width: dims?.width || 0,
          height: dims?.height || 0,
          modifiedTime: stats.mtimeMs
        };
      })
    );
    
    return imageInfo;
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
 * Find kitten icat executable and check if terminal supports Kitty graphics protocol
 */
function findKittenIcat(): string | null {
  // First check if terminal supports Kitty graphics protocol
  const term_env = process.env.TERM || '';
  const term_program = process.env.TERM_PROGRAM || '';
  
  // List of terminals known to support Kitty graphics protocol
  const supportedTerminals = ['kitty', 'ghostty'];
  const supportsKitty = supportedTerminals.some(t => 
    term_env.toLowerCase().includes(t) || term_program.toLowerCase().includes(t)
  );
  
  if (!supportsKitty) {
    return null;
  }
  
  const possiblePaths = [
    '/Applications/kitty.app/Contents/MacOS/kitten',
    '/usr/local/bin/kitten',
    '~/.local/bin/kitten',
    'kitten'
  ];
  
  for (const kittenPath of possiblePaths) {
    try {
      // Try running with --help since --version doesn't exist
      const { status } = spawnSync(kittenPath, ['icat', '--help'], { stdio: 'pipe' });
      if (status === 0) {
        return kittenPath;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

/**
 * Display image preview using kitten icat (native Kitty protocol)
 */
async function showImageWithKittenIcat(imagePath: string, kittenPath: string, widthCells: number, heightCells: number): Promise<boolean> {
  try {
    // Temporarily release input grabbing before spawning kitten
    term.grabInput(false);
    
    // Pre-process image to constrain height while maintaining aspect ratio
    // Each cell is roughly 8-10 pixels wide and 16-20 pixels tall
    // Use conservative estimates: 10px per cell width, 20px per cell height
    const maxWidth = widthCells * 10;
    const maxHeight = heightCells * 20;
    
    const constrainedBuffer = await sharp(imagePath)
      .resize(maxWidth, maxHeight, { 
        fit: 'inside',
        withoutEnlargement: false
      })
      .png()
      .toBuffer();
    
    // Save to temp file
    const tempPath = path.join('/tmp', `preview-kitten-${Date.now()}.png`);
    fs.writeFileSync(tempPath, constrainedBuffer);
    
    // Use kitten icat to send the image directly using Kitty graphics protocol
    // --transfer-mode=stream works over any connection
    // Without --place, image renders inline (below current content)
    // --align left for left alignment
    const result = spawnSync(kittenPath, [
      'icat',
      '--transfer-mode=stream',
      '--align', 'left',
      tempPath
    ], {
      stdio: ['ignore', 'inherit', 'pipe'],  // Ignore stdin to avoid consuming terminal input
      encoding: 'utf-8'
    });
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempPath);
    } catch {}
    
    // Re-grab input after kitten exits
    term.grabInput(true);
    
    return result.status === 0;
  } catch {
    // Ensure we re-grab input even on error
    term.grabInput(true);
    return false;
  }
}

/**
 * Display image preview using Kitty graphics protocol if supported
 */
async function showImagePreview(imagePath: string, size: { width: number; height: number } = { width: 800, height: 800 }): Promise<void> {
  // Try to use kitten icat for best quality (native Kitty protocol)
  const kittenPath = findKittenIcat();
  
  if (kittenPath) {
    const success = await showImageWithKittenIcat(
      imagePath,
      kittenPath,
      Math.floor(size.width / 8),
      Math.floor(size.height / 32)  // Reduced from /16 to /32 for half the height
    );
    
    if (success) {
      return;
    }
  }
  
  // Fallback: Check if drawImage method exists (terminal-kit feature)
  if (typeof term.drawImage !== 'function') {
    return;
  }

  try {
    // Create a higher resolution thumbnail with optimal quality settings
    const thumbnailBuffer = await sharp(imagePath)
      .resize(size.width, size.height, { 
        fit: 'inside',
        kernel: 'lanczos3',          // High-quality Lanczos3 resampling
        withoutEnlargement: true     // Don't upscale small images
      })
      .png({ 
        compressionLevel: 6,         // Balanced compression
        quality: 100,                // Maximum quality
        palette: false               // Use full RGB, not palette
      })
      .toColorspace('srgb')          // Ensure sRGB color space
      .toBuffer();
    
    // Save to temp file (terminal-kit needs a file path)
    const tempPath = path.join('/tmp', `preview-${Date.now()}.png`);
    fs.writeFileSync(tempPath, thumbnailBuffer);
    
    // Display the image at higher resolution
    await term.drawImage(tempPath, {
      shrink: {
        width: Math.floor(size.width / 8),  // Higher resolution display
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
 * Sort images by different criteria
 */
export function sortImages(images: ImageFileInfo[], sortBy: SortOption): ImageFileInfo[] {
  const sorted = [...images];
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.fileName.localeCompare(b.fileName));
    case 'size':
      return sorted.sort((a, b) => b.size - a.size);
    case 'dimensions':
      return sorted.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    case 'date':
      return sorted.sort((a, b) => b.modifiedTime - a.modifiedTime);
    default:
      return sorted;
  }
}

/**
 * Filter images based on search query
 */
export function filterImages(images: ImageFileInfo[], query: string): ImageFileInfo[] {
  if (!query.trim()) return images;
  const lowerQuery = query.toLowerCase();
  return images.filter(img => 
    img.fileName.toLowerCase().includes(lowerQuery) ||
    img.dimensions.includes(lowerQuery)
  );
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Custom image selector with live preview, sorting, and filtering
 */
async function selectImagesWithPreview(imageFiles: ImageFileInfo[]): Promise<string[]> {
  return new Promise(async (resolve) => {
    const selected = new Set<string>();
    let currentIndex = 0;
    let scrollOffset = 0;
    let sortBy: SortOption = 'name';
    let filterQuery = '';
    let showingFilterInput = false;
    
    let filteredAndSorted = sortImages(filterImages(imageFiles, filterQuery), sortBy);
    
    const canShowPreview = typeof term.drawImage === 'function';
    const pageSize = 10;
    
    async function render() {
      term.clear();
      
      // Recalculate filtered and sorted list
      filteredAndSorted = sortImages(filterImages(imageFiles, filterQuery), sortBy);
      
      // Adjust currentIndex if out of bounds
      if (currentIndex >= filteredAndSorted.length && filteredAndSorted.length > 0) {
        currentIndex = filteredAndSorted.length - 1;
        scrollOffset = Math.max(0, currentIndex - pageSize + 1);
      }
      
      term.bold.cyan('🎨 Select images\n');
      
      // Show controls
      if (showingFilterInput) {
        term.gray('Type to filter | ESC: cancel\n');
        term.bold.white('Filter: ').cyan(filterQuery + '█\n\n');
      } else {
        term.gray('↑↓: navigate | Space: toggle | Enter: confirm | s: sort | /: filter | a: select all | n: none | q: cancel\n');
        term.gray(`Sort: ${sortBy} | Showing: ${filteredAndSorted.length}/${imageFiles.length} images | Selected: ${selected.size}\n\n`);
      }
      
      if (filteredAndSorted.length === 0) {
        term.yellow('No images match the current filter.\n');
        return;
      }
      
      // Calculate visible range
      const startIdx = scrollOffset;
      const endIdx = Math.min(startIdx + pageSize, filteredAndSorted.length);
      
      // List and preview layout
      for (let i = startIdx; i < endIdx; i++) {
          const info = filteredAndSorted[i];
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
          
          term.gray(` (${info.sizeFormatted} | ${info.dimensions})`);
          term('\n');
        }
        
      // Show scroll indicator
      if (filteredAndSorted.length > pageSize) {
        term.gray(`\nShowing ${startIdx + 1}-${endIdx} of ${filteredAndSorted.length}`);
      }
      
      // Show preview of current image
      if (canShowPreview && currentIndex < filteredAndSorted.length) {
        const currentInfo = filteredAndSorted[currentIndex];
        term('\n').bold.cyan('━'.repeat(75)).dim('\n');
        term.bold.white(`Preview: ${currentInfo.fileName}\n`);
        term.gray(`${currentInfo.dimensions} | ${currentInfo.sizeFormatted}\n`);
        await showImagePreview(currentInfo.file, { width: 800, height: 800 });
        term.bold.cyan('━'.repeat(75)).dim('\n');
      }
    }
    
    term.grabInput(true);
    
    await render();
    
    term.on('key', async (name: string, matches: any, data: any) => {
      if (showingFilterInput) {
        // Handle filter input mode
        if (name === 'ESCAPE') {
          showingFilterInput = false;
          await render();
        } else if (name === 'BACKSPACE') {
          filterQuery = filterQuery.slice(0, -1);
          await render();
        } else if (name === 'ENTER') {
          showingFilterInput = false;
          await render();
        } else if (data && data.isCharacter) {
          filterQuery += String.fromCharCode(data.codepoint);
          await render();
        }
        return;
      }
      
      // Normal navigation mode
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
          if (currentIndex < filteredAndSorted.length - 1) {
            currentIndex++;
            if (currentIndex >= scrollOffset + pageSize) {
              scrollOffset = currentIndex - pageSize + 1;
            }
            await render();
          }
          break;
          
        case 'SPACE':
        case ' ':  // Space key can be reported as a space character
          const current = filteredAndSorted[currentIndex].file;
          if (selected.has(current)) {
            selected.delete(current);
          } else {
            selected.add(current);
          }
          await render();
          break;
          
        case 'a':
          // Select all visible
          filteredAndSorted.forEach(info => selected.add(info.file));
          await render();
          break;
          
        case 'n':
          // Deselect all
          selected.clear();
          await render();
          break;
          
        case 's':
          // Cycle through sort options
          const sortOptions: SortOption[] = ['name', 'size', 'dimensions', 'date'];
          const currentSortIndex = sortOptions.indexOf(sortBy);
          sortBy = sortOptions[(currentSortIndex + 1) % sortOptions.length];
          currentIndex = 0;
          scrollOffset = 0;
          await render();
          break;
          
        case '/':
          // Enter filter mode
          showingFilterInput = true;
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
  const imageFiles = await getImageFiles('.');
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
  
  // Step 3: Edit images?
  term('\n').bold.cyan('🎨 Customization\n\n');
  
  const editImages = await confirm({
    message: 'Edit images? (position, zoom, background, border, text)',
    default: false
  });
  
  // Default values (will be customized in browser editor if user chooses to edit)
  let fillWithEdgeColor = false;
  let backgroundColor = '';
  let borderColor = '';
  let borderWidth = 0;
  let textPins: TextPin[] = [];
  let textPosition: 'top' | 'center' | 'bottom' = 'bottom';
  let textColor = 'white';
  let textSize = 0;
  let textOutline = 'black';
  let textOutlineWidth = 2;
  let zoomLevels: number[] = [];
  let offsetXValues: number[] = [];
  let offsetYValues: number[] = [];
  
  if (editImages) {
    term.yellow('\n🌐 Launching browser editor...\n');
    
    try {
      // Start the Electron editor via subprocess
      term.green('🚀 Opening editor window...\n');
      term.gray('Edit your images and click "Done Editing" when finished.\n\n');
      
      // Create temp config file
      const tmpDir = os.tmpdir();
      const configPath = path.join(tmpDir, `pinmaker-${Date.now()}.config.json`);
      const resultPath = configPath.replace('.config.json', '.result.json');
      
      fs.writeFileSync(configPath, JSON.stringify({
        images: selectedImages,
        size,
        duplicate
      }));
      
      // Spawn Electron process
      const electronPath = path.join(__dirname, '../../node_modules/.bin/electron');
      const launcherPath = path.join(__dirname, '../../electron-launcher.mjs');
      
      await new Promise<void>((resolve, reject) => {
        const electronProcess = spawn(electronPath, [launcherPath, configPath], {
          stdio: 'inherit',
          shell: false
        });
        
        electronProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Electron exited with code ${code}`));
          }
        });
        
        electronProcess.on('error', (err) => {
          reject(err);
        });
      });
      
      // Read result from temp file
      if (!fs.existsSync(resultPath)) {
        throw new Error('Editor did not save results');
      }
      
      const editorState = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
      
      // Clean up temp files
      fs.unlinkSync(configPath);
      fs.unlinkSync(resultPath);
      
      term.green('✓ Editor closed. Applying your settings...\n');
      
      // DEBUG: Log the editor state
      console.log('[DEBUG] Editor state:', JSON.stringify(editorState, null, 2));
      
      // Extract settings from editor state and apply them
      // Since each image can have different settings, we need to handle this carefully
      // For now, we'll use the first image's settings as defaults
      if (editorState.images.length > 0) {
        const firstImage = editorState.images[0];
        
        // Apply background settings
        fillWithEdgeColor = firstImage.fillWithEdgeColor;
        backgroundColor = firstImage.backgroundColor;
        
        // Apply border settings
        borderColor = firstImage.borderColor;
        borderWidth = firstImage.borderWidth;
        
        // Extract zoom and offset values for each image
        zoomLevels = editorState.images.map((img: any) => img.zoom);
        offsetXValues = editorState.images.map((img: any) => img.offsetX);
        offsetYValues = editorState.images.map((img: any) => img.offsetY);
        
        // DEBUG: Log extracted values
        console.log('[DEBUG] Extracted zoomLevels:', zoomLevels);
        console.log('[DEBUG] Extracted offsetXValues:', offsetXValues);
        console.log('[DEBUG] Extracted offsetYValues:', offsetYValues);
        
        // Apply text settings from each image
        textPins = editorState.images.map((img: any) => 
          img.textLines.map((line: any) => ({
            text: line.text,
            size: line.size
          }))
        );
        
        // Use first image's text settings as defaults
        if (firstImage.textLines.length > 0) {
          const firstTextLine = firstImage.textLines[0];
          textPosition = firstTextLine.position || 'bottom';
          textColor = firstTextLine.color || 'white';
          textOutline = firstTextLine.outline || 'black';
          textOutlineWidth = firstTextLine.outlineWidth || 2;
        }
      }
    } catch (error) {
      term.red('\n❌ Failed to launch editor: ' + (error instanceof Error ? error.message : String(error)) + '\n');
      term.yellow('Proceeding with default settings...\n');
    }
  }
  
  // Step 4: Confirmation
  term('\n').bold.cyan('📋 Summary\n\n');
  term.gray('Images: ').white(`${selectedImages.length || 'blank template'}\n`);
  term.gray('Pin size: ').white(`${size}\n`);
  term.gray('Output: ').white(`${output}\n`);
  term.gray('Duplicate: ').white(`${duplicate ? 'Yes' : 'No'}\n`);
  term.gray('Edit mode: ').white(`${editImages ? 'Yes' : 'No (using defaults)'}\n`);
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
    textOutlineWidth,
    zoomLevels,
    offsetXValues,
    offsetYValues
  };
}
