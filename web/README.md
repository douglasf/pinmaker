# Pin Maker Web App

Browser-based pin maker for creating custom pin designs and exporting them as PDF layouts.

## Features

- **Mobile-First Design**: Optimized for mobile devices with touch gestures
- **Image Upload**: Select multiple images from your device
- **Pin Configuration**: Choose 32mm (20 per page) or 58mm (6 per page)
- **Per-Pin Customization**:
  - Zoom and pan with touch gestures
  - Custom background colors or auto edge-color detection
  - Border color and width
  - Multi-line text overlays with custom sizing
  - Text position (top, center, bottom)
  - Text color and outline
- **Live Preview**: Real-time preview of each pin as you edit
- **Multi-Page Layout**: Automatic A4 page layout with optimal spacing
- **PDF Export**: Generate print-ready PDF with cutting guides

## Development

### Setup

```bash
cd web
npm install
```

### Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in `web/dist/`.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **Select Images**: Tap the upload area and choose images from your device
2. **Configure**: Choose pin size (32mm or 58mm) and enable duplication if desired
3. **Edit Pins**: For each pin:
   - Use the zoom slider or pinch to zoom
   - Touch and drag on the canvas to pan
   - Add background color or use auto edge color
   - Add border with custom color and width
   - Add text lines with custom sizes
4. **Preview All**: Review the complete multi-page layout
5. **Export PDF**: Download the generated PDF

## Browser Support

- Modern browsers with ES2022 support
- Chrome/Edge (recommended for best performance)
- Safari (iOS 15+)
- Firefox

Requires support for:
- ES modules
- OffscreenCanvas
- ImageBitmap
- File API

## Architecture

- **Core Logic** (`src/core/`): Pure TypeScript layout calculations and types
- **Image Processing** (`src/lib/image-processing.ts`): Canvas-based image transformations
- **PDF Generation** (`src/lib/pdf-generator.ts`): PDF creation using pdf-lib
- **UI** (`src/app.js`): Vanilla JavaScript UI with touch gesture support
- **Styles** (`styles/main.css`): Mobile-first responsive CSS

## Deployment

The app is static and can be deployed to any web host:

- GitHub Pages
- Netlify
- Vercel
- Any static file host

No server-side processing required - all image processing and PDF generation happens in the browser.
