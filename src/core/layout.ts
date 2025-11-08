import { A4_PAGE, CirclePosition, PinConfig } from '../types/index.js';

/**
 * Calculate optimal grid layout for a fixed number of circles on a page
 * Always uses config.circlesPerPage circles per page
 */
export function calculateLayout(
  totalCircles: number,
  config: PinConfig
): CirclePosition[] {
  const positions: CirclePosition[] = [];
  const circleDiameter = config.circleSizePt;
  
  if (totalCircles === 0) return positions;
  
  const totalPages = Math.ceil(totalCircles / config.circlesPerPage);
  
  for (let page = 0; page < totalPages; page++) {
    const circlesOnThisPage = Math.min(
      config.circlesPerPage,
      totalCircles - page * config.circlesPerPage
    );
    
    // Calculate optimal grid for this page
    const layout = calculatePageLayout(circlesOnThisPage, circleDiameter);
    
    // Generate positions for circles on this page
    for (let i = 0; i < circlesOnThisPage; i++) {
      const row = Math.floor(i / layout.cols);
      const col = i % layout.cols;
      
      const x = layout.startX + col * (circleDiameter + A4_PAGE.spacing) + circleDiameter / 2;
      const y = layout.startY + row * (circleDiameter + A4_PAGE.spacing) + circleDiameter / 2;
      
      positions.push({ x, y, page });
    }
  }
  
  return positions;
}

/**
 * Calculate the optimal layout for a specific number of circles on a page
 * Optimized for A4 portrait orientation (taller than wide)
 */
function calculatePageLayout(
  circleCount: number,
  circleDiameter: number
): { rows: number; cols: number; startX: number; startY: number } {
  const availableWidth = A4_PAGE.pageWidth - 2 * A4_PAGE.margin;
  const availableHeight = A4_PAGE.pageHeight - 2 * A4_PAGE.margin;
  
  // Calculate max columns that fit in width
  const maxCols = Math.floor((availableWidth + A4_PAGE.spacing) / (circleDiameter + A4_PAGE.spacing));
  
  // For A4 portrait, we want fewer columns (more rows)
  // Start with the minimum columns needed and work up if necessary
  let bestCols = Math.ceil(Math.sqrt(circleCount));
  let bestRows = Math.ceil(circleCount / bestCols);
  
  // But prioritize fitting within page width - use fewer columns if possible
  for (let cols = 1; cols <= maxCols; cols++) {
    const rows = Math.ceil(circleCount / cols);
    const totalHeightUsed = rows * circleDiameter + (rows - 1) * A4_PAGE.spacing;
    
    // If it fits in height, prefer fewer columns (taller grid)
    if (totalHeightUsed <= availableHeight) {
      bestCols = cols;
      bestRows = rows;
      break;
    }
  }
  
  // Center the grid on the page
  const totalWidthUsed = bestCols * circleDiameter + (bestCols - 1) * A4_PAGE.spacing;
  const totalHeightUsed = bestRows * circleDiameter + (bestRows - 1) * A4_PAGE.spacing;
  
  const startX = (A4_PAGE.pageWidth - totalWidthUsed) / 2;
  const startY = (A4_PAGE.pageHeight - totalHeightUsed) / 2;
  
  return { rows: bestRows, cols: bestCols, startX, startY };
}

/**
 * Get total number of pages needed
 */
export function getTotalPages(positions: CirclePosition[]): number {
  if (positions.length === 0) return 0;
  return Math.max(...positions.map(p => p.page)) + 1;
}
