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
 * Draws a circular image with a solid color background.
 */
function drawCircularImage(
  doc: PDFKit.PDFDocument,
  foregroundBuffer: Buffer,
  edgeColor: { r: number; g: number; b: number } | undefined,
  x: number,
  y: number,
  pinDiameter: number,
  circleDiameter: number
): void {
  const circleRadius = circleDiameter / 2;
  const pinRadius = pinDiameter / 2;

  doc.save();
  
  if (edgeColor) {
    const hexColor = `#${edgeColor.r.toString(16).padStart(2, '0')}${edgeColor.g.toString(16).padStart(2, '0')}${edgeColor.b.toString(16).padStart(2, '0')}`;
    // Draw the solid color background circle
    doc.circle(x, y, circleRadius).fill(hexColor);
  }

  // Draw the foreground image on top, centered and sized to the pin diameter
  doc.image(foregroundBuffer, x - pinRadius, y - pinRadius, {
    width: pinDiameter,
    height: pinDiameter,
  });

  // Draw the cutting outline
  doc.circle(x, y, circleRadius).stroke();
  
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
  fill: boolean
): Promise<void> {
  const config: PinConfig = PIN_CONFIGS[pinSize];
  const totalCircles = Math.max(imagePaths.length, config.circlesPerPage);
  const positions = calculateLayout(totalCircles, config);
  const totalPages = getTotalPages(positions);
  const imageDistribution = createImageDistribution(imagePaths.length, totalCircles);

  console.log(`Processing ${imagePaths.length} unique image(s)...`);
  console.log(`Pin size: ${config.pinSize}mm (circle: ${config.circleSize}mm)`);
  console.log(`Layout: ${totalCircles} circles on ${totalPages} page(s) (${config.circlesPerPage} per page)`);

  if (imagePaths.length < config.circlesPerPage) {
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
      config.circleSizePt
    );
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  console.log(`✓ PDF generated: ${outputPath}`);
}
