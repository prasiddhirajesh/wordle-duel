// --- UI & NAVIGATION STATE ---
let currentScreen = "lobby";
let difficulty = "hardcore";
let isMatchActive = false;

function navigateTo(screenId) {
    currentScreen = screenId;

    // Toggle screens
    const lobby = document.getElementById("screen-lobby");
    const arena = document.getElementById("screen-arena");
    const results = document.getElementById("screen-results");

    if (lobby) lobby.classList.add("hidden-screen");
    if (arena) arena.classList.add("hidden-screen");
    if (results) results.classList.add("hidden-screen");

    const activeScreen = document.getElementById(`screen-${screenId}`);
    if (activeScreen) {
        activeScreen.classList.remove("hidden-screen");
    }

    // Handle Active/Inactive Arena views
    if (screenId === "arena") {
        const activeGame = document.getElementById("arena-active-game");
        const inactiveGame = document.getElementById("arena-inactive-game");
        if (activeGame && inactiveGame) {
            if (isMatchActive) {
                activeGame.classList.remove("hidden");
                inactiveGame.classList.add("hidden");
            } else {
                activeGame.classList.add("hidden");
                inactiveGame.classList.remove("hidden");
            }
        }
    }

    // Refresh persistent stats screen data when visiting the Stats screen
    if (screenId === "results") {
        if (typeof renderStatsScreen === 'function') {
            renderStatsScreen();
        }
    }

    // Update Bottom Nav active states
    const navLobby = document.getElementById("nav-lobby");
    const navArena = document.getElementById("nav-arena");
    const navResults = document.getElementById("nav-results");

    if (navLobby && navArena && navResults) {
        navLobby.className = "flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:text-primary transition-all active:scale-90 cursor-pointer";
        navArena.className = "flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:text-primary transition-all active:scale-90 cursor-pointer";
        navResults.className = "flex flex-col items-center justify-center text-on-surface-variant px-4 py-1 hover:text-primary transition-all active:scale-90 cursor-pointer";

        if (screenId === "lobby") {
            navLobby.className = "flex flex-col items-center justify-center text-primary bg-surface-container-high rounded px-6 py-2 transition-all active:scale-90 cursor-pointer border border-primary/20";
        } else if (screenId === "arena") {
            navArena.className = "flex flex-col items-center justify-center text-primary bg-surface-container-high rounded px-6 py-2 transition-all active:scale-90 cursor-pointer border border-primary/20";
        } else if (screenId === "results") {
            navResults.className = "flex flex-col items-center justify-center text-primary bg-surface-container-high rounded px-6 py-2 transition-all active:scale-90 cursor-pointer border border-primary/20";
        }
    }
}

// --- MODAL TOGGLES ---
function toggleHelpModal(show) {
    playSound('keypress');
    const modal = document.getElementById("modal-help");
    if (modal) {
        if (show) {
            modal.classList.remove("hidden");
        } else {
            modal.classList.add("hidden");
        }
    }
}

function toggleSettingsModal(show) {
    playSound('keypress');
    const modal = document.getElementById("modal-settings");
    if (modal) {
        if (show) {
            modal.classList.remove("hidden");
        } else {
            modal.classList.add("hidden");
        }
    }
}

function setDifficulty(level) {
    playSound('keypress');
    difficulty = level;
    // Update button styles
    const btnEasy = document.getElementById("diff-easy");
    const btnMedium = document.getElementById("diff-medium");
    const btnHardcore = document.getElementById("diff-hardcore");

    if (btnEasy && btnMedium && btnHardcore) {
        btnEasy.className = "py-2.5 rounded-lg font-bold text-xs uppercase border border-white/10 bg-surface-container-high text-on-surface-variant";
        btnMedium.className = "py-2.5 rounded-lg font-bold text-xs uppercase border border-white/10 bg-surface-container-high text-on-surface-variant";
        btnHardcore.className = "py-2.5 rounded-lg font-bold text-xs uppercase border border-white/10 bg-surface-container-high text-on-surface-variant";

        if (level === 'easy') {
            btnEasy.className = "py-2.5 rounded-lg font-bold text-xs uppercase border border-primary/40 bg-primary/20 text-primary";
        } else if (level === 'medium') {
            btnMedium.className = "py-2.5 rounded-lg font-bold text-xs uppercase border border-primary/40 bg-primary/20 text-primary";
        } else {
            btnHardcore.className = "py-2.5 rounded-lg font-bold text-xs uppercase border border-primary/40 bg-primary/20 text-primary";
        }
    }
}

function toggleAudio() {
    playSound('keypress');
    audioEnabled = !audioEnabled;
    const btn = document.getElementById("audio-toggle-btn");
    if (btn) {
        if (audioEnabled) {
            btn.textContent = "ENABLED";
            btn.className = "px-4 py-1.5 rounded-md font-bold text-xs bg-secondary-container text-on-secondary-fixed select-none";
        } else {
            btn.textContent = "DISABLED";
            btn.className = "px-4 py-1.5 rounded-md font-bold text-xs bg-surface-container-highest text-on-surface-variant border border-white/5 select-none";
        }
    }
}

function toggleHaptics() {
    playSound('keypress');
    hapticsEnabled = !hapticsEnabled;
    const btn = document.getElementById("haptic-toggle-btn");
    if (btn) {
        if (hapticsEnabled) {
            btn.textContent = "ENABLED";
            btn.className = "px-4 py-1.5 rounded-md font-bold text-xs bg-secondary-container text-on-secondary-fixed select-none";
            triggerHaptic(30);
        } else {
            btn.textContent = "DISABLED";
            btn.className = "px-4 py-1.5 rounded-md font-bold text-xs bg-surface-container-highest text-on-surface-variant border border-white/5 select-none";
        }
    }
}
