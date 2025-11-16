/**
 * Extract average edge color from an image using Canvas API
 * Samples from multiple rings moving inward to find non-transparent pixels
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
  
  const alphaThreshold = 128; // Higher threshold to skip semi-transparent pixels
  const maxInset = Math.min(width, height) * 0.1; // Sample up to 10% inward
  const insetStep = Math.max(1, Math.floor(maxInset / 5)); // Try up to 5 rings
  
  // Try sampling from progressively more inward positions
  for (let inset = 0; inset <= maxInset && pixelCount < 100; inset += insetStep) {
    // Sample top edge
    if (inset < height) {
      const topData = ctx.getImageData(inset, inset, width - inset * 2, 1);
      for (let x = 0; x < width - inset * 2; x++) {
        const idx = x * 4;
        const alpha = topData.data[idx + 3];
        if (alpha > alphaThreshold) {
          totalR += topData.data[idx];
          totalG += topData.data[idx + 1];
          totalB += topData.data[idx + 2];
          pixelCount++;
        }
      }
    }
    
    // Sample bottom edge
    if (inset < height) {
      const bottomY = height - 1 - inset;
      const bottomData = ctx.getImageData(inset, bottomY, width - inset * 2, 1);
      for (let x = 0; x < width - inset * 2; x++) {
        const idx = x * 4;
        const alpha = bottomData.data[idx + 3];
        if (alpha > alphaThreshold) {
          totalR += bottomData.data[idx];
          totalG += bottomData.data[idx + 1];
          totalB += bottomData.data[idx + 2];
          pixelCount++;
        }
      }
    }
    
    // Sample left edge (skip corners already sampled)
    if (inset < width && height - inset * 2 - 2 > 0) {
      const leftData = ctx.getImageData(inset, inset + 1, 1, height - inset * 2 - 2);
      for (let y = 0; y < height - inset * 2 - 2; y++) {
        const idx = y * 4;
        const alpha = leftData.data[idx + 3];
        if (alpha > alphaThreshold) {
          totalR += leftData.data[idx];
          totalG += leftData.data[idx + 1];
          totalB += leftData.data[idx + 2];
          pixelCount++;
        }
      }
    }
    
    // Sample right edge (skip corners already sampled)
    if (inset < width && height - inset * 2 - 2 > 0) {
      const rightX = width - 1 - inset;
      const rightData = ctx.getImageData(rightX, inset + 1, 1, height - inset * 2 - 2);
      for (let y = 0; y < height - inset * 2 - 2; y++) {
        const idx = y * 4;
        const alpha = rightData.data[idx + 3];
        if (alpha > alphaThreshold) {
          totalR += rightData.data[idx];
          totalG += rightData.data[idx + 1];
          totalB += rightData.data[idx + 2];
          pixelCount++;
        }
      }
    }
    
    // If we found enough opaque pixels, stop searching
    if (pixelCount >= 100) break;
  }
  
  if (pixelCount === 0) {
    // Fallback: return white if no opaque pixels found
    return { r: 255, g: 255, b: 255 };
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
  let fillColor = null;
  
  // Check if backgroundColor is set and not empty
  if (imageState.backgroundColor && imageState.backgroundColor.trim() !== '') {
    fillColor = imageState.backgroundColor;
  } else if (imageState.fillWithEdgeColor && edgeColor) {
    fillColor = `rgb(${edgeColor.r}, ${edgeColor.g}, ${edgeColor.b})`;
  }
  
  // Draw background circle if specified (fills to outer circle)
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Clip to circular shape for the image (at pin size)
  ctx.beginPath();
  ctx.arc(x, y, pinRadius, 0, Math.PI * 2);
  ctx.clip();
  
  // Draw the image
  ctx.drawImage(processedBitmap, x - pinRadius, y - pinRadius, config.pinSizePt, config.pinSizePt);
  
  // Reset clipping
  ctx.restore();
  ctx.save();
  
  // Draw border ring ON TOP of image if specified
  // Formula: gapDiameter = (outerCircleDiameter - pinDiameter)
  //          totalGapDiameter = gapDiameter + borderWidth
  //          borderInnerDiameter = outerCircleDiameter - totalGapDiameter
  if (imageState.borderColor && imageState.borderWidth > 0) {
    const borderWidthPt = imageState.borderWidth * 2.83465; // mm to pt
    const circleDiameter = config.circleSizePt;
    const pinDiameter = config.pinSizePt;
    const gapDiameter = circleDiameter - pinDiameter;
    const totalGapDiameter = gapDiameter + borderWidthPt;
    const borderInnerRadius = (circleDiameter - totalGapDiameter) / 2;
    const borderOuterRadius = circleRadius;
    const borderRingWidth = borderOuterRadius - borderInnerRadius;
    
    // Draw border as a stroked ring
    ctx.strokeStyle = imageState.borderColor;
    ctx.lineWidth = borderRingWidth;
    const borderMidRadius = borderInnerRadius + borderRingWidth / 2;
    ctx.beginPath();
    ctx.arc(x, y, borderMidRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Draw text overlay
  if (imageState.textLines.length > 0) {
    drawTextOverlay(ctx, imageState.textLines, x, y, config.pinSizePt, imageState.textPosition, imageState.textColor, imageState.textOutline, imageState.textOutlineWidth);
  }
  
  // Draw cutting outline (outer circle)
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw pin size guide circle (light gray dashed - always on top)
  ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(x, y, pinRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash
  
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
