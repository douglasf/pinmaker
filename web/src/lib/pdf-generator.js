import { PDFDocument, rgb } from 'pdf-lib';
import { PIN_CONFIGS, A4_PAGE } from '../core/types.js';
import { calculateLayout } from '../core/layout.js';
import { processImageForCircle, extractEdgeColor } from './image-processing.js';

/**
 * Generate PDF from app state
 * @param {import('../core/types.js').AppState} state
 * @returns {Promise<Uint8Array>}
 */
export async function generatePDF(state) {
  const config = PIN_CONFIGS[state.pinSize];
  
  // Use the distribution array from state (already calculated)
  const totalCircles = state.imageDistribution.length;
  const imageDistribution = state.imageDistribution;
  
  const positions = calculateLayout(totalCircles, config);
  
  // Process all images
  const processedCircles = [];
  
  for (let circleIdx = 0; circleIdx < totalCircles; circleIdx++) {
    const imageIdx = imageDistribution[circleIdx];
    const imageState = state.images[imageIdx];
    
    if (!imageState.bitmap) {
      // Load bitmap if not already loaded
      imageState.bitmap = await createImageBitmap(imageState.file);
    }
    
    // Extract edge color from ORIGINAL image if needed (before processing)
    let edgeColor;
    if (imageState.fillWithEdgeColor) {
      edgeColor = await extractEdgeColor(imageState.bitmap);
    }
    
    // Process image
    const processedBitmap = await processImageForCircle(
      imageState.bitmap,
      config.pinSizePt,
      config.circleSizePt,
      imageState.zoom,
      imageState.offsetX,
      imageState.offsetY
    );
    
    // Render to canvas and extract PNG with circular clipping
    const canvas = new OffscreenCanvas(Math.round(config.pinSizePt), Math.round(config.pinSizePt));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Create circular clipping path
    const pinRadius = config.pinSizePt / 2;
    ctx.beginPath();
    ctx.arc(pinRadius, pinRadius, pinRadius, 0, Math.PI * 2);
    ctx.clip();
    
    // Draw the processed image within the circular clip
    ctx.drawImage(processedBitmap, 0, 0, config.pinSizePt, config.pinSizePt);
    
    // Convert to PNG
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const arrayBuffer = await blob.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);
    
    processedCircles.push({ imageData, edgeColor });
  }
  
  // Create PDF
  const pdfDoc = await PDFDocument.create();
  
  let currentPage = -1;
  let page;
  
  for (let circleIdx = 0; circleIdx < totalCircles; circleIdx++) {
    const position = positions[circleIdx];
    const imageIdx = imageDistribution[circleIdx];
    const imageState = state.images[imageIdx];
    const { imageData, edgeColor } = processedCircles[circleIdx];
    
    // Add new page if needed
    if (position.page !== currentPage) {
      page = pdfDoc.addPage([A4_PAGE.pageWidth, A4_PAGE.pageHeight]);
      currentPage = position.page;
    }
    
    // Determine background color
    let bgColor = undefined;
    // Check if backgroundColor is set and not empty
    if (imageState.backgroundColor && imageState.backgroundColor.trim() !== '') {
      bgColor = parseColor(imageState.backgroundColor);
    } else if (imageState.fillWithEdgeColor && edgeColor) {
      bgColor = rgb(edgeColor.r / 255, edgeColor.g / 255, edgeColor.b / 255);
    }
    
    const circleRadius = config.circleSizePt / 2;
    const pinRadius = config.pinSizePt / 2;
    
    // Draw background circle if specified (fills to outer circle)
    if (bgColor) {
      page.drawCircle({
        x: position.x,
        y: A4_PAGE.pageHeight - position.y, // PDF coordinates are bottom-up
        size: circleRadius,
        color: bgColor,
      });
    }
    
    // Embed and draw the image
    const pngImage = await pdfDoc.embedPng(imageData);
    page.drawImage(pngImage, {
      x: position.x - pinRadius,
      y: A4_PAGE.pageHeight - position.y - pinRadius,
      width: config.pinSizePt,
      height: config.pinSizePt,
    });
    
    // Draw border ring ON TOP of image if specified
    // We'll draw it as a ring by drawing outer circle then inner circle with opacity
    // Formula: gapDiameter = (outerCircleDiameter - pinDiameter)
    //          totalGapDiameter = gapDiameter + borderWidth
    //          borderInnerDiameter = outerCircleDiameter - totalGapDiameter
    if (imageState.borderColor && imageState.borderWidth > 0) {
      const borderWidthPt = imageState.borderWidth * 2.83465; // mm to pt
      const borderColor = parseColor(imageState.borderColor);
      const circleDiameter = config.circleSizePt;
      const pinDiameter = config.pinSizePt;
      const gapDiameter = circleDiameter - pinDiameter;
      const totalGapDiameter = gapDiameter + borderWidthPt;
      const borderInnerRadius = (circleDiameter - totalGapDiameter) / 2;
      const borderOuterRadius = circleRadius;
      const borderRingWidth = borderOuterRadius - borderInnerRadius;
      
      // Draw border as a stroked circle
      const borderMidRadius = borderInnerRadius + borderRingWidth / 2;
      page.drawCircle({
        x: position.x,
        y: A4_PAGE.pageHeight - position.y,
        size: borderMidRadius,
        borderColor: borderColor,
        borderWidth: borderRingWidth,
      });
    }
    
    // Draw cutting outline (outer circle)
    page.drawCircle({
      x: position.x,
      y: A4_PAGE.pageHeight - position.y,
      size: circleRadius,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    
    // Draw pin size guide circle (light gray dashed) - optional based on state
    if (state.showPinGuide) {
      page.drawCircle({
        x: position.x,
        y: A4_PAGE.pageHeight - position.y,
        size: pinRadius,
        borderColor: rgb(0.5, 0.5, 0.5),
        borderWidth: 0.5,
        borderDashArray: [3, 3],
      });
    }
    
    // Draw text overlay
    if (imageState.textLines.length > 0) {
      drawTextToPDF(
        page,
        imageState.textLines,
        position.x,
        A4_PAGE.pageHeight - position.y,
        config.pinSizePt,
        imageState.textPosition,
        imageState.textColor,
        imageState.textOutline,
        imageState.textOutlineWidth
      );
    }
  }
  
  // Serialize PDF
  return await pdfDoc.save();
}

/**
 * Parse color string to pdf-lib RGB
 * @param {string} color
 * @returns {any}
 */
function parseColor(color) {
  // Simple hex parser
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  
  // RGB parser
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return rgb(
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255
    );
  }
  
  // Named colors (basic support)
  const namedColors = {
    white: rgb(1, 1, 1),
    black: rgb(0, 0, 0),
    red: rgb(1, 0, 0),
    green: rgb(0, 1, 0),
    blue: rgb(0, 0, 1),
    yellow: rgb(1, 1, 0),
    cyan: rgb(0, 1, 1),
    magenta: rgb(1, 0, 1),
  };
  
  return namedColors[color.toLowerCase()] || rgb(0, 0, 0);
}

/**
 * Draw text overlay to PDF page (simplified - pdf-lib has limited text rendering)
 * @param {any} page
 * @param {{text: string, size?: number}[]} textLines
 * @param {number} x
 * @param {number} y
 * @param {number} pinDiameter
 * @param {'top' | 'center' | 'bottom'} position
 * @param {string} textColor
 * @param {string} _textOutline
 * @param {number} _textOutlineWidth
 */
function drawTextToPDF(
  page,
  textLines,
  x,
  y,
  pinDiameter,
  position,
  textColor,
  _textOutline,
  _textOutlineWidth
) {
  if (textLines.length === 0) return;
  
  const pinRadius = pinDiameter / 2;
  const autoSize = pinDiameter / 8;
  
  const lineSizes = textLines.map(line => line.size || autoSize);
  const lineHeights = lineSizes.map(size => size * 1.2);
  const totalHeight = lineHeights.reduce((sum, height) => sum + height, 0);
  
  let startY = y;
  if (position === 'top') {
    startY = y + pinRadius * 0.6 + totalHeight / 2;
  } else if (position === 'center') {
    startY = y + totalHeight / 2;
  } else {
    startY = y - pinRadius * 0.6 + totalHeight / 2;
  }
  
  const color = parseColor(textColor);
  
  let currentY = startY;
  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i];
    const fontSize = lineSizes[i];
    const lineHeight = lineHeights[i];
    
    // Simple centered text (pdf-lib doesn't support strokes easily)
    const textWidth = fontSize * line.text.length * 0.6; // Rough estimate
    page.drawText(line.text, {
      x: x - textWidth / 2,
      y: currentY - fontSize / 2,
      size: fontSize,
      color: color,
    });
    
    currentY -= lineHeight;
  }
}
