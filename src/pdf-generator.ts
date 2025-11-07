import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fs from 'fs';
import { PinConfig, PinSize, PIN_CONFIGS } from './types.js';
import { calculateLayout, getTotalPages } from './layout.js';

/**
 * Extracts the average color from the edges of an image.
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

  // Process top and bottom edges
  for (let x = 0; x < width; x++) {
    // Top edge (y=0)
    const topIdx = x * channels;
    totalR += data[topIdx];
    totalG += data[topIdx + 1];
    totalB += data[topIdx + 2];

    // Bottom edge (y=height-1)
    const bottomIdx = ((height - 1) * width + x) * channels;
    totalR += data[bottomIdx];
    totalG += data[bottomIdx + 1];
    totalB += data[bottomIdx + 2];
  }
  pixelCount += width * 2;

  // Process left and right edges (excluding corners already counted)
  for (let y = 1; y < height - 1; y++) {
    // Left edge (x=0)
    const leftIdx = (y * width) * channels;
    totalR += data[leftIdx];
    totalG += data[leftIdx + 1];
    totalB += data[leftIdx + 2];

    // Right edge (x=width-1)
    const rightIdx = (y * width + (width - 1)) * channels;
    totalR += data[rightIdx];
    totalG += data[rightIdx + 1];
    totalB += data[rightIdx + 2];
  }
  pixelCount += (height - 2) * 2;

  return {
    r: Math.round(totalR / pixelCount),
    g: Math.round(totalG / pixelCount),
    b: Math.round(totalB / pixelCount),
  };
}

/**
 * Processes an image to create a foreground and extract the average edge color.
 */
async function processImage(
  imagePath: string,
  pinDiameter: number,
  fill: boolean
): Promise<{ foreground: Buffer; edgeColor?: { r: number; g: number; b: number } }> {
  const image = sharp(imagePath);

  // Extract the average edge color
  const edgeColor = fill ? await extractEdgeColor(image) : undefined;

  // Create the foreground image with a transparent background
  const foreground = await image
    .clone()
    .resize(Math.round(pinDiameter), Math.round(pinDiameter), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return { foreground, edgeColor };
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
  text: string,
  textPosition: string,
  textColor: string,
  textSize: number,
  textOutline: string,
  textOutlineWidth: number
): void {
  const circleRadius = circleDiameter / 2;
  
  doc.save();
  
  // Draw background if specified
  if (backgroundColor) {
    doc.circle(x, y, circleRadius).fill(backgroundColor);
  }
  
  // Draw border ring if specified
  if (borderColor && borderWidth > 0) {
    // Border starts at (pinDiameter - borderWidth) and extends to circleDiameter
    const borderInnerRadius = (pinDiameter - borderWidth * 2) / 2;
    const borderOuterRadius = circleRadius;
    
    // Draw the outer circle with border color
    doc.circle(x, y, borderOuterRadius).fill(borderColor);
    
    // Cut out the inner circle to create a ring effect
    if (backgroundColor) {
      doc.circle(x, y, borderInnerRadius).fill(backgroundColor);
    } else {
      doc.circle(x, y, borderInnerRadius).fill('white');
    }
  }
  
  // Draw the cutting outline
  doc.circle(x, y, circleRadius).stroke();
  
  // Draw text overlay if specified
  if (text) {
    drawTextOverlay(
      doc,
      text,
      x,
      y,
      pinDiameter,
      textPosition,
      textColor,
      textSize,
      textOutline,
      textOutlineWidth
    );
  }
  
  doc.restore();
}

/**
 * Draws text overlay on a pin.
 */
function drawTextOverlay(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  pinDiameter: number,
  position: string,
  textColor: string,
  textSize: number,
  textOutline: string,
  textOutlineWidth: number
): void {
  if (!text) return;
  
  const pinRadius = pinDiameter / 2;
  
  // Auto-calculate text size if not specified (proportional to pin size)
  const fontSize = textSize > 0 ? textSize : pinDiameter / 8;
  
  // Calculate vertical position based on position option
  let textY = y;
  if (position === 'top') {
    textY = y - pinRadius * 0.6;
  } else if (position === 'center') {
    textY = y;
  } else { // bottom
    textY = y + pinRadius * 0.6;
  }
  
  doc.save();
  
  // Set font
  doc.fontSize(fontSize);
  doc.font('Helvetica-Bold');
  
  // Measure text width
  const textWidth = doc.widthOfString(text);
  const textX = x - textWidth / 2;
  
  // Draw text outline (stroke) first for visibility
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
      doc.text(text, textX + offsetX, textY - fontSize / 2 + offsetY, {
        lineBreak: false
      });
    }
  }
  
  // Draw the main text on top
  doc.fillColor(textColor);
  doc.text(text, textX, textY - fontSize / 2, {
    lineBreak: false
  });
  
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
  text: string,
  textPosition: string,
  textColor: string,
  textSize: number,
  textOutline: string,
  textOutlineWidth: number
): void {
  const circleRadius = circleDiameter / 2;
  const pinRadius = pinDiameter / 2;

  doc.save();
  
  // Priority: explicit backgroundColor > edgeColor from fill
  if (backgroundColor) {
    // Draw the solid color background circle with explicit color
    doc.circle(x, y, circleRadius).fill(backgroundColor);
  } else if (edgeColor) {
    const hexColor = `#${edgeColor.r.toString(16).padStart(2, '0')}${edgeColor.g.toString(16).padStart(2, '0')}${edgeColor.b.toString(16).padStart(2, '0')}`;
    // Draw the solid color background circle
    doc.circle(x, y, circleRadius).fill(hexColor);
  }

  // Draw border ring if specified
  if (borderColor && borderWidth > 0) {
    // Border starts at (pinDiameter - borderWidth) and extends to circleDiameter
    const borderInnerRadius = (pinDiameter - borderWidth * 2) / 2;
    const borderOuterRadius = circleRadius;
    
    // Draw the outer circle with border color
    doc.circle(x, y, borderOuterRadius).fill(borderColor);
    
    // Cut out the inner circle to create a ring effect
    // Priority: explicit backgroundColor > edgeColor > white
    if (backgroundColor) {
      doc.circle(x, y, borderInnerRadius).fill(backgroundColor);
    } else if (edgeColor) {
      const hexColor = `#${edgeColor.r.toString(16).padStart(2, '0')}${edgeColor.g.toString(16).padStart(2, '0')}${edgeColor.b.toString(16).padStart(2, '0')}`;
      doc.circle(x, y, borderInnerRadius).fill(hexColor);
    } else {
      doc.circle(x, y, borderInnerRadius).fill('white');
    }
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
    text,
    x,
    y,
    pinDiameter,
    textPosition,
    textColor,
    textSize,
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
  texts: string[],
  textPosition: string,
  textColor: string,
  textSize: number,
  textOutline: string,
  textOutlineWidth: number
): Promise<void> {
  const config: PinConfig = PIN_CONFIGS[pinSize];
  
  // If no images provided, generate a template with empty circles
  if (imagePaths.length === 0) {
    // If texts are provided without images, render them on blank circles
    const hasTexts = texts.length > 0;
    const totalCircles = hasTexts ? Math.max(texts.length, config.circlesPerPage) : config.circlesPerPage;
    
    console.log(hasTexts ? 'Generating pins with text on blank templates...' : 'Generating blank template...');
    console.log(`Pin size: ${config.pinSize}mm (circle: ${config.circleSize}mm)`);
    console.log(`Layout: ${totalCircles} circles on 1 page`);
    
    const positions = calculateLayout(totalCircles, config);
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    
    doc.addPage({ size: 'A4', margin: 0 });
    console.log('Generating page 1/1...');
    
    for (let i = 0; i < totalCircles; i++) {
      const position = positions[i];
      drawEmptyCircle(
        doc, 
        position.x, 
        position.y, 
        config.pinSizePt,
        config.circleSizePt,
        backgroundColor,
        borderColor,
        borderWidth * 2.83465, // Convert mm to points
        texts[i] || '', // Get text for this circle, or empty string
        textPosition,
        textColor,
        textSize,
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

  const processedImages: Array<{ foreground: Buffer; edgeColor?: { r: number; g: number; b: number } }> = [];
  for (let i = 0; i < imagePaths.length; i++) {
    console.log(`Processing image ${i + 1}/${imagePaths.length}: ${imagePaths[i]}`);
    const result = await processImage(imagePaths[i], config.pinSizePt, fill);
    processedImages.push(result);
  }

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  let currentPage = -1;
  for (let circleIdx = 0; circleIdx < totalCircles; circleIdx++) {
    const position = positions[circleIdx];
    const imageIdx = imageDistribution[circleIdx];
    
    if (position.page !== currentPage) {
      doc.addPage({ size: 'A4', margin: 0 });
      currentPage = position.page;
      console.log(`Generating page ${currentPage + 1}/${totalPages}...`);
    }
    
    drawCircularImage(
      doc,
      processedImages[imageIdx].foreground,
      fill ? processedImages[imageIdx].edgeColor : undefined,
      position.x,
      position.y,
      config.pinSizePt,
      config.circleSizePt,
      backgroundColor,
      borderColor,
      borderWidth * 2.83465, // Convert mm to points
      texts[imageIdx] || '', // Get text for this image index, or empty string
      textPosition,
      textColor,
      textSize,
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
