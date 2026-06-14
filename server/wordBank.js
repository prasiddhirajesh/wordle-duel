// Word list for Wordle Duel (Wordlmaxxing) Node module
const WORDLE_WORDS = [
    "sharp", "sword", "swift", "react", "cyber",
    "hyper", "pixel", "laser", "sonic", "gamer",
    "coder", "arena", "lobby", "fight", "match",
    "timer", "stats", "rules", "multi", "retro",
    "flash", "theme", "color", "light", "space",
    "power", "speed", "force", "logic", "pulse",
    "focus", "board", "score", "round", "level",
    "about", "alert", "alpha", "omega", "orbit",
    "sound", "music", "graph", "chart", "point",
    "cheat", "share", "guest", "admin", "owner",
    "stars", "cloud", "storm", "flame", "frost",
    "beast", "ghost", "witch", "demon", "angel",
    "robot", "alien", "droid", "earth", "solar",
    "comet", "lunar", "night", "shade", "smoke",
    "vapor", "steam", "water", "river", "ocean",
    "beach", "stone", "brick", "metal", "steel",
    "glass", "paper", "print", "write", "speak",
    "voice", "audio", "video", "image", "photo",
    "media", "mouse", "phone", "touch", "swipe",
    "scroll", "click", "press", "enter", "shift",
    "clear", "reset", "start", "pause", "abort",
    "close", "leave"
];

module.exports = {
    WORDLE_WORDS,
    getRandomWord() {
        return WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)].toUpperCase();
    },
    isValidWord(word) {
        return word && word.length === 5; // allow any 5 letter word, or check if it exists in list
    }
};
