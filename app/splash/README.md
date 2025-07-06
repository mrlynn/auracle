# Auracle Splash Screen

A retro-styled 8-bit inspired splash screen for the Auracle application.

## Features

- 🎨 **Retro Design** - 8-bit/pixel art aesthetic matching Auracle's brand
- ⚡ **Smooth Animations** - CSS-based animations with multiple variants
- 📱 **Responsive** - Works on different screen sizes
- 🔊 **Audio Support** - Optional 8-bit loading sounds
- ♿ **Accessible** - Respects motion preferences and high contrast
- 🎯 **Interactive** - Click/keyboard shortcuts for development

## File Structure

```
splash/
├── splash.html    # Main HTML structure
├── splash.css     # Retro styling and animations
├── splash.js      # JavaScript logic and IPC communication
└── README.md      # This file
```

## Design Elements

### Visual Components
- **App Logo** - Animated "A" with rotating colors
- **Pixel Sprite** - Geometric CSS-based animation
- **Loading Text** - Typewriter effect with glowing text
- **Progress Bar** - Animated with shine effect
- **Floating Particles** - Background ambient animation

### Color Scheme
- Background: Deep blue gradient (`#0f172a` → `#334155`)
- Primary: Indigo (`#6366f1`)
- Secondary: Cyan (`#06b6d4`)
- Accent: Green (`#10b981`)
- Text: Light gray (`#f8fafc`)

### Animations
1. **Logo Spin** - 360° rotation with color transitions
2. **Sprite Hop** - Bouncing animation with scale
3. **Text Glow** - Pulsing text with shadow effects
4. **Dot Bounce** - Staggered loading dots
5. **Progress Fill** - Smooth bar animation with shine
6. **Particle Float** - Floating background particles

## Integration

### Main Process (main.js)
```javascript
// Show splash screen first
createSplashWindow();

// Create main window (hidden)
createWindow();

// Initialize services and show main when ready
initializeServices().then(() => {
  mainWindow.show();
  closeSplashWindow();
});
```

### IPC Communication
- `splash-loading-complete` - Splash notifies completion
- `loading-progress` - Update progress bar (0-100%)
- `loading-status` - Update status message text

## Customization

### Timing
- Default duration: 5 seconds maximum
- Progress animation: 3 seconds
- Text updates: Every 1.5 seconds
- Status updates: Every 2.5 seconds

### Messages
Edit arrays in `splash.js`:
```javascript
loadingMessages: [
  'Initializing Auracle...',
  'Loading AI models...',
  // Add your messages
];
```

### Audio
Add audio file and uncomment in HTML:
```html
<source src="assets/loading-sound.mp3" type="audio/mpeg">
```

### Development Features
- **Triple-click** - Skip to completion
- **Spacebar** - Skip splash (development)
- **Auto-fallback** - Works without Electron context

## Browser Compatibility

- Modern browsers with CSS Grid/Flexbox
- CSS animations and transforms
- ES6+ JavaScript features
- Electron environment with Node.js integration

## Performance

- Pure CSS animations (no JavaScript animation loops)
- Optimized for 60fps
- Minimal memory footprint
- GPU-accelerated transforms
- Reduced motion support for accessibility

## Accessibility

- `prefers-reduced-motion` support
- `prefers-contrast` high contrast mode
- Keyboard navigation support
- Screen reader friendly structure
- Optional audio with volume controls