# Live Image Preview Demo

The interactive mode now shows **live image previews** as you navigate through images!

## How It Works

As you press ↑↓ to navigate through the image list, the preview updates in real-time to show the image currently under your cursor.

## Visual Example

```
🎨 Select images
↑↓: navigate | Space: toggle | Enter: confirm | q: cancel

  ○ image1.png (100KB | 1920×1080)
▶ ✓ image2.png (85KB | 800×600)      ← Currently highlighted
  ○ image3.png (120KB | 1024×768)
  ○ image4.png (95KB | 640×480)

Showing 1-4 of 4 | Selected: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Preview: image2.png                  ← Updates as you navigate!
800×600 | 85KB

[600×600px image preview shown here]
  - Kitty/WezTerm/iTerm2: Full color image
  - Other terminals: ASCII/ANSI art representation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Key Features

1. **Instant Updates**: Preview changes immediately as you press ↑ or ↓
2. **Large Preview**: 600×600px resolution (up from 200×200px)
3. **Clear Separation**: Visual separators around preview area
4. **File Info**: Dimensions and size shown above preview
5. **Selection State**: ✓ shows selected images, ○ shows unselected

## Terminal Support

| Terminal | Preview Quality |
|----------|----------------|
| Kitty | Full color, high resolution |
| WezTerm | Full color, high resolution |
| iTerm2 | Full color, high resolution |
| Other | ASCII/ANSI art fallback |

## Controls

- **↑**: Move up, preview updates
- **↓**: Move down, preview updates  
- **Space**: Toggle selection (keeps preview on same image)
- **Enter**: Confirm selection
- **q**: Cancel

## Performance

The preview renders quickly using Sharp for image processing and terminal-kit for display. Images are cached in `/tmp` during rendering for optimal performance.

## Example Session

1. Run `pinmaker` in directory with images
2. Press ↓ to browse through images
3. Watch preview update for each image
4. Press Space to select images you want
5. Press Enter to continue with selected images

The live preview makes it easy to:
- Verify which images you're selecting
- Check image quality before processing
- Compare different images quickly
- Avoid selecting wrong files
