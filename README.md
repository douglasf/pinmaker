# Pin Maker PDF Generator

Create PDFs with images arranged in circles for making pins/badges. Available as both a **mobile-friendly web app** and a **CLI tool**.

## 🌐 Web App (Recommended for Mobile)

Use the browser-based version at: **[Your GitHub Pages URL will go here]**

- **Mobile-first design** with touch gestures
- **Per-pin customization** (zoom, position, colors, borders, text)
- **Live preview** and multi-page PDF export
- **Works offline** - all processing in your browser
- No installation required!

See [web/README.md](./web/README.md) for details.

## 💻 CLI Tool (For Desktop)

Command-line tool with interactive TUI mode for batch processing.

### Features

- **Interactive Mode:** TUI with image previews
- **Two pin sizes:** 32mm (20/page) and 58mm (6/page)
- **Text overlay:** Multi-line text with styling
- **Styling options:** Borders, backgrounds, edge-color detection
- **Handles any aspect ratio:** Square, landscape, portrait

### Installation

```bash
npm install
npm run build
npm link
```

### Usage

**Interactive Mode (Recommended):**
```bash
pinmaker
```

**CLI Mode:**
```bash
pinmaker <images...> [options]
```

**Examples:**
```bash
# Generate 32mm pins
pinmaker image1.jpg image2.jpg

# Duplicate to fill page
pinmaker image1.jpg -d

# 58mm with text
pinmaker photo.jpg -s 58mm --text "Team 2025"

# Blank template
pinmaker --text "Hello" "World"
```

See [INTERACTIVE_MODE.md](./INTERACTIVE_MODE.md) for full CLI documentation.

### Uninstall

```bash
npm unlink -g pinmaker
```

## 📐 Pin Specifications

| Pin Size | Image Diameter | Cutting Circle | Per Page | Layout |
|----------|----------------|----------------|----------|---------|
| 32mm     | 32mm           | 43mm           | 20       | 4 × 5   |
| 58mm     | 58mm           | 70mm           | 6        | 2 × 3   |

The image is sized to the pin diameter. The larger cutting circle provides space for paper to bend around the pin frame.

## 📁 Project Structure

```
pinmaker/
├── cli/                    # CLI tool source code
│   ├── src/               # TypeScript source
│   ├── dist/              # Compiled JavaScript
│   └── tsconfig.json      # TypeScript config
├── web/                    # Browser-based web app
│   ├── src/               # JavaScript modules
│   ├── styles/            # CSS
│   └── index.html         # Main HTML
├── test-images/           # Sample images for testing
└── README.md              # This file
```

## 🛠 Development

### CLI Development

```bash
npm run build              # Compile TypeScript
npm test                   # Run tests
```

### Web App Development

```bash
cd web
npm install
npm run dev                # Start dev server
npm run build              # Build for production
```

## 📄 Documentation

- [INTERACTIVE_MODE.md](./INTERACTIVE_MODE.md) - Full CLI documentation and options
- [web/README.md](./web/README.md) - Web app documentation
- [QUICK_START_WEB.md](./QUICK_START_WEB.md) - Quick start guide for web app
- [WEB_APP_COMPLETE.md](./WEB_APP_COMPLETE.md) - Implementation details

## 🤝 Contributing

The project uses:
- **CLI:** TypeScript, Node.js, Sharp for image processing, PDFKit for PDF generation
- **Web:** Vanilla JavaScript, Canvas API for image processing, pdf-lib for PDF generation
- **Shared:** Core layout calculations work in both CLI and web

## 📝 License

MIT
