import './style.css'

// Voice recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Configure recognition settings
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

// DOM elements
let isListening = false;
let finalTranscript = '';
let interimTranscript = '';

// Create the UI
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="voice-app">
    <h1>Voice Recognition App</h1>
    <div class="status-container">
      <div id="status" class="status">Click the button to start speaking</div>
    </div>
    <div class="button-container">
      <button id="startBtn" class="start-btn">Start Listening</button>
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

// Event listeners
startBtn.addEventListener('click', toggleListening);
clearBtn.addEventListener('click', clearTranscript);

// Recognition event handlers
recognition.onstart = () => {
  isListening = true;
  status.textContent = 'Listening... Speak now!';
  status.className = 'status listening';
  startBtn.textContent = 'Stop Listening';
  startBtn.className = 'start-btn listening';
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
  startBtn.textContent = 'Start Listening';
  startBtn.className = 'start-btn';
};

recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
  console.error('Speech recognition error:', event.error);
  status.textContent = `Error: ${event.error}`;
  status.className = 'status error';
  isListening = false;
  startBtn.textContent = 'Start Listening';
  startBtn.className = 'start-btn';
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
