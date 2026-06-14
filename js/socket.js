// --- SOCKET.IO CLIENT & REAL-TIME MULTIPLAYER ---
const socket = io();

// Generate or retrieve player name
let myPlayerName = localStorage.getItem("playerName") || "Player_" + Math.floor(Math.random() * 900 + 100);
localStorage.setItem("playerName", myPlayerName);

socket.on('connect', () => {
    console.log(`Connected to Wordlmaxxing server as socket ID: ${socket.id}`);
});

socket.on('match-found', (data) => {
    const opponent = data.players.find(p => p.id !== socket.id);
    const opponentName = opponent ? opponent.name : "Opponent";
    
    const title = document.getElementById("matchmaking-title");
    const subtitle = document.getElementById("matchmaking-subtitle");
    const countdown = document.getElementById("matchmaking-countdown");
    
    if (title && subtitle && countdown) {
        title.textContent = "OPPONENT FOUND!";
        subtitle.textContent = `DUELING AGAINST ${opponentName}`;
        countdown.textContent = "3";
        countdown.classList.remove("hidden");
        playSound('keypress');
        
        let count = 3;
        const cInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdown.textContent = count;
                playSound('keypress');
            } else {
                clearInterval(cInterval);
                const modal = document.getElementById("modal-matchmaking");
                if (modal) modal.classList.add("hidden");
            }
        }, 800);
    }
});

socket.on('game-start', (data) => {
    const me = data.players.find(p => p.id === socket.id);
    const opponent = data.players.find(p => p.id !== socket.id);
    
    scorePlayer = me ? me.score : 0;
    scoreOpponent = opponent ? opponent.score : 0;
    
    isMatchActive = true;
    initGame(opponent ? opponent.name : "Opponent");
});

socket.on('guess-result', (data) => {
    // data: { guess, cellStates, row }
    revealPlayerGuess(data.guess, data.cellStates, data.row);
});

socket.on('opponent-progress', (data) => {
    // data: { row, cellStates }
    revealOpponentProgress(data.row, data.cellStates);
});

socket.on('timer-sync', (data) => {
    // data: { playerTime, opponentTime }
    timeLeft = data.playerTime;
    updateTimerDisplay();
});

socket.on('round-over', (data) => {
    // data: { winnerId, winnerName, word, players }
    const didIWin = data.winnerId === socket.id;
    const opponent = data.players.find(p => p.id !== socket.id);
    const me = data.players.find(p => p.id === socket.id);
    
    scorePlayer = me ? me.score : 0;
    scoreOpponent = opponent ? opponent.score : 0;

    let reason = "";
    if (data.winnerId === null) {
        reason = "Round tie! Nobody solved it.";
    } else if (didIWin) {
        reason = "You solved it first!";
    } else {
        reason = `${data.winnerName} solved it first!`;
    }

    finishRound(didIWin, reason, data.word);
});

socket.on('room-error', (err) => {
    alert(err);
    cancelMatchmaking();
});

socket.on('opponent-disconnected', () => {
    alert("Opponent disconnected. Returning to lobby.");
    isMatchActive = false;
    backToLobby();
});

// --- HELPER FUNCTIONS CALLED BY GAME.JS ---

function sendPlayerGuess(guess) {
    socket.emit('submit-guess', guess);
}

function requestNextRound() {
    socket.emit('next-round');
}

function disconnectSocket() {
    socket.disconnect();
    socket.connect();
}

// --- MATCHMAKING UI EMITTERS ---

function startMatchmaking() {
    initAudio();
    playSound('keypress');
    triggerHaptic(10);

    const playerName = localStorage.getItem("playerName") || "Player_" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("playerName", playerName);

    const modal = document.getElementById("modal-matchmaking");
    const title = document.getElementById("matchmaking-title");
    const subtitle = document.getElementById("matchmaking-subtitle");
    const countdown = document.getElementById("matchmaking-countdown");

    if (modal && title && subtitle && countdown) {
        modal.classList.remove("hidden");
        title.textContent = "FINDING OPPONENT";
        subtitle.textContent = "Searching in cyber queue...";
        countdown.classList.add("hidden");
    }

    if (!socket.connected) {
        socket.connect();
    }

    const selectedDifficulty = (typeof difficulty !== 'undefined') ? difficulty : 'hardcore';
    socket.emit('join-random', { playerName, difficulty: selectedDifficulty });
}

function generatePrivateCode() {
    // Generate a random 6-character alphanumeric code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const input = document.getElementById("room-code-input");
    if (input) {
        input.value = code;
    }
    
    joinWithCode();
}

function copyRoomCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        const statusText = document.getElementById("copy-status-text");
        if (statusText) {
            statusText.textContent = "COPIED!";
            statusText.classList.add("text-secondary-fixed-dim");
            statusText.classList.remove("text-on-surface-variant");
            
            if (typeof playSound === 'function') playSound('keypress');
            if (typeof triggerHaptic === 'function') triggerHaptic(5);

            setTimeout(() => {
                if (statusText) {
                    statusText.textContent = "CLICK TO COPY";
                    statusText.classList.remove("text-secondary-fixed-dim");
                    statusText.classList.add("text-on-surface-variant");
                }
            }, 2000);
        }
    }).catch(err => {
        console.error("Failed to copy room code: ", err);
    });
}

function joinWithCode() {
    initAudio();
    playSound('keypress');
    triggerHaptic(10);

    const input = document.getElementById("room-code-input");
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (code.length < 3) {
        playSound('error');
        input.focus();
        input.classList.add("shake");
        setTimeout(() => input.classList.remove("shake"), 500);
        return;
    }

    const playerName = localStorage.getItem("playerName") || "Player_" + Math.floor(Math.random() * 900 + 100);
    localStorage.setItem("playerName", playerName);

    const modal = document.getElementById("modal-matchmaking");
    const title = document.getElementById("matchmaking-title");
    const subtitle = document.getElementById("matchmaking-subtitle");
    const countdown = document.getElementById("matchmaking-countdown");

    if (modal && title && subtitle && countdown) {
        modal.classList.remove("hidden");
        title.textContent = "WAITING FOR OPPONENT";
        subtitle.innerHTML = `
            <div class="mt-4 space-y-3">
                <div class="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-widest leading-relaxed">
                    Connecting to private room...<br>Share this room code with your opponent:
                </div>
                <div onclick="copyRoomCode('${code}')" class="flex items-center justify-between bg-surface-container-lowest border border-primary/20 hover:border-primary/50 transition-all rounded-lg px-4 py-3 cursor-pointer group active:scale-[0.98]">
                    <span class="font-label-mono text-xl font-bold tracking-widest text-primary selection:bg-transparent">${code}</span>
                    <div class="flex items-center gap-1.5">
                        <span id="copy-status-text" class="text-[9px] font-label-mono text-on-surface-variant group-hover:text-primary transition-all uppercase tracking-wider">CLICK TO COPY</span>
                        <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-all text-sm">content_copy</span>
                    </div>
                </div>
            </div>
        `;
        countdown.classList.add("hidden");
    }

    if (!socket.connected) {
        socket.connect();
    }

    socket.emit('join-room', { playerName, roomCode: code });
}

function cancelMatchmaking() {
    playSound('keypress');
    socket.disconnect();
    socket.connect();
    
    const modal = document.getElementById("modal-matchmaking");
    if (modal) {
        modal.classList.add("hidden");
    }
}
