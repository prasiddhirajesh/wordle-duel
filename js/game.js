// --- GAME CONSTANTS & STATE ---
const GRID_ROWS = 6;
const GRID_COLS = 5;

let scorePlayer = 0;
let scoreOpponent = 0;
let winStreak = parseInt(localStorage.getItem("totalWinStreak") || "0", 10);

// Player current game board state
let playerGridState = []; // 6 rows, each row has strings
let playerActiveRow = 0;
let playerActiveCol = 0;
let isGameFinished = false;

// Opponent game board state (mini grid)
let opponentGridState = []; // 6 rows of colors: 'correct', 'present', 'absent', 'empty'
let opponentActiveRow = 0;
let opponentFinished = false;

// Duel Timer state
let timeLeft = 60; // total seconds starting
let timerTotalMax = 60;

// Results screen countdown
let resultsCountdownInterval = null;
let resultsCountdownSeconds = 5;

// Keep track of keyboard key colors
let keyColors = {}; // e.g., 'Q': 'key-correct', 'present', 'absent'

// Initialize a new round/match
function initGame(opponentName) {
    isGameFinished = false;
    playerActiveRow = 0;
    playerActiveCol = 0;
    opponentActiveRow = 0;
    opponentFinished = false;

    // Hide Round Over Modal
    const roundOverModal = document.getElementById("modal-round-over");
    if (roundOverModal) {
        roundOverModal.classList.add("hidden");
    }

    // Reset scores
    const playerScoreEl = document.getElementById("player-score");
    const opponentScoreEl = document.getElementById("opponent-score");
    if (playerScoreEl) playerScoreEl.textContent = scorePlayer;
    if (opponentScoreEl) opponentScoreEl.textContent = scoreOpponent;

    // Set opponent name
    const opponentLabel = document.getElementById("opponent-name-label");
    if (opponentLabel && opponentName) {
        opponentLabel.textContent = opponentName;
    }

    // Setup difficulty (defaults to HARDCORE for multiplayer)
    const arenaDiffEl = document.getElementById("arena-difficulty");
    const arenaWinEl = document.getElementById("arena-winstreak");
    if (arenaDiffEl) {
        if (opponentName && opponentName.startsWith("ByteBot")) {
            arenaDiffEl.textContent = opponentName.includes("[EASY]") ? "BOT (EASY)" :
                                      opponentName.includes("[MEDIUM]") ? "BOT (MEDIUM)" : "BOT (HARDCORE)";
        } else {
            arenaDiffEl.textContent = "MULTIPLAYER";
        }
    }
    if (arenaWinEl) arenaWinEl.textContent = `🔥 ${winStreak} WINS`;

    // Reset keyboard colors
    keyColors = {};
    document.querySelectorAll(".kb-key").forEach(key => {
        key.className = "kb-key w-8 h-12 md:w-10 md:h-14 rounded text-on-surface font-bold text-sm flex items-center justify-center";
        if (key.dataset.key === 'ENTER' || key.dataset.key === 'BACKSPACE') {
            key.className = "kb-key px-3 h-12 md:h-14 rounded text-on-surface font-bold text-[10px] tracking-tighter flex items-center justify-center";
        }
    });

    // Initialize Grid structures
    buildGrids();

    // Set up timers
    timeLeft = 60;
    timerTotalMax = 60;
    updateTimerDisplay();

    navigateTo("arena");
}

// Draw blank grids
function buildGrids() {
    // Player grid HTML
    const playerGrid = document.getElementById("player-grid");
    if (playerGrid) {
        playerGrid.innerHTML = "";
        playerGridState = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(""));

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const cell = document.createElement("div");
                cell.id = `cell-p-${r}-${c}`;
                cell.className = "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center font-game-tile text-2xl font-bold bg-surface-container-lowest rounded border border-outline-variant/10 transition-all duration-300";
                playerGrid.appendChild(cell);
            }
        }
    }

    // Opponent Grid HTML
    const opponentGrid = document.getElementById("opponent-grid");
    if (opponentGrid) {
        opponentGrid.innerHTML = "";
        opponentGridState = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill("empty"));

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const block = document.createElement("div");
                block.id = `cell-o-${r}-${c}`;
                block.className = "w-8 h-8 bg-surface-container-lowest rounded-sm border border-outline-variant/10 transition-all duration-300";
                opponentGrid.appendChild(block);
            }
        }
    }
}

// --- TIMER DISPLAY ---
function updateTimerDisplay() {
    const timerEl = document.getElementById("timer");
    const timerContainer = document.getElementById("timer-container");
    const timerCircle = document.getElementById("timer-circle");

    if (timerEl && timerContainer && timerCircle) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Update SVG radial border offset
        const circumference = 264;
        const offset = circumference - (timeLeft / timerTotalMax) * circumference;
        timerCircle.style.strokeDashoffset = offset;

        // Visual feedback when running out of time
        if (timeLeft <= 10) {
            timerEl.className = "font-label-mono text-xl font-bold text-error";
            timerCircle.className.baseVal = "text-error timer-glow-red";
            timerContainer.className = "relative w-24 h-24 flex items-center justify-center bg-surface-container-highest rounded-full border-2 border-error/20 animate-pulse-soft";
        } else {
            timerEl.className = "font-label-mono text-xl font-bold text-primary";
            timerCircle.className.baseVal = "text-primary timer-glow";
            timerContainer.className = "relative w-24 h-24 flex items-center justify-center bg-surface-container-highest rounded-full border-2 border-primary/20 animate-pulse-soft";
        }
    }
}

// Handle physical keyboard input
window.addEventListener("keydown", (e) => {
    if (currentScreen !== "arena" || isGameFinished) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    const key = e.key.toUpperCase();
    let virtualKey = null;

    if (key === "ENTER") {
        virtualKey = "ENTER";
    } else if (key === "BACKSPACE") {
        virtualKey = "BACKSPACE";
    } else if (/^[A-Z]$/.test(key)) {
        virtualKey = key;
    }

    if (virtualKey) {
        e.preventDefault();
        handleKeyInput(virtualKey);
        
        const keyBtn = document.querySelector(`[data-key="${virtualKey}"]`);
        if (keyBtn) {
            keyBtn.classList.add("pressed");
        }
    }
});

window.addEventListener("keyup", (e) => {
    if (currentScreen !== "arena") return;
    
    const key = e.key.toUpperCase();
    let virtualKey = null;

    if (key === "ENTER") {
        virtualKey = "ENTER";
    } else if (key === "BACKSPACE") {
        virtualKey = "BACKSPACE";
    } else if (/^[A-Z]$/.test(key)) {
        virtualKey = key;
    }

    if (virtualKey) {
        const keyBtn = document.querySelector(`[data-key="${virtualKey}"]`);
        if (keyBtn) {
            keyBtn.classList.remove("pressed");
        }
    }
});


function handleKeyInput(key) {
    if (isGameFinished) return;
    initAudio(); // Initialize audio context on first interaction if not yet ready
    playSound('keypress');
    triggerHaptic(8);

    if (key === "BACKSPACE") {
        if (playerActiveCol > 0) {
            playerActiveCol--;
            playerGridState[playerActiveRow][playerActiveCol] = "";
            updateCellUI(playerActiveRow, playerActiveCol, "", "inactive");
        }
    } else if (key === "ENTER") {
        if (playerActiveCol === GRID_COLS) {
            submitGuess();
        } else {
            playSound('error');
            shakeActiveRow();
        }
    } else {
        // Typing letters
        if (playerActiveCol < GRID_COLS) {
            playerGridState[playerActiveRow][playerActiveCol] = key;
            updateCellUI(playerActiveRow, playerActiveCol, key, "active");
            playerActiveCol++;
        }
    }
}

function updateCellUI(row, col, letter, state) {
    const cell = document.getElementById(`cell-p-${row}-${col}`);
    if (cell) {
        cell.textContent = letter;
        
        if (state === "active") {
            cell.className = "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center font-game-tile text-2xl font-bold bg-surface-container border-2 border-primary/50 tile-active rounded scale-105 transition-all duration-100";
            setTimeout(() => {
                cell.className = "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center font-game-tile text-2xl font-bold bg-surface-container border-2 border-primary/50 tile-active rounded transition-all";
            }, 100);
        } else if (state === "inactive") {
            cell.className = "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center font-game-tile text-2xl font-bold bg-surface-container-lowest rounded border border-outline-variant/10 transition-all";
        }
    }
}

function shakeActiveRow() {
    for (let c = 0; c < GRID_COLS; c++) {
        const cell = document.getElementById(`cell-p-${playerActiveRow}-${c}`);
        if (cell) {
            cell.classList.add("shake");
            setTimeout(() => cell.classList.remove("shake"), 500);
        }
    }
}

// Submit player's guess to server
function submitGuess() {
    const guess = playerGridState[playerActiveRow].join("");
    // Send to Socket.IO server
    sendPlayerGuess(guess);
}

// Handle guess validation feedback from server
function revealPlayerGuess(guess, cellStates, row) {
    const guessLetters = guess.split("");

    // Animate tile reveals with delay
    for (let i = 0; i < GRID_COLS; i++) {
        const cell = document.getElementById(`cell-p-${row}-${i}`);
        const state = cellStates[i];
        const letter = guessLetters[i];

        if (cell) {
            setTimeout(() => {
                cell.classList.add("tile-flip");
                playSound('flip');

                setTimeout(() => {
                    cell.classList.remove("tile-flip");
                    if (state === "correct") {
                        cell.className = "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center font-game-tile text-2xl font-bold tile-correct rounded";
                        updateKeyColor(letter, "key-correct");
                    } else if (state === "present") {
                        cell.className = "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center font-game-tile text-2xl font-bold tile-present rounded";
                        updateKeyColor(letter, "key-present");
                    } else {
                        cell.className = "w-14 h-14 md:w-16 md:h-16 flex items-center justify-center font-game-tile text-2xl font-bold tile-absent rounded";
                        updateKeyColor(letter, "key-absent");
                    }
                }, 250);
            }, i * 150);
        }
    }

    const delayTime = GRID_COLS * 150 + 300;
    setTimeout(() => {
        playerActiveRow = row + 1;
        playerActiveCol = 0;
    }, delayTime);
}

// Reveal opponent progress on mini grid
function revealOpponentProgress(row, cellStates) {
    for (let c = 0; c < GRID_COLS; c++) {
        const block = document.getElementById(`cell-o-${row}-${c}`);
        const state = cellStates[c];
        opponentGridState[row][c] = state;

        if (block) {
            if (state === "correct") {
                block.className = "w-8 h-8 bg-secondary-container rounded-sm shadow-[0_0_8px_rgba(47,248,1,0.3)] transition-all duration-300";
            } else if (state === "present") {
                block.className = "w-8 h-8 bg-tertiary-container rounded-sm shadow-[0_0_8px_rgba(205,205,0,0.3)] transition-all duration-300";
            } else {
                block.className = "w-8 h-8 bg-surface-container-highest rounded-sm border border-outline-variant/10 transition-all duration-300";
            }
        }
    }
    opponentActiveRow = row + 1;
}

function updateKeyColor(letter, colorClass) {
    const keyBtn = document.querySelector(`[data-key="${letter}"]`);
    if (!keyBtn) return;

    const currentClass = keyColors[letter];
    if (currentClass === "key-correct") return;
    if (currentClass === "key-present" && colorClass === "key-absent") return;

    keyColors[letter] = colorClass;
    keyBtn.className = `kb-key w-8 h-12 md:w-10 md:h-14 rounded text-on-surface font-bold text-sm flex items-center justify-center ${colorClass}`;
}

// --- END ROUND & RESULTS ---

function finishRound(didPlayerWin, reasonText, secretWord) {
    isGameFinished = true;

    // Update persistent stats
    const stats = getStats();
    stats.gamesPlayed++;
    if (didPlayerWin) {
        stats.gamesWon++;
        stats.streak++;
        stats.history.push("win");
    } else {
        stats.streak = 0;
        stats.history.push("loss");
    }
    if (stats.history.length > 20) stats.history.shift();
    saveStats(stats.gamesPlayed, stats.gamesWon, stats.streak, stats.history);

    // Sync current session winStreak
    winStreak = stats.streak;

    // Update Scores on Arena Screen instantly
    const playerScoreEl = document.getElementById("player-score");
    const opponentScoreEl = document.getElementById("opponent-score");
    if (playerScoreEl) playerScoreEl.textContent = scorePlayer;
    if (opponentScoreEl) opponentScoreEl.textContent = scoreOpponent;

    // Update Round-Over Modal Title & Subtitle
    const modalTitle = document.getElementById("round-over-title");
    const modalSub = document.getElementById("round-over-subtitle");

    if (didPlayerWin) {
        playSound('win');
        const title = document.getElementById("result-title");
        const sub = document.getElementById("result-subtitle");
        if (title) {
            title.textContent = "ROUND WON";
            title.className = "text-3xl font-extrabold text-secondary mb-2 uppercase tracking-tight";
        }
        if (sub) sub.textContent = reasonText || "You were faster than your opponent!";

        if (modalTitle) {
            modalTitle.textContent = "ROUND WON";
            modalTitle.className = "text-3xl font-extrabold text-secondary mb-2 uppercase tracking-tight";
        }
        if (modalSub) modalSub.textContent = reasonText || "You were faster than your opponent!";
    } else {
        playSound('lose');
        const title = document.getElementById("result-title");
        const sub = document.getElementById("result-subtitle");
        if (title) {
            title.textContent = "ROUND LOST";
            title.className = "text-3xl font-extrabold text-error mb-2 uppercase tracking-tight";
        }
        if (sub) sub.textContent = reasonText || "Your opponent outmaxxing you!";

        if (modalTitle) {
            modalTitle.textContent = "ROUND LOST";
            modalTitle.className = "text-3xl font-extrabold text-error mb-2 uppercase tracking-tight";
        }
        if (modalSub) modalSub.textContent = reasonText || "Your opponent outmaxxing you!";
    }

    // Function to populate word reveal container
    const populateWordReveal = (container) => {
        if (!container || !secretWord) return;
        container.innerHTML = "";
        secretWord.split("").forEach(letter => {
            const box = document.createElement("div");
            box.className = "w-14 h-14 flex items-center justify-center rounded-xl bg-secondary-fixed-dim text-on-secondary-fixed border border-secondary neon-border-green scale-105 transition-all duration-300";
            
            const charSpan = document.createElement("span");
            charSpan.className = "text-2xl font-extrabold font-game-tile";
            charSpan.textContent = letter;
            box.appendChild(charSpan);
            container.appendChild(box);
        });
    };

    // Populate both the background stats screen and the active overlay modal
    populateWordReveal(document.getElementById("word-reveal"));
    populateWordReveal(document.getElementById("round-over-word-reveal"));

    // Update result match score
    const resTime = document.getElementById("result-time");
    const scoreP = document.getElementById("score-player");
    const scoreO = document.getElementById("score-opponent");
    const modalScoreP = document.getElementById("round-over-score-player");
    const modalScoreO = document.getElementById("round-over-score-opponent");
    const timer = document.getElementById("timer");

    if (resTime && timer) resTime.textContent = timer.textContent;
    if (scoreP) scoreP.textContent = scorePlayer;
    if (scoreO) scoreO.textContent = scoreOpponent;
    if (modalScoreP) modalScoreP.textContent = scorePlayer;
    if (modalScoreO) modalScoreO.textContent = scoreOpponent;

    startResultsCountdown();

    // Show the Round-Over Modal
    const roundOverModal = document.getElementById("modal-round-over");
    if (roundOverModal) {
        roundOverModal.classList.remove("hidden");
    }
}

function startResultsCountdown() {
    clearInterval(resultsCountdownInterval);
    resultsCountdownSeconds = 5;
    
    const label = document.getElementById("countdown-label");
    const bar = document.getElementById("countdown-bar");
    const modalLabel = document.getElementById("round-over-countdown-label");
    const modalBar = document.getElementById("round-over-countdown-bar");
    
    const updateUI = () => {
        if (label) label.textContent = `NEXT WORD IN ${resultsCountdownSeconds}S`;
        if (modalLabel) modalLabel.textContent = `NEXT WORD IN ${resultsCountdownSeconds}S`;
    };

    updateUI();
    
    if (bar) {
        bar.classList.remove("animate-countdown");
        void bar.offsetWidth; // trigger reflow
        bar.classList.add("animate-countdown");
    }
    if (modalBar) {
        modalBar.classList.remove("animate-countdown");
        void modalBar.offsetWidth; // trigger reflow
        modalBar.classList.add("animate-countdown");
    }

    resultsCountdownInterval = setInterval(() => {
        resultsCountdownSeconds--;
        if (resultsCountdownSeconds > 0) {
            updateUI();
        } else {
            if (label) label.textContent = `LOADING...`;
            if (modalLabel) modalLabel.textContent = `LOADING...`;
            clearInterval(resultsCountdownInterval);
            nextRound(); // Request next round from server
        }
    }, 1000);
}

function nextRound() {
    clearInterval(resultsCountdownInterval);
    playSound('keypress');
    requestNextRound();
}

function backToLobby() {
    clearInterval(resultsCountdownInterval);
    playSound('keypress');
    scorePlayer = 0;
    scoreOpponent = 0;
    
    // Reset active winStreak from persistent localStorage stats
    const stats = getStats();
    winStreak = stats.streak;

    isMatchActive = false;
    disconnectSocket();
    
    const roundOverModal = document.getElementById("modal-round-over");
    if (roundOverModal) {
        roundOverModal.classList.add("hidden");
    }

    navigateTo("lobby");
}

// --- PERSISTENT STATS HELPERS ---

function getStats() {
    const gamesPlayed = parseInt(localStorage.getItem("totalGamesPlayed") || "0", 10);
    const gamesWon = parseInt(localStorage.getItem("totalGamesWon") || "0", 10);
    const streak = parseInt(localStorage.getItem("totalWinStreak") || "0", 10);
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem("matchHistory") || "[]");
    } catch (e) {
        history = [];
    }
    return { gamesPlayed, gamesWon, streak, history };
}

function saveStats(gamesPlayed, gamesWon, streak, history) {
    localStorage.setItem("totalGamesPlayed", gamesPlayed);
    localStorage.setItem("totalGamesWon", gamesWon);
    localStorage.setItem("totalWinStreak", streak);
    localStorage.setItem("matchHistory", JSON.stringify(history));
}

function resetLocalStats() {
    playSound('keypress');
    if (confirm("Are you sure you want to reset all your statistics? This cannot be undone.")) {
        saveStats(0, 0, 0, []);
        renderStatsScreen();
    }
}

function renderStatsScreen() {
    const stats = getStats();
    
    const playedEl = document.getElementById("stats-games-played");
    const wonEl = document.getElementById("stats-games-won");
    const rateEl = document.getElementById("stats-win-rate");
    const streakEl = document.getElementById("stats-win-streak");
    const historyContainer = document.getElementById("stats-history-dots");

    if (playedEl) playedEl.textContent = stats.gamesPlayed;
    if (wonEl) wonEl.textContent = stats.gamesWon;
    
    const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
    if (rateEl) rateEl.textContent = `${winRate}%`;
    if (streakEl) streakEl.textContent = `🔥 ${stats.streak}`;

    if (historyContainer) {
        historyContainer.innerHTML = "";
        if (stats.history.length === 0) {
            const emptyLabel = document.createElement("span");
            emptyLabel.className = "text-xs font-label-mono text-on-surface-variant/50 uppercase tracking-wider";
            emptyLabel.textContent = "No games played yet";
            historyContainer.appendChild(emptyLabel);
        } else {
            // Render up to last 7 performance entries
            const latest = stats.history.slice(-7);
            latest.forEach(result => {
                const dot = document.createElement("div");
                if (result === "win") {
                    dot.className = "w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-[10px] text-on-secondary-fixed font-bold shadow-[0_0_8px_rgba(47,248,1,0.4)]";
                    dot.innerHTML = "W";
                } else {
                    dot.className = "w-6 h-6 rounded-full bg-error-container flex items-center justify-center text-[10px] text-on-error-container font-bold border border-error/20";
                    dot.innerHTML = "L";
                }
                historyContainer.appendChild(dot);
            });
        }
    }
}
