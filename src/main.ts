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
`;

// Get DOM elements
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLDivElement;
const transcriptDiv = document.getElementById('transcript') as HTMLDivElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const waveform = startBtn.querySelector('.waveform') as HTMLDivElement;
const btnText = startBtn.querySelector('.btn-text') as HTMLSpanElement;

// Event listeners
startBtn.addEventListener('click', toggleListening);
clearBtn.addEventListener('click', clearTranscript);

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
