// --- SOUND SYNTHESIZER & HAPTICS ---
let audioEnabled = true;
let hapticsEnabled = true;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!audioEnabled) return;
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;

        if (type === 'keypress') {
            // Quick vintage click sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'error') {
            // Vintage buzzer sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(130, now);
            osc.frequency.setValueAtTime(120, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'flip') {
            // Quick digital blip when verifying
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'win') {
            // Retro 8-bit win fanfare
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            const duration = 0.12;
            notes.forEach((freq, index) => {
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                noteOsc.type = 'square';
                noteOsc.frequency.setValueAtTime(freq, now + (index * duration));
                noteGain.gain.setValueAtTime(0.08, now + (index * duration));
                noteGain.gain.exponentialRampToValueAtTime(0.01, now + (index * duration) + duration);
                noteOsc.start(now + (index * duration));
                noteOsc.stop(now + (index * duration) + duration);
            });
        } else if (type === 'lose') {
            // Sad retro descending buzzer
            const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
            const duration = 0.15;
            notes.forEach((freq, index) => {
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                noteOsc.type = 'sawtooth';
                noteOsc.frequency.setValueAtTime(freq, now + (index * duration));
                noteGain.gain.setValueAtTime(0.08, now + (index * duration));
                noteGain.gain.exponentialRampToValueAtTime(0.01, now + (index * duration) + duration);
                noteOsc.start(now + (index * duration));
                noteOsc.stop(now + (index * duration) + duration);
            });
        }
    } catch (e) {
        console.error("Audio playback error: ", e);
    }
}

function triggerHaptic(ms) {
    if (hapticsEnabled && window.navigator.vibrate) {
        window.navigator.vibrate(ms);
    }
}
