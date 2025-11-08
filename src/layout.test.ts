import { describe, it, expect } from 'vitest';
import { calculateLayout, getTotalPages } from './layout.js';
import { A4_PAGE, PinConfig } from './types.js';

describe('Layout Calculations', () => {
  // Common configs for testing
  const config32mm: PinConfig = {
    pinSize: 32,
    pinSizePt: 90.71,
    circleSize: 43,
    circleSizePt: 121.89,
    circlesPerPage: 20
  };

  const config58mm: PinConfig = {
    pinSize: 58,
    pinSizePt: 164.41,
    circleSize: 70,
    circleSizePt: 198.43,
    circlesPerPage: 6
  };

  describe('calculateLayout', () => {
    it('should return empty array for 0 circles', () => {
      const positions = calculateLayout(0, config32mm);
      expect(positions).toEqual([]);
    });

    it('should calculate positions for single circle', () => {
      const positions = calculateLayout(1, config32mm);
      
      expect(positions).toHaveLength(1);
      expect(positions[0].page).toBe(0);
      expect(positions[0].x).toBeGreaterThan(0);
      expect(positions[0].y).toBeGreaterThan(0);
      // Should be centered on page
      expect(positions[0].x).toBeCloseTo(A4_PAGE.pageWidth / 2, 0);
    });

    it('should calculate positions for full page (20 circles for 32mm)', () => {
      const positions = calculateLayout(20, config32mm);
      
      expect(positions).toHaveLength(20);
      // All should be on page 0
      expect(positions.every(p => p.page === 0)).toBe(true);
      // All x positions should be within page bounds
      expect(positions.every(p => p.x >= 0 && p.x <= A4_PAGE.pageWidth)).toBe(true);
      // All y positions should be within page bounds
      expect(positions.every(p => p.y >= 0 && p.y <= A4_PAGE.pageHeight)).toBe(true);
    });

    it('should calculate positions for 6 circles (58mm pins)', () => {
      const positions = calculateLayout(6, config58mm);
      
      expect(positions).toHaveLength(6);
      expect(positions.every(p => p.page === 0)).toBe(true);
      // With larger circles, positions should be more spread out
      const minSpacing = config58mm.circleSizePt;
      for (let i = 0; i < positions.length - 1; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // Circles shouldn't overlap (distance should be at least circle diameter)
          expect(distance).toBeGreaterThanOrEqual(minSpacing - 1); // -1 for floating point tolerance
        }
      }
    });

    it('should distribute circles across multiple pages', () => {
      const positions = calculateLayout(25, config32mm);
      
      expect(positions).toHaveLength(25);
      // Should have circles on page 0 and page 1
      expect(positions.filter(p => p.page === 0)).toHaveLength(20);
      expect(positions.filter(p => p.page === 1)).toHaveLength(5);
    });

    it('should handle exactly 2 full pages', () => {
      const positions = calculateLayout(40, config32mm);
      
      expect(positions).toHaveLength(40);
      expect(positions.filter(p => p.page === 0)).toHaveLength(20);
      expect(positions.filter(p => p.page === 1)).toHaveLength(20);
    });

    it('should handle large number of circles (multiple pages for 58mm)', () => {
      const positions = calculateLayout(15, config58mm);
      
      expect(positions).toHaveLength(15);
      // 6 per page for 58mm, so 15 circles = 3 pages (6 + 6 + 3)
      expect(positions.filter(p => p.page === 0)).toHaveLength(6);
      expect(positions.filter(p => p.page === 1)).toHaveLength(6);
      expect(positions.filter(p => p.page === 2)).toHaveLength(3);
    });

    it('should maintain consistent spacing within a page', () => {
      const positions = calculateLayout(6, config32mm);
      
      // Get positions in first row
      const sortedByY = [...positions].sort((a, b) => a.y - b.y);
      const firstRowY = sortedByY[0].y;
      const firstRow = sortedByY.filter(p => Math.abs(p.y - firstRowY) < 1);
      
      if (firstRow.length > 1) {
        // Check x spacing is consistent
        const spacings: number[] = [];
        for (let i = 0; i < firstRow.length - 1; i++) {
          const sortedByX = firstRow.sort((a, b) => a.x - b.x);
          spacings.push(sortedByX[i + 1].x - sortedByX[i].x);
        }
        
        // All spacings should be roughly equal
        const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
        spacings.forEach(spacing => {
          expect(Math.abs(spacing - avgSpacing)).toBeLessThan(1);
        });
      }
    });

    it('should respect circle size in layout (32mm vs 58mm)', () => {
      const positions32 = calculateLayout(6, config32mm);
      const positions58 = calculateLayout(6, config58mm);
      
      // Both should have 6 circles on first page
      expect(positions32).toHaveLength(6);
      expect(positions58).toHaveLength(6);
      
      // Calculate average spacing for each
      const avgSpacing32 = calculateAverageSpacing(positions32);
      const avgSpacing58 = calculateAverageSpacing(positions58);
      
      // 58mm circles should have larger spacing
      expect(avgSpacing58).toBeGreaterThan(avgSpacing32);
    });

    it('should center single page layout on page', () => {
      const positions = calculateLayout(4, config32mm);
      
      // Get bounds of all positions
      const minX = Math.min(...positions.map(p => p.x));
      const maxX = Math.max(...positions.map(p => p.x));
      const minY = Math.min(...positions.map(p => p.y));
      const maxY = Math.max(...positions.map(p => p.y));
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      // Layout should be roughly centered on page
      expect(centerX).toBeCloseTo(A4_PAGE.pageWidth / 2, 0);
      expect(centerY).toBeCloseTo(A4_PAGE.pageHeight / 2, 0);
    });
  });

  describe('getTotalPages', () => {
    it('should return 0 for empty positions', () => {
      expect(getTotalPages([])).toBe(0);
    });

    it('should return 1 for single page', () => {
      const positions = calculateLayout(1, config32mm);
      expect(getTotalPages(positions)).toBe(1);
    });

    it('should return correct count for multiple pages', () => {
      const positions = calculateLayout(25, config32mm);
      expect(getTotalPages(positions)).toBe(2);
    });

    it('should return correct count for exactly 2 full pages', () => {
      const positions = calculateLayout(40, config32mm);
      expect(getTotalPages(positions)).toBe(2);
    });

    it('should return correct count for 3 pages (58mm pins)', () => {
      const positions = calculateLayout(15, config58mm);
      expect(getTotalPages(positions)).toBe(3);
    });
  });
});

// Helper function to calculate average spacing between circles
function calculateAverageSpacing(positions: { x: number; y: number; page: number }[]): number {
  if (positions.length < 2) return 0;
  
  let totalSpacing = 0;
  let count = 0;
  
  for (let i = 0; i < positions.length - 1; i++) {
    const dx = positions[i + 1].x - positions[i].x;
    const dy = positions[i + 1].y - positions[i].y;
    totalSpacing += Math.sqrt(dx * dx + dy * dy);
    count++;
  }
  
  return totalSpacing / count;
}
