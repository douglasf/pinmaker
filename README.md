# Pin Maker PDF Generator

A CLI tool to create PDFs with images arranged in circles for making pins/badges. Images are automatically duplicated and arranged to fill exactly 20 circles (32mm) or 6 circles (58mm) per page.

## Features

- **Two pin sizes supported:**
  - 32mm pins → 20 circles per page (4 columns × 5 rows)
  - 58mm pins → 6 circles per page (2 columns × 3 rows)
- **Automatic image duplication:** If you provide fewer images than circles per page, images are duplicated evenly to fill all circles
- **Proper sizing for pin machines:** Images are sized to the actual pin diameter (32mm or 58mm), with extra circle space (43mm or 70mm) for the paper to bend around the pin frame
- **Global CLI tool:** Install once and use from anywhere on your system
- **Optimal layout:** Automatically centered on A4 pages with proper spacing
- **Handles any aspect ratio:** Square, landscape, and portrait images all work perfectly
- **Cutting guides:** Circle outlines for precise cutting

## Installation

### Install as a global CLI tool:

```bash
npm install
npm run build
npm link
```

Now you can use `pinmaker` from anywhere!

## Usage

```bash
pinmaker <images...> [options]
```

### Options:

- `-s, --size <size>`: Pin size (`32mm` or `58mm`, default: `32mm`)
- `-o, --output <file>`: Output PDF file (default: `pins.pdf`)
- `-V, --version`: Show version number
- `-h, --help`: Display help information

### Examples:

**Generate 32mm pins from 2 images (each duplicated 10 times = 20 circles):**
```bash
pinmaker image1.jpg image2.jpg
```

**Generate 58mm pins with custom output name:**
```bash
pinmaker photo.jpg -s 58mm -o mybadges.pdf
```

**Use with glob patterns:**
```bash
pinmaker ~/Pictures/*.jpg -s 32mm -o output.pdf
```

**From any directory:**
```bash
cd ~/Desktop
pinmaker ~/Documents/photos/*.png -o pins.pdf
```

## Pin Specifications

| Pin Size | Image Diameter | Cutting Circle | Circles per Page | Layout |
|----------|----------------|----------------|-----------------|---------|
| 32mm     | 32mm           | 43mm           | 20              | 4 × 5   |
| 58mm     | 58mm           | 70mm           | 6               | 2 × 3   |

The image is sized to match the actual pin diameter (32mm or 58mm). The larger cutting circle (43mm or 70mm) provides extra space needed for the paper to bend around the pin frame in the pin-making machine.

### Image Duplication

- **Fewer images than circles:** Images are duplicated evenly to fill all circles
  - Example: 2 images for 32mm → each image appears 10 times = 20 total circles
  - Example: 3 images for 58mm → 2 images appear twice, 1 appears once = 6 total circles
- **More images than circles per page:** Multiple pages are created
  - Example: 25 images for 32mm → 2 pages (20 + 5 circles)

```
For 32mm pins:
┌─────────────────────────────┐
│    43mm Cutting Circle      │
│   ┌───────────────────┐     │
│   │                   │     │
│   │   32mm Image      │     │  ← Extra space for
│   │   (centered)      │     │    bending paper
│   │                   │     │    around frame
│   └───────────────────┘     │
│                             │
└─────────────────────────────┘
```

## Image Requirements

- **Supported formats:** JPG, PNG, WEBP, GIF, SVG, TIFF
- **Aspect ratios:** Any aspect ratio works! The tool fits the entire image within the circle
  - Wide images (landscape) will have white space on top/bottom
  - Tall images (portrait) will have white space on left/right
  - Square images fill the circle completely
- **Resolution:** Higher resolution images produce better quality results

## How It Works

1. Images are loaded and processed
2. Each image is resized to fit entirely within a square (maintaining aspect ratio)
3. Images are sized to the exact pin diameter (32mm or 58mm)
4. Non-square images get white padding to center them
5. If fewer images than circles per page, images are duplicated evenly
6. Images are placed centered within larger cutting circles (43mm or 70mm)
7. Circles are arranged in a fixed grid (4×5 for 32mm, 2×3 for 58mm) on A4 pages
8. PDF is generated with circular clipping masks and cutting guide outlines

The extra space between the image edge and cutting circle is essential for the pin-making machine to bend the paper around the pin frame.

## Output

The generated PDF will have:
- A4 page size (210mm × 297mm)
- Fixed number of circles per page (20 for 32mm, 6 for 58mm)
- Images sized to actual pin diameter (32mm or 58mm), centered within circles
- Black outlines around each cutting circle (43mm or 70mm) for cutting guides
- Extra space between image and cutting line for paper bending
- Proper spacing between circles for easy cutting
- Multiple pages if needed

## Uninstalling

To remove the global CLI tool:

```bash
npm unlink -g pinmaker
```

## Development

After making changes to the source code:

```bash
npm run build
# Changes are immediately available to the global `pinmaker` command
```

## License

MIT
