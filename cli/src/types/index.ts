export type PinSize = '32mm' | '58mm';

export interface PinConfig {
  pinSize: number; // actual pin size in mm
  pinSizePt: number; // actual pin size in points (for PDF)
  circleSize: number; // circle diameter in mm (for cutting)
  circleSizePt: number; // circle diameter in points (for PDF)
  circlesPerPage: number; // fixed number of circles per page
}

export interface LayoutConfig {
  pageWidth: number; // in points
  pageHeight: number; // in points
  margin: number; // in points
  spacing: number; // spacing between circles in points
}

export interface CirclePosition {
  x: number;
  y: number;
  page: number;
}

export const PIN_CONFIGS: Record<PinSize, PinConfig> = {
  '32mm': {
    pinSize: 32,
    pinSizePt: 32 * 2.83465, // mm to points conversion
    circleSize: 43,
    circleSizePt: 43 * 2.83465, // mm to points conversion
    circlesPerPage: 20, // Always 20 circles for 32mm pins
  },
  '58mm': {
    pinSize: 58,
    pinSizePt: 58 * 2.83465,
    circleSize: 70,
    circleSizePt: 70 * 2.83465,
    circlesPerPage: 6, // Always 6 circles for 58mm pins
  },
};

// A4 size in points (595.28 × 841.89)
export const A4_PAGE: LayoutConfig = {
  pageWidth: 595.28,
  pageHeight: 841.89,
  margin: 28.35, // 10mm margin
  spacing: 14.17, // 5mm spacing between circles
};

// Text configuration types
export interface TextLine {
  text: string;
  size?: number; // Optional size override for this line in points
}

export type TextPin = TextLine[]; // One pin can have multiple lines of text
