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
let lastBackgroundUpdate = 0;
let currentVoiceLevel = 'voice-medium'; // Track current level to prevent unnecessary changes

// DOM elements
let isListening = false;
let isTransitioning = false;
let finalTranscript = '';
let interimTranscript = '';

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
const errorModal = document.getElementById('errorModal') as HTMLDivElement;
const closeErrorBtn = document.getElementById('closeErrorBtn') as HTMLButtonElement;

// Event listeners
startBtn.addEventListener('click', handleStartClick);
clearBtn.addEventListener('click', clearTranscript);
requestMicBtn.addEventListener('click', requestMicrophoneAccess);
cancelMicBtn.addEventListener('click', closeMicModal);
closeErrorBtn.addEventListener('click', closeErrorModal);

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

function showErrorModal(): void {
  errorModal.style.display = 'flex';
  errorModal.classList.add('show');
  
  // Auto-close after 10 seconds
  setTimeout(() => {
    closeErrorModal();
  }, 10000);
}

function closeErrorModal(): void {
  errorModal.classList.remove('show');
  setTimeout(() => {
    errorModal.style.display = 'none';
  }, 300);
}

async function requestMicrophoneAccess(): Promise<void> {
  try {
    closeMicModal();
    status.textContent = 'Requesting microphone access...';
    status.className = 'status requesting';
    
    // Request microphone access
    await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // If we get here, permission was granted
    status.textContent = 'Microphone access granted! Starting...';
    status.className = 'status granted';
    
    // Start the actual voice recognition
    await startVoiceRecognition();
    
  } catch (error) {
    console.error('Microphone access denied:', error);
    
    // Check if it's a permission denied error
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        status.textContent = 'Microphone access denied. Please check your browser settings and try again.';
        status.className = 'status error';
        
        // Show the error modal
        showErrorModal();
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

function updateBackgroundColor(audioData: Uint8Array): void {
  if (!audioData || audioData.length === 0) return;
  
  // Only update background if we're listening and not in transition
  if (!isListening || isTransitioning) return;
  
  // Much more aggressive throttling (update max every 500ms)
  const now = Date.now();
  if (now - lastBackgroundUpdate < 500) return;
  lastBackgroundUpdate = now;
  
  // Calculate average amplitude over multiple samples for smoothing
  const amplitudes = Array.from(audioData);
  const avgAmplitude = amplitudes.reduce((sum, val) => sum + val, 0) / amplitudes.length;
  
  // Determine new voice level with less sensitive thresholds
  let newVoiceLevel = 'voice-medium'; // Default
  
  if (avgAmplitude < 30) {
    newVoiceLevel = 'voice-low';
  } else if (avgAmplitude < 80) {
    newVoiceLevel = 'voice-medium';
  } else if (avgAmplitude < 150) {
    newVoiceLevel = 'voice-high';
  } else {
    newVoiceLevel = 'voice-intense';
  }
  
  // Only update if the level actually changed
  if (newVoiceLevel !== currentVoiceLevel) {
    // Remove all voice intensity classes
    document.body.classList.remove('voice-low', 'voice-medium', 'voice-high', 'voice-intense');
    
    // Add new voice level class
    document.body.classList.add(newVoiceLevel);
    
    // Update current level
    currentVoiceLevel = newVoiceLevel;
  }
}

function transitionToListening(): void {
  isTransitioning = true;
  currentVoiceLevel = 'voice-medium'; // Reset voice level
  
  // Remove all background classes
  document.body.classList.remove('listening', 'not-listening', 'voice-low', 'voice-medium', 'voice-high', 'voice-intense');
  
  // Add listening class for warm background
  document.body.classList.add('listening');
  
  setTimeout(() => {
    isTransitioning = false;
  }, 800); // Match the CSS transition duration
}

function transitionToNotListening(): void {
  isTransitioning = true;
  currentVoiceLevel = 'voice-medium'; // Reset voice level
  
  // Remove all background classes to return to default
  document.body.classList.remove('listening', 'not-listening', 'voice-low', 'voice-medium', 'voice-high', 'voice-intense');
  
  setTimeout(() => {
    isTransitioning = false;
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
    
    // Remove all level classes
    bar.classList.remove('level-1', 'level-2', 'level-3', 'level-4', 'level-5', 
                        'level-6', 'level-7', 'level-8', 'level-9', 'level-10');
    
    // Convert to level (1-10) and add appropriate class
    const level = Math.max(1, Math.min(10, Math.ceil((value / 255) * 10)));
    bar.classList.add(`level-${level}`);
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
  
  // Reset bars to default state
  const bars = waveform.querySelectorAll('.waveform-bar');
  bars.forEach((bar) => {
    bar.classList.remove('level-1', 'level-2', 'level-3', 'level-4', 'level-5', 
                        'level-6', 'level-7', 'level-8', 'level-9', 'level-10');
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
