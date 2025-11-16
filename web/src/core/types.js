// Shared types for browser implementation

/**
 * @typedef {'32mm' | '58mm'} PinSize
 */

/**
 * @typedef {Object} PinConfig
 * @property {number} pinSize - actual pin size in mm
 * @property {number} pinSizePt - actual pin size in points (for PDF)
 * @property {number} circleSize - circle diameter in mm (for cutting)
 * @property {number} circleSizePt - circle diameter in points (for PDF)
 * @property {number} circlesPerPage - fixed number of circles per page
 */

/**
 * @typedef {Object} LayoutConfig
 * @property {number} pageWidth - in points
 * @property {number} pageHeight - in points
 * @property {number} margin - in points
 * @property {number} spacing - spacing between circles in points
 */

/**
 * @typedef {Object} CirclePosition
 * @property {number} x
 * @property {number} y
 * @property {number} page
 */

/**
 * @type {Record<PinSize, PinConfig>}
 */
export const PIN_CONFIGS = {
  '32mm': {
    pinSize: 36, // 32mm + 4mm for paper bend
    pinSizePt: 36 * 2.83465, // mm to points conversion
    circleSize: 43,
    circleSizePt: 43 * 2.83465,
    circlesPerPage: 20,
  },
  '58mm': {
    pinSize: 62, // 58mm + 4mm for paper bend
    pinSizePt: 62 * 2.83465,
    circleSize: 70,
    circleSizePt: 70 * 2.83465,
    circlesPerPage: 6,
  },
};

/**
 * A4 size in points (595.28 × 841.89)
 * @type {LayoutConfig}
 */
export const A4_PAGE = {
  pageWidth: 595.28,
  pageHeight: 841.89,
  margin: 28.35, // 10mm margin
  spacing: 14.17, // 5mm spacing between circles
};

/**
 * @typedef {Object} TextLine
 * @property {string} text
 * @property {number} [size] - Optional size override for this line in points
 */

/**
 * @typedef {TextLine[]} TextPin - One pin can have multiple lines of text
 */

/**
 * @typedef {Object} ImageState
 * @property {File} file
 * @property {string} url - Object URL for preview
 * @property {ImageBitmap} [bitmap] - Decoded bitmap for processing
 * @property {number} zoom
 * @property {number} offsetX
 * @property {number} offsetY
 * @property {boolean} fillWithEdgeColor
 * @property {string} backgroundColor
 * @property {string} borderColor
 * @property {number} borderWidth - in mm
 * @property {TextLine[]} textLines
 * @property {'top' | 'center' | 'bottom'} textPosition
 * @property {string} textColor
 * @property {string} textOutline
 * @property {number} textOutlineWidth
 */

/**
 * @typedef {Object} AppState
 * @property {ImageState[]} images
 * @property {PinSize} pinSize
 * @property {boolean} duplicate
 * @property {number} currentImageIndex
 */
