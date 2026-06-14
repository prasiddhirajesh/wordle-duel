# Wordlmaxxing - Multiplayer Wordle Duel

Wordlmaxxing is a real-time multiplayer Wordle duel game featuring high-octane neon aesthetics, retro audio synthesis, haptics feedback, private arenas, and server-side validation.

## Tech Stack
- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS (CDN), Web Audio API, Socket.IO Client.
- **Backend**: Node.js, Express, Socket.IO.

## Project Structure
```
wordlmaxxing/
├── index.html        (Main UI and script loaders)
├── words.js          (Allowed client-side guess validation helper)
├── js/
│   ├── audio.js      (Arcade sound synthesizer & haptic triggers)
│   ├── game.js       (Wordle grid, input and round managers)
│   ├── socket.js     (Socket.IO client setup & listeners)
│   └── ui.js         (Navigation and screen/modal controls)
├── server/
│   ├── server.js     (Express setup & static file server)
│   ├── gameManager.js(Lobby management, matchmaking, timers, & guess evaluation)
│   ├── wordBank.js   (Server-side target words repository)
│   └── package.json  (Server dependencies setup)
└── README.md
```

## Setup & Running Instructions

To launch the real-time multiplayer game locally:

1. Open your terminal and navigate to the `server/` directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the server:
   ```bash
   node server.js
   ```

4. Open your browser and go to:
   ```
   http://localhost:3000
   ```

To test multiplayer, open `http://localhost:3000` in **two separate tabs or window sessions**, click **JOIN RANDOM** on both, and start dueling!
