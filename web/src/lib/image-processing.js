/**
 * Extract average edge color from an image using Canvas API
 * @param {ImageBitmap} bitmap
 * @returns {Promise<{r: number, g: number, b: number}>}
 */
export async function extractEdgeColor(bitmap) {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.drawImage(bitmap, 0, 0);
  
  const { width, height } = bitmap;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let pixelCount = 0;
  
  const alphaThreshold = 10;
  
  // Sample top edge
  const topData = ctx.getImageData(0, 0, width, 1);
  for (let x = 0; x < width; x++) {
    const idx = x * 4;
    const alpha = topData.data[idx + 3];
    if (alpha > alphaThreshold) {
      totalR += topData.data[idx];
      totalG += topData.data[idx + 1];
      totalB += topData.data[idx + 2];
      pixelCount++;
    }
  }
  
  // Sample bottom edge
  const bottomData = ctx.getImageData(0, height - 1, width, 1);
  for (let x = 0; x < width; x++) {
    const idx = x * 4;
    const alpha = bottomData.data[idx + 3];
    if (alpha > alphaThreshold) {
      totalR += bottomData.data[idx];
      totalG += bottomData.data[idx + 1];
      totalB += bottomData.data[idx + 2];
      pixelCount++;
    }
  }
  
  // Sample left edge (skip corners)
  const leftData = ctx.getImageData(0, 1, 1, height - 2);
  for (let y = 0; y < height - 2; y++) {
    const idx = y * 4;
    const alpha = leftData.data[idx + 3];
    if (alpha > alphaThreshold) {
      totalR += leftData.data[idx];
      totalG += leftData.data[idx + 1];
      totalB += leftData.data[idx + 2];
      pixelCount++;
    }
  }
  
  // Sample right edge (skip corners)
  const rightData = ctx.getImageData(width - 1, 1, 1, height - 2);
  for (let y = 0; y < height - 2; y++) {
    const idx = y * 4;
    const alpha = rightData.data[idx + 3];
    if (alpha > alphaThreshold) {
      totalR += rightData.data[idx];
      totalG += rightData.data[idx + 1];
      totalB += rightData.data[idx + 2];
      pixelCount++;
    }
  }
  
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
 * Process image with zoom and offset transformations
 * @param {ImageBitmap} bitmap
 * @param {number} pinDiameter
 * @param {number} circleDiameter
 * @param {number} zoom
 * @param {number} offsetX
 * @param {number} offsetY
 * @returns {Promise<ImageBitmap>}
 */
export async function processImageForCircle(
  bitmap,
  pinDiameter,
  circleDiameter,
  zoom = 1.0,
  offsetX = 0,
  offsetY = 0
) {
  const boundarySize = Math.round(circleDiameter);
  const zoomedSize = Math.round(boundarySize * zoom);
  
  // Create canvas for resize with zoom
  const resizeCanvas = new OffscreenCanvas(zoomedSize, zoomedSize);
  const resizeCtx = resizeCanvas.getContext('2d');
  if (!resizeCtx) throw new Error('Failed to get resize context');
  
  // Calculate scale to fit image in zoomed boundary (contain mode)
  const scale = Math.min(zoomedSize / bitmap.width, zoomedSize / bitmap.height);
  const scaledWidth = bitmap.width * scale;
  const scaledHeight = bitmap.height * scale;
  
  // Center the image
  const x = (zoomedSize - scaledWidth) / 2;
  const y = (zoomedSize - scaledHeight) / 2;
  
  resizeCtx.drawImage(bitmap, x, y, scaledWidth, scaledHeight);
  
  // Handle viewport extraction
  const needsViewportExtraction = zoom >= 1.0 || offsetX !== 0 || offsetY !== 0;
  
  if (needsViewportExtraction) {
    const canvasSize = zoom >= 1.0 ? zoomedSize : Math.round(boundarySize * 1.5);
    const workCanvas = new OffscreenCanvas(canvasSize, canvasSize);
    const workCtx = workCanvas.getContext('2d');
    if (!workCtx) throw new Error('Failed to get work context');
    
    // Position the resized image with offset
    const imageLeft = Math.round((canvasSize - zoomedSize) / 2 + offsetX);
    const imageTop = Math.round((canvasSize - zoomedSize) / 2 + offsetY);
    
    workCtx.drawImage(resizeCanvas, imageLeft, imageTop);
    
    // Extract viewport
    const extractLeft = Math.round((canvasSize - boundarySize) / 2);
    const extractTop = Math.round((canvasSize - boundarySize) / 2);
    
    const viewportCanvas = new OffscreenCanvas(boundarySize, boundarySize);
    const viewportCtx = viewportCanvas.getContext('2d');
    if (!viewportCtx) throw new Error('Failed to get viewport context');
    
    viewportCtx.drawImage(
      workCanvas,
      extractLeft,
      extractTop,
      boundarySize,
      boundarySize,
      0,
      0,
      boundarySize,
      boundarySize
    );
    
    // Crop to pin diameter if needed
    if (circleDiameter > pinDiameter) {
      const cropOffset = Math.round((circleDiameter - pinDiameter) / 2);
      const finalCanvas = new OffscreenCanvas(Math.round(pinDiameter), Math.round(pinDiameter));
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) throw new Error('Failed to get final context');
      
      finalCtx.drawImage(
        viewportCanvas,
        cropOffset,
        cropOffset,
        Math.round(pinDiameter),
        Math.round(pinDiameter),
        0,
        0,
        Math.round(pinDiameter),
        Math.round(pinDiameter)
      );
      
      return await createImageBitmap(finalCanvas);
    }
    
    return await createImageBitmap(viewportCanvas);
  } else {
    // Simple center composite for zoom < 1 with no offset
    const finalCanvas = new OffscreenCanvas(boundarySize, boundarySize);
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error('Failed to get final context');
    
    const left = Math.round((boundarySize - zoomedSize) / 2);
    const top = Math.round((boundarySize - zoomedSize) / 2);
    
    finalCtx.drawImage(resizeCanvas, left, top);
    
    return await createImageBitmap(finalCanvas);
  }
}

/**
 * Render a single pin to canvas
 * @param {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D} ctx
 * @param {ImageBitmap} processedBitmap
 * @param {number} x
 * @param {number} y
 * @param {import('../core/types.js').PinConfig} config
 * @param {import('../core/types.js').ImageState} imageState
 * @param {{r: number, g: number, b: number}} [edgeColor]
 */
export function renderPinToCanvas(
  ctx,
  processedBitmap,
  x,
  y,
  config,
  imageState,
  edgeColor
) {
  const circleRadius = config.circleSizePt / 2;
  const pinRadius = config.pinSizePt / 2;
  
  ctx.save();
  
  // Determine background fill
  let fillColor = imageState.backgroundColor;
  if (!fillColor && imageState.fillWithEdgeColor && edgeColor) {
    fillColor = `rgb(${edgeColor.r}, ${edgeColor.g}, ${edgeColor.b})`;
  }
  
  // Draw border ring if specified
  if (imageState.borderColor && imageState.borderWidth > 0) {
    const borderWidthPt = imageState.borderWidth * 2.83465;
    ctx.fillStyle = imageState.borderColor;
    ctx.beginPath();
    ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Cut out inner circle
    if (fillColor) {
      ctx.fillStyle = fillColor;
    } else {
      ctx.fillStyle = 'white';
    }
    ctx.beginPath();
    ctx.arc(x, y, circleRadius - borderWidthPt, 0, Math.PI * 2);
    ctx.fill();
  } else if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw the image
  ctx.drawImage(processedBitmap, x - pinRadius, y - pinRadius, config.pinSizePt, config.pinSizePt);
  
  // Draw cutting outline
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw text overlay
  if (imageState.textLines.length > 0) {
    drawTextOverlay(ctx, imageState.textLines, x, y, config.pinSizePt, imageState.textPosition, imageState.textColor, imageState.textOutline, imageState.textOutlineWidth);
  }
  
  ctx.restore();
}

/**
 * Draw text overlay on a pin
 * @param {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D} ctx
 * @param {{text: string, size?: number}[]} textLines
 * @param {number} x
 * @param {number} y
 * @param {number} pinDiameter
 * @param {'top' | 'center' | 'bottom'} position
 * @param {string} textColor
 * @param {string} textOutline
 * @param {number} textOutlineWidth
 */
function drawTextOverlay(
  ctx,
  textLines,
  x,
  y,
  pinDiameter,
  position,
  textColor,
  textOutline,
  textOutlineWidth
) {
  if (textLines.length === 0) return;
  
  const pinRadius = pinDiameter / 2;
  const autoSize = pinDiameter / 8;
  
  const lineSizes = textLines.map(line => line.size || autoSize);
  const lineHeights = lineSizes.map(size => size * 1.2);
  const totalHeight = lineHeights.reduce((sum, height) => sum + height, 0);
  
  let startY = y;
  if (position === 'top') {
    startY = y - pinRadius * 0.6 - totalHeight / 2;
  } else if (position === 'center') {
    startY = y - totalHeight / 2;
  } else {
    startY = y + pinRadius * 0.6 - totalHeight / 2;
  }
  
  ctx.font = 'bold 12px Helvetica';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  let currentY = startY;
  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i];
    const fontSize = lineSizes[i];
    const lineHeight = lineHeights[i];
    
    ctx.font = `bold ${fontSize}px Helvetica`;
    
    // Draw outline
    if (textOutline && textOutlineWidth > 0) {
      ctx.strokeStyle = textOutline;
      ctx.lineWidth = textOutlineWidth;
      ctx.strokeText(line.text, x, currentY);
    }
    
    // Draw main text
    ctx.fillStyle = textColor;
    ctx.fillText(line.text, x, currentY);
    
    currentY += lineHeight;
  }
}
