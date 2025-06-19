# Voice Recognition App

A modern, interactive voice recognition web application that provides real-time speech-to-text conversion with visual feedback. The app features dynamic background color changes based on voice intensity and animated waveform visualization.

## 🚀 Features

- **Real-time Speech Recognition**: Continuous speech-to-text conversion
- **Visual Feedback**: Dynamic background colors that change based on voice intensity
- **Animated Waveform**: Real-time audio visualization with animated bars
- **Responsive Design**: Works on desktop and mobile devices
- **Permission Management**: Graceful handling of microphone permissions
- **TypeScript**: Fully typed codebase for better development experience
- **GitHub Pages Ready**: Automated deployment with GitHub Actions

## 🛠️ Technology Stack

### Core Technologies
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **Web Speech API** - Browser-native speech recognition
- **Web Audio API** - Real-time audio analysis and visualization

### Dependencies
- `typescript` (~5.8.3) - TypeScript compiler
- `vite` (^6.3.5) - Build tool and dev server
- `@types/dom-speech-recognition` (^0.0.6) - TypeScript definitions for Web Speech API
- `@types/node` (^20.0.0) - Node.js type definitions

## 📦 Installation & Setup

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager
- A modern web browser with microphone support

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd voice_recognition
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Navigate to `http://localhost:5173` (or the URL shown in your terminal)
   - Allow microphone permissions when prompted

### Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Preview the production build**
   ```bash
   npm run preview
   ```

3. **Use the deployment script**
   ```bash
   ./scripts/deploy.sh
   ```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## 🌐 GitHub Pages Deployment

This repository is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Automatic Deployment
- **Trigger**: Every push to the `main` branch
- **Workflow**: `.github/workflows/deploy.yml`
- **URL**: `https://[your-username].github.io/voice_recognition/`

### Setup Instructions

1. **Enable GitHub Pages** (if not already enabled):
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Select "GitHub Actions" as the source
   - The workflow will automatically deploy on pushes to main

2. **Push your changes**:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

3. **Monitor deployment**:
   - Go to Actions tab in your repository
   - Watch the "Deploy to GitHub Pages" workflow
   - Your app will be live once the workflow completes

### Manual Deployment
If you need to deploy manually or test locally:

```bash
# Build and test locally
npm run build
npm run preview

# Or use the deployment script
./scripts/deploy.sh
```

## 🔧 How It Works

### Architecture Overview

The application uses a combination of modern web APIs to provide real-time voice recognition with visual feedback:

1. **Web Speech API** - Handles speech recognition
2. **Web Audio API** - Analyzes audio for visual feedback
3. **Canvas API** - Provides smooth animations
4. **Permission API** - Manages microphone permissions

### Core Components

#### 1. Speech Recognition Engine
```typescript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
```
- Uses the browser's native speech recognition capabilities
- Configured for continuous recognition with interim results
- Supports multiple languages (default: English US)

**API Documentation**: [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

#### 2. Audio Analysis System
```typescript
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
const microphone = audioContext.createMediaStreamSource(stream);
```
- Captures real-time audio from the microphone
- Analyzes frequency data for visual feedback
- Uses FFT (Fast Fourier Transform) for audio processing

**API Documentation**: [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

#### 3. Visual Feedback Engine
- **Background Color Changes**: Dynamically adjusts based on voice intensity levels
- **Waveform Animation**: Real-time visualization of audio frequency data
- **Smooth Transitions**: CSS transitions for seamless visual changes

### Voice Intensity Levels

The app categorizes voice input into four intensity levels:

- **Voice Low** (0-30 amplitude): Cool blue tones
- **Voice Medium** (30-80 amplitude): Neutral background
- **Voice High** (80-150 amplitude): Warm orange tones
- **Voice Intense** (150+ amplitude): Hot red tones

### Permission Management

The app implements a robust permission handling system:

1. **Permission Check**: Verifies microphone access before starting
2. **Graceful Fallbacks**: Handles denied permissions with helpful error messages
3. **Browser-Specific Instructions**: Provides guidance for different browsers
4. **Modal Dialogs**: User-friendly permission request interfaces

## 🌐 Browser Compatibility

### Supported Browsers
- **Chrome/Edge** (Chromium-based) - Full support
- **Firefox** - Full support
- **Safari** - Limited support (may require HTTPS)

### Requirements
- HTTPS connection (required for microphone access in production)
- Microphone hardware
- Modern browser with Web Speech API support

## 🔒 Security Considerations

- **HTTPS Required**: Microphone access requires secure connection in production
- **Permission-Based**: Only accesses microphone after explicit user consent
- **No Data Storage**: Speech data is not stored or transmitted
- **Local Processing**: All audio analysis happens in the browser

## 🚀 Deployment

### GitHub Pages (Recommended)
- **Automatic**: Configured with GitHub Actions
- **URL**: `https://[your-username].github.io/voice_recognition/`
- **HTTPS**: Automatically provided by GitHub Pages

### Other Static Hosting Options
The built application can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `dist/` folder
- **Vercel**: Connect your repository for automatic deployments
- **AWS S3**: Upload files to an S3 bucket with static website hosting

### Environment Requirements
- HTTPS enabled (required for microphone access)
- Modern web server with proper MIME types
- CORS headers if needed for cross-origin requests

## 🐛 Troubleshooting

### Common Issues

1. **Microphone not working**
   - Check browser permissions
   - Ensure HTTPS connection (required for production)
   - Try refreshing the page

2. **Speech recognition not starting**
   - Verify microphone is connected and working
   - Check browser console for errors
   - Ensure browser supports Web Speech API

3. **Visual feedback not working**
   - Check if audio analysis is properly initialized
   - Verify microphone permissions are granted
   - Check browser console for Web Audio API errors

4. **GitHub Pages deployment issues**
   - Check the Actions tab for workflow errors
   - Ensure the repository name matches the base path in `vite.config.ts`
   - Verify GitHub Pages is enabled in repository settings

### Browser-Specific Notes

- **Chrome**: Best support, recommended for development
- **Firefox**: Good support, may have slight differences in audio analysis
- **Safari**: Limited Web Speech API support, may not work as expected
- **Mobile Browsers**: Support varies, test thoroughly on target devices

## 📚 Additional Resources

- [Web Speech API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This application requires microphone access and works best in modern browsers with Web Speech API support. For production use, ensure your hosting environment supports HTTPS. The GitHub Pages deployment automatically provides HTTPS. 