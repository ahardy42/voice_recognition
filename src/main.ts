import './style.css'

// Voice recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Configure recognition settings
recognition.continuous = true; // Enable continuous recognition
recognition.interimResults = true; // Show interim results as you speak
recognition.lang = 'en-US';

// Audio analysis setup
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let dataArray: Uint8Array | null = null;
let animationId: number | null = null;

// DOM elements
let isListening = false;
let isTransitioning = false;
let finalTranscript = '';
let interimTranscript = '';
let waveformAnimationId: number | null = null;

// Create the UI
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="voice-app">
    <h1>Voice Recognition App</h1>
    <div class="status-container">
      <div id="status" class="status">Click the button to start speaking</div>
    </div>
    <div class="button-container">
      <button id="startBtn" class="start-btn">
        <span class="btn-text">Start Listening</span>
        <div class="waveform">
          <div class="waveform-bar"></div>
          <div class="waveform-bar"></div>
          <div class="waveform-bar"></div>
          <div class="waveform-bar"></div>
          <div class="waveform-bar"></div>
        </div>
      </button>
    </div>
    <div class="transcript-container">
      <h3>What you said:</h3>
      <div id="transcript" class="transcript"></div>
    </div>
    <div class="clear-container">
      <button id="clearBtn" class="clear-btn">Clear Text</button>
    </div>
  </div>
  
  <!-- Microphone Permission Modal -->
  <div id="micModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Microphone Access Required</h2>
      </div>
      <div class="modal-body">
        <div class="mic-icon">🎤</div>
        <p>This app needs access to your microphone to provide voice recognition and visual feedback.</p>
        <p>Click "Allow" when your browser asks for microphone permission.</p>
      </div>
      <div class="modal-footer">
        <button id="requestMicBtn" class="request-mic-btn">Request Microphone Access</button>
        <button id="cancelMicBtn" class="cancel-mic-btn">Cancel</button>
      </div>
    </div>
  </div>
`;

// Get DOM elements
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLDivElement;
const transcriptDiv = document.getElementById('transcript') as HTMLDivElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const waveform = startBtn.querySelector('.waveform') as HTMLDivElement;
const btnText = startBtn.querySelector('.btn-text') as HTMLSpanElement;
const micModal = document.getElementById('micModal') as HTMLDivElement;
const requestMicBtn = document.getElementById('requestMicBtn') as HTMLButtonElement;
const cancelMicBtn = document.getElementById('cancelMicBtn') as HTMLButtonElement;

// Event listeners
startBtn.addEventListener('click', handleStartClick);
clearBtn.addEventListener('click', clearTranscript);
requestMicBtn.addEventListener('click', requestMicrophoneAccess);
cancelMicBtn.addEventListener('click', closeMicModal);

// Modal functions
function showMicModal(): void {
  micModal.style.display = 'flex';
  micModal.classList.add('show');
}

function closeMicModal(): void {
  micModal.classList.remove('show');
  setTimeout(() => {
    micModal.style.display = 'none';
  }, 300);
}

async function requestMicrophoneAccess(): Promise<void> {
  try {
    closeMicModal();
    status.textContent = 'Requesting microphone access...';
    status.className = 'status';
    
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // If we get here, permission was granted
    status.textContent = 'Microphone access granted! Starting...';
    
    // Start the actual voice recognition
    await startVoiceRecognition();
    
  } catch (error) {
    console.error('Microphone access denied:', error);
    
    // Check if it's a permission denied error
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        status.textContent = 'Microphone access denied. Please check your browser settings and try again.';
        status.className = 'status error';
        
        // Show a more detailed error modal
        showPermissionErrorModal();
      } else {
        status.textContent = `Error: ${error.message}`;
        status.className = 'status error';
      }
    } else {
      status.textContent = 'Microphone access denied. Please allow microphone access and try again.';
      status.className = 'status error';
    }
  }
}

function showPermissionErrorModal(): void {
  // Create and show a detailed error modal
  const errorModal = document.createElement('div');
  errorModal.className = 'modal show';
  errorModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header error-header">
        <h2>Microphone Access Blocked</h2>
      </div>
      <div class="modal-body">
        <div class="error-icon">🔒</div>
        <p><strong>Your browser has blocked microphone access for this site.</strong></p>
        <p>To use voice recognition, you need to reset the microphone permission:</p>
        <div class="browser-instructions">
          <h4>Chrome/Edge:</h4>
          <p>Click the lock icon 🔒 in the address bar → Site settings → Microphone → Allow</p>
          
          <h4>Firefox:</h4>
          <p>Click the shield icon 🛡️ in the address bar → Permissions → Microphone → Allow</p>
          
          <h4>Safari:</h4>
          <p>Safari → Preferences → Websites → Microphone → Allow for this website</p>
        </div>
        <p><strong>After changing the setting, refresh the page and try again.</strong></p>
      </div>
      <div class="modal-footer">
        <button class="cancel-mic-btn" onclick="this.closest('.modal').remove()">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorModal);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorModal.parentNode) {
      errorModal.remove();
    }
  }, 10000);
}

function handleStartClick(): void {
  if (isListening) {
    recognition.stop();
  } else {
    // Check if we already have microphone access
    if (microphone && audioContext && audioContext.state === 'running') {
      startVoiceRecognition();
    } else {
      // Check if permissions are permanently denied
      checkMicrophonePermission().then(hasPermission => {
        if (hasPermission) {
          startVoiceRecognition();
        } else {
          showMicModal();
        }
      }).catch(() => {
        showMicModal();
      });
    }
  }
}

async function startVoiceRecognition(): Promise<void> {
  try {
    recognition.start();
  } catch (error) {
    console.error('Error starting voice recognition:', error);
    status.textContent = 'Error starting voice recognition. Please try again.';
    status.className = 'status error';
  }
}

// Color generation functions
function generateColorFromFrequency(frequency: number, amplitude: number, isListening: boolean): string {
  if (isListening) {
    // Warm tones when listening (oranges, reds, yellows)
    const baseHue = 30; // Start with orange
    const hueVariation = 60; // Range for warm colors
    const hue = baseHue + ((frequency / 255) * hueVariation - hueVariation / 2);
    
    // Map amplitude to saturation with a smaller range (40-70%)
    const saturation = Math.max(40, Math.min(70, 40 + (amplitude / 255) * 30));
    
    // Map amplitude to lightness with a smaller range (25-45%)
    const lightness = Math.max(25, Math.min(45, 35 + (amplitude / 255) * 10));
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } else {
    // Cool tones when not listening (blues, purples)
    const baseHue = 260; // Start with purple
    const hueVariation = 60; // Smaller range for subtle changes
    const hue = baseHue + ((frequency / 255) * hueVariation - hueVariation / 2);
    
    // Map amplitude to saturation with a smaller range (40-70%)
    const saturation = Math.max(40, Math.min(70, 40 + (amplitude / 255) * 30));
    
    // Map amplitude to lightness with a smaller range (25-45%)
    const lightness = Math.max(25, Math.min(45, 35 + (amplitude / 255) * 10));
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

function updateBackgroundColor(audioData: Uint8Array): void {
  if (!audioData || audioData.length === 0) return;
  
  // Calculate average frequency and amplitude
  const avgFrequency = audioData.reduce((sum, val) => sum + val, 0) / audioData.length;
  const maxAmplitude = Math.max(...Array.from(audioData));
  
  // Generate colors for gradient with more subtle variation
  const color1 = generateColorFromFrequency(avgFrequency, maxAmplitude, isListening);
  const color2 = generateColorFromFrequency((avgFrequency + 30) % 255, maxAmplitude * 0.9, isListening);
  
  // Apply gradient to body
  document.body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
}

function transitionToListening(): void {
  isTransitioning = true;
  document.body.classList.add('transitioning');
  
  // Set a warm transition color
  document.body.style.background = 'linear-gradient(135deg, hsl(45, 60%, 35%) 0%, hsl(25, 60%, 35%) 100%)';
  
  setTimeout(() => {
    isTransitioning = false;
    document.body.classList.remove('transitioning');
  }, 800); // Match the CSS transition duration
}

function transitionToNotListening(): void {
  isTransitioning = true;
  document.body.classList.add('transitioning');
  
  // Set a cool transition color
  document.body.style.background = 'linear-gradient(135deg, hsl(260, 60%, 35%) 0%, hsl(240, 60%, 35%) 100%)';
  
  setTimeout(() => {
    isTransitioning = false;
    document.body.classList.remove('transitioning');
  }, 800); // Match the CSS transition duration
}

// Audio analysis functions
async function setupAudioAnalysis(): Promise<void> {
  try {
    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Create audio context
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    
    // Configure analyser
    analyser.fftSize = 32; // Small FFT size for 5 bars
    analyser.smoothingTimeConstant = 0.8;
    
    // Connect microphone to analyser
    microphone.connect(analyser);
    
    // Create data array for frequency data
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
  } catch (error) {
    console.error('Error setting up audio analysis:', error);
  }
}

function animateWaveformFromAudio(): void {
  if (!analyser || !dataArray || isTransitioning) return;
  
  // Get frequency data
  analyser.getByteFrequencyData(dataArray);
  
  // Update background color based on audio
  updateBackgroundColor(dataArray);
  
  const bars = waveform.querySelectorAll('.waveform-bar');
  const barCount = bars.length;
  
  // Map frequency data to bars
  bars.forEach((bar, index) => {
    // Get frequency data for this bar
    const dataIndex = Math.floor((index / barCount) * dataArray!.length);
    const value = dataArray![dataIndex];
    
    // Convert to height percentage (0-255 to 5-100%)
    const height = Math.max(5, (value / 255) * 95);
    
    (bar as HTMLElement).style.height = `${height}%`;
  });
}

function startAudioAnimation(): void {
  if (animationId) return;
  
  animationId = window.requestAnimationFrame(function animate() {
    animateWaveformFromAudio();
    animationId = window.requestAnimationFrame(animate);
  });
}

function stopAudioAnimation(): void {
  if (animationId) {
    window.cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  // Reset bars to default height
  const bars = waveform.querySelectorAll('.waveform-bar');
  bars.forEach((bar) => {
    (bar as HTMLElement).style.height = '5%';
  });
}

function cleanupAudio(): void {
  stopAudioAnimation();
  
  if (microphone) {
    microphone.disconnect();
    microphone = null;
  }
  
  if (analyser) {
    analyser.disconnect();
    analyser = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  dataArray = null;
}

// Recognition event handlers
recognition.onstart = async () => {
  isListening = true;
  status.textContent = 'Listening... Speak now!';
  status.className = 'status listening';
  btnText.textContent = 'Stop Listening';
  startBtn.className = 'start-btn listening';
  
  // Start transition to warm colors
  transitionToListening();
  
  // Setup audio analysis and start animation
  await setupAudioAnalysis();
  startAudioAnimation();
};

recognition.onresult = (event: SpeechRecognitionEvent) => {
  interimTranscript = '';

  // Loop through all results
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    
    if (event.results[i].isFinal) {
      finalTranscript += transcript + ' ';
    } else {
      interimTranscript += transcript;
    }
  }

  // Update the display with both final and interim results
  transcriptDiv.innerHTML = `
    <span class="final-text">${finalTranscript}</span>
    <span class="interim-text">${interimTranscript}</span>
  `;
};

recognition.onend = () => {
  isListening = false;
  status.textContent = 'Click the button to start speaking';
  status.className = 'status';
  btnText.textContent = 'Start Listening';
  startBtn.className = 'start-btn';
  
  // Start transition to cool colors
  transitionToNotListening();
  
  cleanupAudio();
};

recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
  console.error('Speech recognition error:', event.error);
  status.textContent = `Error: ${event.error}`;
  status.className = 'status error';
  isListening = false;
  btnText.textContent = 'Start Listening';
  startBtn.className = 'start-btn';
  
  // Start transition to cool colors
  transitionToNotListening();
  
  cleanupAudio();
};

function toggleListening(): void {
  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

function clearTranscript(): void {
  finalTranscript = '';
  interimTranscript = '';
  transcriptDiv.innerHTML = '';
}

async function checkMicrophonePermission(): Promise<boolean> {
  try {
    // Try to get the current permission state
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return permission.state === 'granted';
    }
    
    // Fallback: try to get user media without showing prompt
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // If we get here, permission is granted
    stream.getTracks().forEach(track => track.stop()); // Clean up
    return true;
  } catch (error) {
    return false;
  }
}
