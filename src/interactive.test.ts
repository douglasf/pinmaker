import { describe, it, expect } from 'vitest';
import { sortImages, filterImages, formatFileSize, ImageFileInfo } from './interactive.js';

describe('Interactive Mode Utilities', () => {
  // Sample test data
  const mockImages: ImageFileInfo[] = [
    {
      file: '/path/img1.png',
      fileName: 'zebra.png',
      size: 1024 * 50, // 50KB
      sizeFormatted: '50.0KB',
      dimensions: '800x600',
      width: 800,
      height: 600,
      modifiedTime: 1000
    },
    {
      file: '/path/img2.png',
      fileName: 'alpha.png',
      size: 1024 * 1024 * 2, // 2MB
      sizeFormatted: '2.0MB',
      dimensions: '1920x1080',
      width: 1920,
      height: 1080,
      modifiedTime: 3000
    },
    {
      file: '/path/img3.png',
      fileName: 'beta.png',
      size: 500, // 500B
      sizeFormatted: '500B',
      dimensions: '400x300',
      width: 400,
      height: 300,
      modifiedTime: 2000
    }
  ];

  describe('sortImages', () => {
    it('should sort by name alphabetically', () => {
      const sorted = sortImages(mockImages, 'name');
      
      expect(sorted[0].fileName).toBe('alpha.png');
      expect(sorted[1].fileName).toBe('beta.png');
      expect(sorted[2].fileName).toBe('zebra.png');
    });

    it('should sort by size (largest first)', () => {
      const sorted = sortImages(mockImages, 'size');
      
      expect(sorted[0].size).toBe(1024 * 1024 * 2); // 2MB
      expect(sorted[1].size).toBe(1024 * 50); // 50KB
      expect(sorted[2].size).toBe(500); // 500B
    });

    it('should sort by dimensions (largest area first)', () => {
      const sorted = sortImages(mockImages, 'dimensions');
      
      expect(sorted[0].width * sorted[0].height).toBe(1920 * 1080);
      expect(sorted[1].width * sorted[1].height).toBe(800 * 600);
      expect(sorted[2].width * sorted[2].height).toBe(400 * 300);
    });

    it('should sort by date (most recent first)', () => {
      const sorted = sortImages(mockImages, 'date');
      
      expect(sorted[0].modifiedTime).toBe(3000);
      expect(sorted[1].modifiedTime).toBe(2000);
      expect(sorted[2].modifiedTime).toBe(1000);
    });

    it('should not modify original array', () => {
      const originalOrder = mockImages.map(img => img.fileName);
      sortImages(mockImages, 'name');
      
      expect(mockImages.map(img => img.fileName)).toEqual(originalOrder);
    });

    it('should handle empty array', () => {
      const sorted = sortImages([], 'name');
      expect(sorted).toEqual([]);
    });

    it('should handle single image', () => {
      const singleImage = [mockImages[0]];
      const sorted = sortImages(singleImage, 'name');
      
      expect(sorted).toHaveLength(1);
      expect(sorted[0]).toEqual(mockImages[0]);
    });
  });

  describe('filterImages', () => {
    it('should filter by filename (case-insensitive)', () => {
      const filtered = filterImages(mockImages, 'alpha');
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].fileName).toBe('alpha.png');
    });

    it('should filter by partial filename match', () => {
      const filtered = filterImages(mockImages, 'eta');
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].fileName).toBe('beta.png');
    });

    it('should filter by dimensions', () => {
      const filtered = filterImages(mockImages, '1920');
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].dimensions).toBe('1920x1080');
    });

    it('should return all images for empty query', () => {
      const filtered = filterImages(mockImages, '');
      
      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(mockImages);
    });

    it('should return all images for whitespace-only query', () => {
      const filtered = filterImages(mockImages, '   ');
      
      expect(filtered).toHaveLength(3);
    });

    it('should return empty array when no matches', () => {
      const filtered = filterImages(mockImages, 'nonexistent');
      
      expect(filtered).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const filtered = filterImages(mockImages, 'ALPHA');
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].fileName).toBe('alpha.png');
    });

    it('should match multiple results', () => {
      const filtered = filterImages(mockImages, '.png');
      
      expect(filtered).toHaveLength(3);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0B');
      expect(formatFileSize(100)).toBe('100B');
      expect(formatFileSize(1023)).toBe('1023B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0KB');
      expect(formatFileSize(1536)).toBe('1.5KB');
      expect(formatFileSize(51200)).toBe('50.0KB');
      expect(formatFileSize(1024 * 1023)).toBe('1023.0KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5MB');
      expect(formatFileSize(1024 * 1024 * 10)).toBe('10.0MB');
    });

    it('should round to 1 decimal place', () => {
      expect(formatFileSize(1234)).toBe('1.2KB');
      expect(formatFileSize(1024 * 1024 * 1.567)).toBe('1.6MB');
    });

    it('should handle large sizes', () => {
      expect(formatFileSize(1024 * 1024 * 1000)).toBe('1000.0MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1024.0MB');
    });
  });
});
