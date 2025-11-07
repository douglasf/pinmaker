import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fs from 'fs';
import { PinConfig, PinSize, PIN_CONFIGS, A4_PAGE } from './types.js';
import { calculateLayout, getTotalPages } from './layout.js';

/**
 * Process an image to fit within the pin size (not the full circle)
 * Fits the entire image (including rectangles) within the circular area
 */
async function processImage(
  imagePath: string,
  pinDiameter: number
): Promise<Buffer> {
  // Read and process the image
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions: ${imagePath}`);
  }
  
  // Convert pin diameter from points to pixels (assuming 72 DPI for PDF)
  // We'll use 2x resolution for better quality
  const targetSize = Math.round(pinDiameter * 2);
  
  // Resize image to fit within a square (targetSize x targetSize)
  // using 'contain' to ensure the entire image fits without cropping
  // This will add transparent padding if the image is not square
  const processedBuffer = await image
    .resize(targetSize, targetSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }, // white background
      position: 'center',
    })
    .png()
    .toBuffer();
  
  return processedBuffer;
}

/**
 * Draw a circular clipped image on the PDF
 * @param imageDiameter - The actual pin size (32mm or 58mm)
 * @param circleDiameter - The cutting circle size (43mm or 70mm)
 */
function drawCircularImage(
  doc: PDFKit.PDFDocument,
  imageBuffer: Buffer,
  x: number,
  y: number,
  imageDiameter: number,
  circleDiameter: number
): void {
  const imageRadius = imageDiameter / 2;
  const circleRadius = circleDiameter / 2;
  
  // Save the current graphics state
  doc.save();
  
  // Create circular clipping path for the image (at pin size)
  doc.circle(x, y, imageRadius).clip();
  
  // Draw the image centered, sized to pin diameter
  doc.image(imageBuffer, x - imageRadius, y - imageRadius, {
    width: imageDiameter,
    height: imageDiameter,
  });
  
  // Restore graphics state
  doc.restore();
  
  // Draw cutting circle outline (larger circle for bending paper)
  doc.circle(x, y, circleRadius).stroke();
}

/**
 * Create image distribution array - which image index goes in which circle
 * If fewer images than circles: distributes images evenly with duplication
 * If more images than circles: uses each image once (no duplication)
 */
function createImageDistribution(imageCount: number, totalCircles: number): number[] {
  const distribution: number[] = [];
  
  if (imageCount <= totalCircles) {
    // Duplicate images to fill all circles
    const copiesPerImage = Math.floor(totalCircles / imageCount);
    const remainder = totalCircles % imageCount;
    
    // Distribute images evenly
    for (let imageIdx = 0; imageIdx < imageCount; imageIdx++) {
      // Each image gets copiesPerImage copies, plus one extra for the first 'remainder' images
      const copies = copiesPerImage + (imageIdx < remainder ? 1 : 0);
      for (let copy = 0; copy < copies; copy++) {
        distribution.push(imageIdx);
      }
    }
  } else {
    // More images than circles: use each image once, no duplication
    for (let i = 0; i < totalCircles; i++) {
      distribution.push(i);
    }
  }
  
  return distribution;
}

/**
 * Generate PDF with images in circles
 */
export async function generatePinPDF(
  imagePaths: string[],
  outputPath: string,
  pinSize: PinSize
): Promise<void> {
  const config: PinConfig = PIN_CONFIGS[pinSize];
  
  // Calculate total circles needed
  // If we have more images than circlesPerPage, we need multiple pages
  const totalCircles = Math.max(imagePaths.length, config.circlesPerPage);
  const positions = calculateLayout(totalCircles, config);
  const totalPages = getTotalPages(positions);
  
  // Create image distribution array (which image goes in which circle)
  const imageDistribution = createImageDistribution(imagePaths.length, totalCircles);
  
  console.log(`Processing ${imagePaths.length} unique image${imagePaths.length !== 1 ? 's' : ''}...`);
  console.log(`Pin size: ${config.pinSize}mm (circle: ${config.circleSize}mm)`);
  console.log(`Layout: ${totalCircles} circles on ${totalPages} page${totalPages !== 1 ? 's' : ''} (${config.circlesPerPage} per page)`);
  
  // Display duplication info
  if (imagePaths.length < config.circlesPerPage) {
    const copiesPerImage = Math.floor(totalCircles / imagePaths.length);
    const imagesWithExtra = totalCircles % imagePaths.length;
    
    if (imagesWithExtra === 0) {
      console.log(`Each image will be duplicated ${copiesPerImage} times`);
    } else {
      console.log(`${imagesWithExtra} image${imagesWithExtra !== 1 ? 's' : ''} duplicated ${copiesPerImage + 1} times, ${imagePaths.length - imagesWithExtra} duplicated ${copiesPerImage} times`);
    }
  } else if (imagePaths.length > config.circlesPerPage) {
    console.log(`Multiple pages needed: ${config.circlesPerPage} circles per page`);
  }
  
  // Process all unique images first (size to pin diameter, not circle diameter)
  const processedImages: Buffer[] = [];
  for (let i = 0; i < imagePaths.length; i++) {
    console.log(`Processing image ${i + 1}/${imagePaths.length}: ${imagePaths[i]}`);
    const buffer = await processImage(imagePaths[i], config.pinSizePt);
    processedImages.push(buffer);
  }
  
  // Create PDF
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: false,
  });
  
  // Pipe to file
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  
  // Draw circles on pages
  let currentPage = -1;
  
  for (let circleIdx = 0; circleIdx < totalCircles; circleIdx++) {
    const position = positions[circleIdx];
    const imageIdx = imageDistribution[circleIdx];
    
    // Add new page if needed
    if (position.page !== currentPage) {
      doc.addPage({
        size: 'A4',
        margin: 0,
      });
      currentPage = position.page;
      console.log(`Generating page ${currentPage + 1}/${totalPages}...`);
    }
    
    // Draw the circular image (image at pin size, circle at cutting size)
    drawCircularImage(
      doc,
      processedImages[imageIdx],
      position.x,
      position.y,
      config.pinSizePt,
      config.circleSizePt
    );
  }
  
  // Finalize PDF
  doc.end();
  
  // Wait for stream to finish
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  
  console.log(`✓ PDF generated: ${outputPath}`);
}
