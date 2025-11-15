# Quick Start - Pin Maker Web App

## Local Testing

To test the web app on your computer:

```bash
cd web
npm run dev
```

This will:
1. Start a local development server
2. Automatically open http://localhost:3000 in your browser
3. Enable hot-reload (changes update instantly)

## Testing on Mobile

### Option 1: Using your local network

1. Start the dev server:
   ```bash
   cd web
   npm run dev
   ```

2. Note your computer's local IP address (e.g., `192.168.1.100`)

3. On your mobile device (connected to same WiFi):
   - Open browser to `http://YOUR_IP:3000` (e.g., `http://192.168.1.100:3000`)

### Option 2: Deploy to GitHub Pages

1. Commit all changes to your repository
2. Push to GitHub
3. The GitHub Actions workflow will automatically build and deploy
4. Access at: `https://YOUR_USERNAME.github.io/pinmaker/`

To enable GitHub Pages:
- Go to your repo Settings → Pages
- Source should be set to "GitHub Actions" (done automatically by the workflow)

## Usage Flow

1. **Select Images**: Tap the upload area, choose photos from your device
2. **Configure**: 
   - Choose pin size (32mm = 20 per page, 58mm = 6 per page)
   - Enable "Duplicate to fill page" if you want multiple copies
3. **Edit Each Pin**:
   - Use the zoom slider or pinch gesture to zoom in/out
   - Touch and drag on the canvas to pan/reposition
   - Add background color (custom or auto edge-color)
   - Add border with custom color and width
   - Add text lines (tap "Add Line" for multiple lines)
   - Adjust text position, colors, and outline
4. **Preview All**: Review the complete multi-page layout
5. **Export PDF**: Download your print-ready PDF

## Touch Gestures

- **Pan**: Single-finger drag on the canvas preview
- **Zoom**: Use the zoom slider (pinch-zoom coming in future update)

## Browser Requirements

Works best on:
- Chrome/Edge (mobile & desktop)
- Safari (iOS 15+)
- Firefox (recent versions)

## File Structure

```
web/
├── index.html              # Main HTML page
├── styles/
│   └── main.css           # Mobile-first responsive styles
├── src/
│   ├── app.js             # Main application logic
│   ├── core/
│   │   ├── types.ts       # Shared type definitions
│   │   └── layout.ts      # Layout calculation (shared with CLI)
│   └── lib/
│       ├── image-processing.ts  # Canvas-based image transforms
│       └── pdf-generator.ts     # PDF creation with pdf-lib
├── package.json           # Dependencies
└── vite.config.js         # Build configuration
```

## Notes

- All image processing happens in your browser (privacy-friendly!)
- No data is sent to any server
- Works offline after initial page load
- Large batches (50+ high-res images) may be slow on older devices
- For bulk processing, use the CLI tool instead

## Troubleshooting

**Images not loading?**
- Check browser console for errors
- Ensure images are valid formats (JPG, PNG, WEBP)
- Try with smaller images first

**PDF export fails?**
- Check browser console for errors
- Try with fewer images first
- Ensure you have enough free memory
- Close other browser tabs

**Canvas preview blank?**
- Check if browser supports OffscreenCanvas and ImageBitmap
- Try a different browser (Chrome/Edge recommended)

**Touch gestures not working?**
- Ensure you're touching directly on the canvas preview
- Try clearing browser cache
- Check if touch events are supported in your browser
