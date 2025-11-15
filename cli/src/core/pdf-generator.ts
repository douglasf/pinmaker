import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fs from 'fs';
import { PinConfig, PinSize, PIN_CONFIGS, TextPin } from '../types/index.js';
import { calculateLayout, getTotalPages } from './layout.js';

/**
 * Extracts the average color from the edges of an image, skipping transparent pixels.
 */
async function extractEdgeColor(image: sharp.Sharp): Promise<{ r: number; g: number; b: number }> {
  const { data, info } = await image
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let pixelCount = 0;
  
  // Alpha threshold: pixels with alpha below this are considered transparent
  const alphaThreshold = 10;

  // Process top and bottom edges
  for (let x = 0; x < width; x++) {
    // Top edge (y=0)
    const topIdx = x * channels;
    const topAlpha = channels === 4 ? data[topIdx + 3] : 255;
    if (topAlpha > alphaThreshold) {
      totalR += data[topIdx];
      totalG += data[topIdx + 1];
      totalB += data[topIdx + 2];
      pixelCount++;
    }

    // Bottom edge (y=height-1)
    const bottomIdx = ((height - 1) * width + x) * channels;
    const bottomAlpha = channels === 4 ? data[bottomIdx + 3] : 255;
    if (bottomAlpha > alphaThreshold) {
      totalR += data[bottomIdx];
      totalG += data[bottomIdx + 1];
      totalB += data[bottomIdx + 2];
      pixelCount++;
    }
  }

  // Process left and right edges (excluding corners already counted)
  for (let y = 1; y < height - 1; y++) {
    // Left edge (x=0)
    const leftIdx = (y * width) * channels;
    const leftAlpha = channels === 4 ? data[leftIdx + 3] : 255;
    if (leftAlpha > alphaThreshold) {
      totalR += data[leftIdx];
      totalG += data[leftIdx + 1];
      totalB += data[leftIdx + 2];
      pixelCount++;
    }

    // Right edge (x=width-1)
    const rightIdx = (y * width + (width - 1)) * channels;
    const rightAlpha = channels === 4 ? data[rightIdx + 3] : 255;
    if (rightAlpha > alphaThreshold) {
      totalR += data[rightIdx];
      totalG += data[rightIdx + 1];
      totalB += data[rightIdx + 2];
      pixelCount++;
    }
  }

  // If no opaque pixels found, return black
  if (pixelCount === 0) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Math.round(totalR / pixelCount),
    g: Math.round(totalG / pixelCount),
    b: Math.round(totalB / pixelCount),
  };
}

/**
 * Processes an image to create a foreground and extract the average edge color.
 * @param circleDiameter - The outer circle diameter for boundary calculations (use this for editor mode)
 */
async function processImage(
  imagePath: string,
  pinDiameter: number,
  circleDiameter: number,
  fill: boolean,
  zoom: number = 1.0,
  offsetX: number = 0,
  offsetY: number = 0
): Promise<{ foreground: Buffer; edgeColor?: { r: number; g: number; b: number } }> {
  try {
    console.log(`[processImage] Input: zoom=${zoom}, offsetX=${offsetX}, offsetY=${offsetY}, pinDiameter=${pinDiameter}, circleDiameter=${circleDiameter}`);
    
    const image = sharp(imagePath);

    // Use circleDiameter as the boundary box size
    const boundarySize = Math.round(circleDiameter);
    
    // Calculate the target size after zoom
    const zoomedSize = Math.round(boundarySize * zoom);

    // Resize the image to the zoomed size (maintaining aspect ratio with 'contain')
    let processedImage = image
      .clone()
      .resize(zoomedSize, zoomedSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });

    // Handle zoom and offset:
    // - If zoom >= 1 OR there's an offset that would cause clipping, extract a viewport
    // - If zoom < 1 AND no offset, composite onto canvas
    let viewportImage: sharp.Sharp;
    
    // Check if we need viewport extraction (when image would be clipped by offset)
    const needsViewportExtraction = zoom >= 1.0 || 
      (offsetX !== 0 || offsetY !== 0);
    
    if (needsViewportExtraction) {
      // Create a larger canvas to allow for offsets
      const canvasSize = zoom >= 1.0 ? zoomedSize : Math.round(boundarySize * 1.5);
      
      const canvas = sharp({
        create: {
          width: canvasSize,
          height: canvasSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });
      
      // Position the image on the canvas (centered by default)
      const imageLeft = Math.round((canvasSize - zoomedSize) / 2 + offsetX);
      const imageTop = Math.round((canvasSize - zoomedSize) / 2 + offsetY);
      
      const resizedBuffer = await processedImage.png().toBuffer();
      
      console.log(`[processImage] Using viewport extraction: canvasSize=${canvasSize}, zoomedSize=${zoomedSize}, imagePos=(${imageLeft},${imageTop}), offset=(${offsetX},${offsetY})`);
      
      const compositeResult = await canvas.composite([{
        input: resizedBuffer,
        left: imageLeft,
        top: imageTop
      }]).png().toBuffer();
      
      // Extract the viewport (center of canvas)
      const extractLeft = Math.round((canvasSize - boundarySize) / 2);
      const extractTop = Math.round((canvasSize - boundarySize) / 2);
      
      console.log(`[processImage] Extracting viewport from (${extractLeft},${extractTop}) size ${boundarySize}x${boundarySize}`);
      
      viewportImage = sharp(compositeResult).extract({
        left: extractLeft,
        top: extractTop,
        width: boundarySize,
        height: boundarySize
      });
    } else {
      // Zoom < 1 and no offset: Simple center composite
      const canvas = sharp({
        create: {
          width: boundarySize,
          height: boundarySize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });
      
      const left = Math.round((boundarySize - zoomedSize) / 2);
      const top = Math.round((boundarySize - zoomedSize) / 2);
      
      console.log(`[processImage] Simple center composite: boundarySize=${boundarySize}, zoomedSize=${zoomedSize}, pos=(${left},${top})`);
      
      const resizedBuffer = await processedImage.png().toBuffer();
      
      const compositeResult = await canvas.composite([{
        input: resizedBuffer,
        left: left,
        top: top
      }]).png().toBuffer();
      
      viewportImage = sharp(compositeResult);
    }

    // Extract the average edge color AFTER zoom/offset transformations
    const edgeColor = fill ? await extractEdgeColor(viewportImage) : undefined;

    // Now crop to pin diameter if circleDiameter > pinDiameter
    let finalImage = viewportImage;
    if (circleDiameter > pinDiameter) {
      const cropOffset = Math.round((circleDiameter - pinDiameter) / 2);
      finalImage = viewportImage.extract({
        left: cropOffset,
        top: cropOffset,
        width: Math.round(pinDiameter),
        height: Math.round(pinDiameter)
      });
    }

    // Create the final foreground image
    const foreground = await finalImage
      .png()
      .toBuffer();

    return { foreground, edgeColor };
  } catch (error: any) {
    console.error(`[processImage] ERROR:`, error.message);
    console.error(`[processImage] Stack:`, error.stack);
    throw error;
  }
}

/**
 * Draws an empty circle outline for template generation.
 */
function drawEmptyCircle(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  pinDiameter: number,
  circleDiameter: number,
  backgroundColor: string,
  borderColor: string,
  borderWidth: number,
  textPin: TextPin,
  textPosition: string,
  textColor: string,
  defaultTextSize: number,
  textOutline: string,
  textOutlineWidth: number
): void {
  const circleRadius = circleDiameter / 2;
  
  doc.save();
  
  // Draw border ring if specified
  if (borderColor && borderWidth > 0) {
    // Border extends from outer circle edge inward by borderWidth
    const borderOuterRadius = circleRadius;
    const borderInnerRadius = circleRadius - borderWidth;
    
    // Draw the outer circle with border color
    doc.circle(x, y, borderOuterRadius).fill(borderColor);
    
    // Cut out the inner circle to create a ring effect
    if (backgroundColor) {
      doc.circle(x, y, borderInnerRadius).fill(backgroundColor);
    } else {
      doc.circle(x, y, borderInnerRadius).fill('white');
    }
  } else if (backgroundColor) {
    // No border, but we have a background color
    doc.circle(x, y, circleRadius).fill(backgroundColor);
  }
  
  // Draw the cutting outline
  doc.circle(x, y, circleRadius).stroke();
  
  // Draw text overlay if specified
  if (textPin && textPin.length > 0) {
    drawTextOverlay(
      doc,
      textPin,
      x,
      y,
      pinDiameter,
      textPosition,
      textColor,
      defaultTextSize,
      textOutline,
      textOutlineWidth
    );
  }
  
  doc.restore();
}

/**
 * Draws text overlay on a pin (supports multi-line text).
 */
function drawTextOverlay(
  doc: PDFKit.PDFDocument,
  textPin: TextPin,
  x: number,
  y: number,
  pinDiameter: number,
  position: string,
  textColor: string,
  defaultTextSize: number,
  textOutline: string,
  textOutlineWidth: number
): void {
  if (!textPin || textPin.length === 0) return;
  
  const pinRadius = pinDiameter / 2;
  
  // Auto-calculate default text size if not specified (proportional to pin size)
  const autoSize = defaultTextSize > 0 ? defaultTextSize : pinDiameter / 8;
  
  // Calculate font sizes for each line
  const lineSizes = textPin.map(line => line.size || autoSize);
  
  // Line height is 1.2x the font size (standard typography)
  const lineHeights = lineSizes.map(size => size * 1.2);
  
  // Calculate total height of all lines
  const totalHeight = lineHeights.reduce((sum, height) => sum + height, 0);
  
  // Calculate vertical position based on position option
  let startY = y;
  if (position === 'top') {
    startY = y - pinRadius * 0.6 - totalHeight / 2;
  } else if (position === 'center') {
    startY = y - totalHeight / 2;
  } else { // bottom
    startY = y + pinRadius * 0.6 - totalHeight / 2;
  }
  
  doc.save();
  doc.font('Helvetica-Bold');
  
  // Draw each line
  let currentY = startY;
  for (let i = 0; i < textPin.length; i++) {
    const line = textPin[i];
    const fontSize = lineSizes[i];
    const lineHeight = lineHeights[i];
    
    doc.fontSize(fontSize);
    
    // Measure text width
    const textWidth = doc.widthOfString(line.text);
    const textX = x - textWidth / 2;
    
    // Draw text outline (stroke) first for visibility (skip if outlineWidth is 0)
    if (textOutline && textOutlineWidth > 0) {
      doc.fillColor(textOutline);
      doc.lineWidth(textOutlineWidth);
      doc.strokeColor(textOutline);
      
      // Draw multiple offsets to create outline effect
      const offsets = [
        [-textOutlineWidth, -textOutlineWidth],
        [textOutlineWidth, -textOutlineWidth],
        [-textOutlineWidth, textOutlineWidth],
        [textOutlineWidth, textOutlineWidth],
        [0, -textOutlineWidth],
        [0, textOutlineWidth],
        [-textOutlineWidth, 0],
        [textOutlineWidth, 0]
      ];
      
      for (const [offsetX, offsetY] of offsets) {
        doc.text(line.text, textX + offsetX, currentY + offsetY, {
          lineBreak: false
        });
      }
    }
    
    // Draw the main text on top
    doc.fillColor(textColor);
    doc.text(line.text, textX, currentY, {
      lineBreak: false
    });
    
    // Move to next line
    currentY += lineHeight;
  }
  
  doc.restore();
}

/**
 * Draws a circular image with a solid color background.
 */
function drawCircularImage(
  doc: PDFKit.PDFDocument,
  foregroundBuffer: Buffer,
  edgeColor: { r: number; g: number; b: number } | undefined,
  x: number,
  y: number,
  pinDiameter: number,
  circleDiameter: number,
  backgroundColor: string,
  borderColor: string,
  borderWidth: number,
  textPin: TextPin,
  textPosition: string,
  textColor: string,
  defaultTextSize: number,
  textOutline: string,
  textOutlineWidth: number
): void {
  const circleRadius = circleDiameter / 2;
  const pinRadius = pinDiameter / 2;

  doc.save();
  
  // Determine background fill color: explicit backgroundColor > edgeColor > transparent
  let fillColor = null;
  if (backgroundColor) {
    fillColor = backgroundColor;
  } else if (edgeColor) {
    fillColor = `#${edgeColor.r.toString(16).padStart(2, '0')}${edgeColor.g.toString(16).padStart(2, '0')}${edgeColor.b.toString(16).padStart(2, '0')}`;
  }

  // Draw border ring if specified
  if (borderColor && borderWidth > 0) {
    // Border extends from outer circle edge inward by borderWidth
    const borderOuterRadius = circleRadius;
    const borderInnerRadius = circleRadius - borderWidth;
    
    // Draw the outer circle with border color
    doc.circle(x, y, borderOuterRadius).fill(borderColor);
    
    // Cut out the inner circle to create a ring effect
    if (fillColor) {
      doc.circle(x, y, borderInnerRadius).fill(fillColor);
    } else {
      // No fill color, cut out inner with white/transparent
      doc.circle(x, y, borderInnerRadius).fill('white');
    }
  } else if (fillColor) {
    // No border, but we have a fill color - draw background circle
    doc.circle(x, y, circleRadius).fill(fillColor);
  }

  // Draw the foreground image on top, centered and sized to the pin diameter
  doc.image(foregroundBuffer, x - pinRadius, y - pinRadius, {
    width: pinDiameter,
    height: pinDiameter,
  });

  // Draw the cutting outline
  doc.circle(x, y, circleRadius).stroke();
  
  // Draw text overlay if specified
  drawTextOverlay(
    doc,
    textPin,
    x,
    y,
    pinDiameter,
    textPosition,
    textColor,
    defaultTextSize,
    textOutline,
    textOutlineWidth
  );
  
  doc.restore();
}

/**
 * Create image distribution array.
 */
function createImageDistribution(imageCount: number, totalCircles: number): number[] {
  const distribution: number[] = [];
  if (imageCount <= totalCircles) {
    const copiesPerImage = Math.floor(totalCircles / imageCount);
    const remainder = totalCircles % imageCount;
    for (let imageIdx = 0; imageIdx < imageCount; imageIdx++) {
      const copies = copiesPerImage + (imageIdx < remainder ? 1 : 0);
      for (let copy = 0; copy < copies; copy++) {
        distribution.push(imageIdx);
      }
    }
  } else {
    for (let i = 0; i < totalCircles; i++) {
      distribution.push(i);
    }
  }
  return distribution;
}

/**
 * Generate PDF with images in circles.
 */
export async function generatePinPDF(
  imagePaths: string[],
  outputPath: string,
  pinSize: PinSize,
  fill: boolean,
  duplicate: boolean,
  backgroundColor: string,
  borderColor: string,
  borderWidth: number,
  textPins: TextPin[],
  textPosition: string,
  textColor: string,
  defaultTextSize: number,
  textOutline: string,
  textOutlineWidth: number,
  zoomLevels: number[] = [],
  offsetXValues: number[] = [],
  offsetYValues: number[] = []
): Promise<void> {
  const config: PinConfig = PIN_CONFIGS[pinSize];
  
  // If no images provided, generate a template with empty circles
  if (imagePaths.length === 0) {
    // If textPins are provided without images, render them on blank circles
    const hasTextPins = textPins.length > 0;
    const totalCircles = (hasTextPins && duplicate) 
      ? Math.max(textPins.length, config.circlesPerPage) 
      : hasTextPins 
        ? textPins.length 
        : config.circlesPerPage;
    
    console.log(hasTextPins ? 'Generating pins with text on blank templates...' : 'Generating blank template...');
    console.log(`Pin size: ${config.pinSize}mm (circle: ${config.circleSize}mm)`);
    const totalPages = getTotalPages(calculateLayout(totalCircles, config));
    console.log(`Layout: ${totalCircles} circles on ${totalPages} page(s) (${config.circlesPerPage} per page)`);
    
    // Create text distribution if duplicating
    const textDistribution = duplicate && hasTextPins 
      ? createImageDistribution(textPins.length, totalCircles)
      : Array.from({ length: totalCircles }, (_, i) => i);
    
    const positions = calculateLayout(totalCircles, config);
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    
    let currentPage = -1;
    for (let i = 0; i < totalCircles; i++) {
      const position = positions[i];
      
      if (position.page !== currentPage) {
        doc.addPage({ size: 'A4', margin: 0 });
        currentPage = position.page;
        console.log(`Generating page ${currentPage + 1}/${totalPages}...`);
      }
      
      const textIdx = textDistribution[i];
      drawEmptyCircle(
        doc, 
        position.x, 
        position.y, 
        config.pinSizePt,
        config.circleSizePt,
        backgroundColor,
        borderColor,
        borderWidth * 2.83465, // Convert mm to points
        textPins[textIdx] || [], // Get textPin for this circle using distribution, or empty array
        textPosition,
        textColor,
        defaultTextSize,
        textOutline,
        textOutlineWidth
      );
    }
    
    doc.end();
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    console.log(`✓ PDF generated: ${outputPath}`);
    return;
  }
  
  // Calculate total circles based on duplicate flag
  const totalCircles = duplicate ? Math.max(imagePaths.length, config.circlesPerPage) : imagePaths.length;
  const positions = calculateLayout(totalCircles, config);
  const totalPages = getTotalPages(positions);
  const imageDistribution = duplicate 
    ? createImageDistribution(imagePaths.length, totalCircles)
    : imagePaths.map((_, idx) => idx); // One-to-one mapping when not duplicating
  
  // Create text distribution - distribute textPins across all circles
  const textDistribution = textPins.length > 0
    ? createImageDistribution(textPins.length, totalCircles)
    : Array.from({ length: totalCircles }, (_, i) => i);

  console.log(`Processing ${imagePaths.length} unique image(s)...`);
  console.log(`Pin size: ${config.pinSize}mm (circle: ${config.circleSize}mm)`);
  console.log(`Layout: ${totalCircles} circles on ${totalPages} page(s) (${config.circlesPerPage} per page)`);

  if (duplicate && imagePaths.length < config.circlesPerPage) {
    const copiesPerImage = Math.floor(totalCircles / imagePaths.length);
    const imagesWithExtra = totalCircles % imagePaths.length;
    if (imagesWithExtra === 0) {
      console.log(`Each image will be duplicated ${copiesPerImage} times`);
    } else {
      console.log(`${imagesWithExtra} image(s) duplicated ${copiesPerImage + 1} times, ${imagePaths.length - imagesWithExtra} duplicated ${copiesPerImage} times`);
    }
  }

  // Process each circle individually with its own zoom/offset settings
  // Note: zoomLevels, offsetXValues, offsetYValues arrays are indexed per circle, not per unique image
  const processedCircles: Array<{ foreground: Buffer; edgeColor?: { r: number; g: number; b: number } }> = [];
  
  console.log(`Processing ${totalCircles} circle(s) with individual settings...`);
  for (let circleIdx = 0; circleIdx < totalCircles; circleIdx++) {
    const imageIdx = imageDistribution[circleIdx];
    const imagePath = imagePaths[imageIdx];
    const zoom = zoomLevels[circleIdx] || 1.0;
    const offsetX = offsetXValues[circleIdx] || 0;
    const offsetY = offsetYValues[circleIdx] || 0;
    
    console.log(`Processing circle ${circleIdx + 1}/${totalCircles}: ${imagePath} (zoom: ${zoom.toFixed(2)}, offset: ${offsetX},${offsetY})`);
    const result = await processImage(imagePath, config.pinSizePt, config.circleSizePt, fill, zoom, offsetX, offsetY);
    processedCircles.push(result);
  }

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  let currentPage = -1;
  for (let circleIdx = 0; circleIdx < totalCircles; circleIdx++) {
    const position = positions[circleIdx];
    const textIdx = textDistribution[circleIdx];
    
    if (position.page !== currentPage) {
      doc.addPage({ size: 'A4', margin: 0 });
      currentPage = position.page;
      console.log(`Generating page ${currentPage + 1}/${totalPages}...`);
    }
    
    drawCircularImage(
      doc,
      processedCircles[circleIdx].foreground,
      fill ? processedCircles[circleIdx].edgeColor : undefined,
      position.x,
      position.y,
      config.pinSizePt,
      config.circleSizePt,
      backgroundColor,
      borderColor,
      borderWidth * 2.83465, // Convert mm to points
      textPins[textIdx] || [], // Get textPin using distribution, or empty array
      textPosition,
      textColor,
      defaultTextSize,
      textOutline,
      textOutlineWidth
    );
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  console.log(`✓ PDF generated: ${outputPath}`);
}
