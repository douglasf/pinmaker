# Interactive Mode Guide

## Usage

Run `pinmaker` without any arguments to enter interactive mode:

```bash
pinmaker
# or explicitly:
pinmaker interactive
```

## Features

### 1. Image Selection
- Automatically scans current directory for image files
- Displays file size and dimensions for each image
- **Sorting**: Press **s** to cycle through sort options:
  - By name (alphabetical)
  - By size (largest first)
  - By dimensions (largest resolution first)
  - By date (newest first)
- **Filtering**: Press **/** to search/filter images by filename
- **Bulk selection**: 
  - Press **a** to select all visible images
  - Press **n** to deselect all images
- Use **↑↓** to navigate through images
- **Live preview** of the image under cursor (updates as you navigate)
- Use **Space** to select/deselect individual images
- Use **Enter** to confirm selection
- Use **q** to cancel
- If terminal supports Kitty graphics protocol (Kitty, WezTerm, iTerm2), shows actual image preview (800×800px high resolution)
- **Multi-column layout**: On wide terminals (140+ chars), preview appears side-by-side with list
- ASCII/ANSI fallback for unsupported terminals

### 2. Basic Configuration
- **Pin size**: Choose between 32mm (20 per page) or 58mm (6 per page)
- **Output filename**: Specify PDF output name (must end in .pdf)
- **Duplicate**: Fill page with selected images

### 3. Styling Options (Optional)
- **Background fill**:
  - None (transparent)
  - Auto (uses edge color from image)
  - Custom color (hex, rgb, or named color)
- **Border**:
  - Color (hex, rgb, or named)
  - Width in mm

### 4. Text Options (Optional)
- **Text modes**:
  - Same text on all pins
  - Different text per pin
- **Multi-line support**: Opens editor for entering multiple lines
- **Per-line font size**: Optionally set custom size for each line
- **Text styling**:
  - Position: top, center, or bottom
  - Color: any valid color
  - Auto-scaling or fixed size
  - Outline for better visibility

### 5. Confirmation
- Review all settings before generating
- Confirm to proceed or cancel

## Example Workflow

```
🎨 Pin Maker - Interactive Mode

Found 20 image(s) in current directory

🎨 Select images
↑↓: navigate | Space: toggle | Enter: confirm | s: sort | /: filter | a: select all | n: none | q: cancel
Sort: name | Showing: 20/20 images | Selected: 2

▶ ✓ test1.png (125.3KB | 800×600)
  ○ test2.png (98.7KB | 1024×768)
  ✓ test3.png (201.5KB | 1920×1080)
  
Showing 1-10 of 20

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Preview: test1.png
800×600 | 125.3KB
[Live 800×800px high resolution image preview appears here as you navigate]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📏 Basic Configuration

? Pin size: 32mm (20 pins per page)
? Output PDF filename: my-pins.pdf
? Duplicate images to fill page? No

🎨 Styling Options

? Customize background and border? Yes
? Background fill: Auto (edge color)
? Add border? Yes
? Border color: #000000
? Border width in mm: 1

✍️  Text Options

? Add text to pins? Yes
? Text configuration: Same text on all pins
[Editor opens for text input]
? Text position: bottom
? Text color: white
? Auto-scale text size? Yes
? Add text outline for better visibility? Yes
? Outline color: black
? Outline width in points: 2

📋 Summary
Images: 2
Pin size: 32mm
Output: my-pins.pdf
Duplicate: No
Styling: Auto background | Border: #000000 (1mm)
Text: 1 pin(s) with text

? Generate PDF? Yes

🎨 Pin Maker PDF Generator
[Progress...]
✨ Done!
```

## Terminal Compatibility

### Image Preview Support
- **Kitty**: Full support
- **WezTerm**: Full support
- **iTerm2**: Full support
- **Other terminals**: Graceful fallback (no preview, but all other features work)

### Fallback Behavior
When image preview is not supported, the CLI shows:
- File size
- Image dimensions
- Filename

All other features work identically across all terminals.

## Keyboard Controls

### Image Selection
- **↑↓**: Navigate through images
- **Space**: Toggle image selection
- **s**: Cycle through sort options (name → size → dimensions → date)
- **/**: Enter filter mode (type to search, ESC to exit)
- **a**: Select all visible images
- **n**: Deselect all images
- **Enter**: Confirm selection and continue
- **q** or **Ctrl+C**: Cancel and exit

### Other Prompts
- **↑↓**: Navigate options
- **Enter**: Confirm selection
- **Ctrl+C**: Cancel and exit
- **Tab**: In text editor, indent
- **Ctrl+S** or **Ctrl+D**: In text editor, save and continue

## Tips

1. **Live preview**: Navigate through images with ↑↓ to preview each one before selecting
2. **Sort and filter**: Press **s** to sort by different criteria, or **/** to filter by filename
3. **Bulk operations**: Press **a** to select all, **n** to deselect all
4. **Wide terminal layout**: Use a terminal width of 140+ characters for side-by-side list and preview
5. **Batch processing**: Select multiple images with Space to process them all at once
6. **Per-pin text**: Choose "Different text per pin" to add unique text to each image
7. **Preview before commit**: The summary screen shows all your settings before generating
8. **Quick defaults**: Press Enter to accept default values for most prompts
9. **Skip optional sections**: Answer "No" to styling/text prompts to skip those sections
10. **High resolution previews**: Image previews are 800×800px in supported terminals for crystal-clear viewing

## CLI Mode Still Available

All original CLI flags still work! Interactive mode only activates when you run `pinmaker` with no arguments.

```bash
# CLI mode example:
pinmaker image1.png image2.png -s 32mm -o output.pdf --duplicate

# Interactive mode:
pinmaker
```
