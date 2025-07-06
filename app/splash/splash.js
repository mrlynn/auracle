// Auracle Splash Screen JavaScript
// Handles dynamic loading states and randomized animations

class SplashScreen {
  constructor() {
    this.loadingMessages = [
      'Initializing Auracle...',
      'Loading AI models...',
      'Connecting to services...',
      'Preparing workspace...',
      'Almost ready...'
    ];
    
    this.statusMessages = [
      'Starting AI Research Companion',
      'Checking dependencies...',
      'Loading whisper.cpp engine',
      'Connecting to Ollama',
      'Initializing research tools',
      'Ready to transcribe!'
    ];
    
    this.currentMessageIndex = 0;
    this.currentStatusIndex = 0;
    this.progressValue = 0;
    
    this.init();
  }
  
  init() {
    // Start the loading sequence
    this.startLoadingSequence();
    
    // Add click-to-continue functionality (optional)
    this.addInteractivity();
    
    // Random sprite animation variant
    this.randomizeSprite();
    
    // Optional: Play loading sound
    this.playLoadingSound();
  }
  
  startLoadingSequence() {
    // Update loading text periodically
    setInterval(() => {
      this.updateLoadingText();
    }, 1500);
    
    // Update status messages
    setInterval(() => {
      this.updateStatusMessage();
    }, 2500);
    
    // Smooth progress bar animation
    this.animateProgress();
  }
  
  updateLoadingText() {
    const loadingTextElement = document.getElementById('loadingText');
    if (loadingTextElement && this.currentMessageIndex < this.loadingMessages.length) {
      // Type-writer effect
      this.typeWriterEffect(loadingTextElement, this.loadingMessages[this.currentMessageIndex]);
      this.currentMessageIndex++;
    }
  }
  
  updateStatusMessage() {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement && this.currentStatusIndex < this.statusMessages.length) {
      statusElement.style.opacity = '0';
      setTimeout(() => {
        statusElement.textContent = this.statusMessages[this.currentStatusIndex];
        statusElement.style.opacity = '1';
        this.currentStatusIndex++;
      }, 200);
    }
  }
  
  typeWriterEffect(element, text) {
    element.textContent = '';
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        element.textContent += text.charAt(charIndex);
        charIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);
  }
  
  animateProgress() {
    const progressBar = document.getElementById('progressBar');
    const increment = 100 / (this.loadingMessages.length * 1.5);
    
    const progressInterval = setInterval(() => {
      if (this.progressValue < 100) {
        this.progressValue += increment;
        progressBar.style.width = Math.min(this.progressValue, 100) + '%';
      } else {
        clearInterval(progressInterval);
        // Notify main process that loading is complete
        this.notifyLoadingComplete();
      }
    }, 200);
  }
  
  randomizeSprite() {
    const sprite = document.querySelector('.pixel-sprite');
    const animations = ['spriteHop', 'spriteSpin', 'spritePulse'];
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    
    // Add additional animation variants
    if (randomAnimation === 'spriteSpin') {
      sprite.style.animation = 'spriteHop 1.2s ease-in-out infinite, logoSpin 2s linear infinite';
    } else if (randomAnimation === 'spritePulse') {
      sprite.style.animation = 'spriteHop 1.2s ease-in-out infinite, containerGlow 1.5s ease-in-out infinite alternate';
    }
  }
  
  playLoadingSound() {
    // Optional: Play 8-bit loading sound
    const audio = document.getElementById('loadingSound');
    if (audio && audio.canPlayType) {
      // Check if user has allowed audio autoplay
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play was prevented - that's ok
          console.log('Audio autoplay prevented:', error);
        });
      }
    }
  }
  
  addInteractivity() {
    // Allow clicking to speed up loading (for development)
    document.addEventListener('click', (e) => {
      if (e.detail === 3) { // Triple-click to skip
        this.skipToComplete();
      }
    });
    
    // Listen for main process messages
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      
      ipcRenderer.on('loading-progress', (event, progress) => {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.width = progress + '%';
      });
      
      ipcRenderer.on('loading-status', (event, status) => {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = status;
      });
    }
  }
  
  skipToComplete() {
    this.progressValue = 100;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = '100%';
    setTimeout(() => {
      this.notifyLoadingComplete();
    }, 500);
  }
  
  notifyLoadingComplete() {
    // Fade out splash screen
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-out';
    
    // Notify Electron main process
    setTimeout(() => {
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('splash-loading-complete');
      } else {
        // Fallback for development
        console.log('Splash loading complete');
        window.close();
      }
    }, 500);
  }
}

// Initialize splash screen when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SplashScreen();
});

// Add some extra visual flair
document.addEventListener('DOMContentLoaded', () => {
  // Create floating particles effect
  createFloatingParticles();
  
  // Add keyboard shortcuts for development
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      // Space to skip splash (development only)
      if (window.splashScreen) {
        window.splashScreen.skipToComplete();
      }
    }
  });
});

function createFloatingParticles() {
  const particleCount = 15;
  const container = document.querySelector('.loading-container');
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: absolute;
      width: 2px;
      height: 2px;
      background: rgba(99, 102, 241, 0.6);
      border-radius: 50%;
      pointer-events: none;
      animation: float ${3 + Math.random() * 4}s linear infinite;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      z-index: 1;
    `;
    
    container.appendChild(particle);
  }
  
  // Add floating animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0% {
        transform: translateY(0px) rotate(0deg);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      90% {
        opacity: 1;
      }
      100% {
        transform: translateY(-100vh) rotate(360deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}