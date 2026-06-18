const wordBank = require('./wordBank');

// Store active rooms (roomId -> room state)
const rooms = new Map();

// Matchmaking queue
let matchmakingQueue = [];

function handleConnection(io, socket) {
    console.log(`Socket connected: ${socket.id}`);

    // Join matchmaking queue
    socket.on('join-random', async (data) => {
        let playerName = '';
        let difficulty = 'hardcore';
        if (typeof data === 'string') {
            playerName = data;
        } else if (data && typeof data === 'object') {
            playerName = data.playerName;
            difficulty = data.difficulty || 'hardcore';
        }

        leaveRoomsAndQueue(io, socket);

        matchmakingQueue.push({ socket, playerName, difficulty });
        console.log(`Player ${playerName} (${socket.id}) joined matchmaking queue. Queue size: ${matchmakingQueue.length}`);

        if (matchmakingQueue.length >= 2) {
            const player1 = matchmakingQueue.shift();
            const player2 = matchmakingQueue.shift();

            if (player1.socket.matchmakingTimeout) clearTimeout(player1.socket.matchmakingTimeout);
            if (player2.socket.matchmakingTimeout) clearTimeout(player2.socket.matchmakingTimeout);

            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const room = {
                roomId,
                players: [
                    { id: player1.socket.id, name: player1.playerName, score: 0, activeRow: 0, finished: false, timeLeft: 60 },
                    { id: player2.socket.id, name: player2.playerName, score: 0, activeRow: 0, finished: false, timeLeft: 60 }
                ],
                word: wordBank.getRandomWord(),
                started: true,
                round: 1,
                timerInterval: null
            };

            rooms.set(roomId, room);

            await player1.socket.join(roomId);
            await player2.socket.join(roomId);

            console.log(`Match found! Room ${roomId} created for ${player1.playerName} and ${player2.playerName}`);

            io.to(roomId).emit('match-found', {
                roomId,
                players: room.players.map(p => ({ id: p.id, name: p.name }))
            });

            startGame(io, room);
        } else {
            // Only 1 player. Start a timer to spawn a bot if no one else joins in 5 seconds
            socket.matchmakingTimeout = setTimeout(() => {
                const index = matchmakingQueue.findIndex(p => p.socket.id === socket.id);
                if (index !== -1) {
                    matchmakingQueue.splice(index, 1);
                    startBotGame(io, socket, playerName, difficulty);
                }
            }, 5000);
        }
    });

    // Join private room by code
    socket.on('join-room', async ({ playerName, roomCode }) => {
        leaveRoomsAndQueue(io, socket);

        const code = roomCode.trim().toUpperCase();
        let room = rooms.get(code);

        if (!room) {
            room = {
                roomId: code,
                players: [
                    { id: socket.id, name: playerName, score: 0, activeRow: 0, finished: false, timeLeft: 60 }
                ],
                word: '',
                started: false,
                round: 1,
                timerInterval: null
            };
            rooms.set(code, room);
            await socket.join(code);
            console.log(`Private room ${code} created by ${playerName}`);
        } else {
            if (room.players.length < 2) {
                room.players.push({
                    id: socket.id,
                    name: playerName,
                    score: 0,
                    activeRow: 0,
                    finished: false,
                    timeLeft: 60
                });
                await socket.join(code);
                room.started = true;
                room.word = wordBank.getRandomWord();
                console.log(`Player ${playerName} joined private room ${code}`);

                io.to(code).emit('match-found', {
                    roomId: code,
                    players: room.players.map(p => ({ id: p.id, name: p.name }))
                });

                startGame(io, room);
            } else {
                socket.emit('room-error', 'Room is full.');
            }
        }
    });

    // Submit guess
    socket.on('submit-guess', (guessWord) => {
        const room = findRoomBySocketId(socket.id);
        if (!room || !room.started) return;

        const player = room.players.find(p => p.id === socket.id);
        const opponent = room.players.find(p => p.id !== socket.id);

        if (!player || player.finished) return;

        const guess = guessWord.trim().toUpperCase();
        if (guess.length !== 5) return;

        const targetWord = room.word;
        const targetLetters = targetWord.split("");
        const guessLetters = guess.split("");
        
        const cellStates = Array(5).fill("absent");
        const targetUsed = Array(5).fill(false);

        // First pass: find all correct (green) spots
        for (let i = 0; i < 5; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                cellStates[i] = "correct";
                targetUsed[i] = true;
            }
        }

        // Second pass: find present (yellow) spots
        for (let i = 0; i < 5; i++) {
            if (cellStates[i] === "correct") continue;

            for (let j = 0; j < 5; j++) {
                if (!targetUsed[j] && guessLetters[i] === targetLetters[j]) {
                    cellStates[i] = "present";
                    targetUsed[j] = true;
                    break;
                }
            }
        }

        player.activeRow++;

        // Deal damage: deduct 3s off opponent timer per correct letter
        let correctCount = 0;
        cellStates.forEach(s => {
            if (s === "correct") correctCount++;
        });

        if (correctCount > 0 && opponent) {
            opponent.timeLeft = Math.max(0, opponent.timeLeft - (correctCount * 3));
            console.log(`Player ${player.name} dealt ${correctCount * 3}s damage to ${opponent.name}. Opponent time: ${opponent.timeLeft}`);
        }

        // Send guess result to guesser
        socket.emit('guess-result', {
            guess,
            cellStates,
            row: player.activeRow - 1
        });

        // Send opponent progress (letters hidden) to opponent
        if (opponent) {
            io.to(opponent.id).emit('opponent-progress', {
                row: player.activeRow - 1,
                cellStates
            });
        }

        // Check game end conditions
        if (guess === targetWord) {
            player.finished = true;
            endRound(io, room, player);
        } else if (player.activeRow >= 6) {
            player.finished = true;
            if (opponent && opponent.finished) {
                // Both players completed without solving
                endRound(io, room, null);
            }
        }
    });

    // Next round trigger
    socket.on('next-round', () => {
        const room = findRoomBySocketId(socket.id);
        if (!room) return;

        // Reset player round variables
        room.players.forEach(p => {
            p.activeRow = 0;
            p.finished = false;
            p.timeLeft = 60;
        });

        room.word = wordBank.getRandomWord();
        room.started = true;
        room.round++;

        console.log(`Starting round ${room.round} in room ${room.roomId}. Word: ${room.word}`);

        startGame(io, room);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        leaveRoomsAndQueue(io, socket);
    });
}

function startGame(io, room) {
    clearInterval(room.timerInterval);
    if (room.botTimeout) clearTimeout(room.botTimeout);
    
    io.to(room.roomId).emit('game-start', {
        roomId: room.roomId,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
        round: room.round
    });

    // Check if there is a bot in the room, and schedule its first guess
    const hasBot = room.players.some(p => p.id === 'bot');
    if (hasBot && room.started) {
        scheduleNextBotGuess(io, room);
    }

    room.timerInterval = setInterval(() => {
        let activePlayersCount = 0;
        let expiredPlayers = [];

        room.players.forEach(p => {
            if (!p.finished) {
                p.timeLeft--;
                activePlayersCount++;

                if (p.timeLeft <= 0) {
                    p.timeLeft = 0;
                    p.finished = true;
                    expiredPlayers.push(p);
                }
            }
        });

        // Sync timers with both players
        room.players.forEach(p => {
            const opponent = room.players.find(other => other.id !== p.id);
            io.to(p.id).emit('timer-sync', {
                playerTime: p.timeLeft,
                opponentTime: opponent ? opponent.timeLeft : 0
            });
        });

        if (expiredPlayers.length > 0) {
            clearInterval(room.timerInterval);
            if (expiredPlayers.length === 2) {
                // Both players expired at the exact same second
                endRound(io, room, null);
            } else {
                // Only one player expired; the other wins
                const winner = room.players.find(other => other.id !== expiredPlayers[0].id);
                endRound(io, room, winner);
            }
            return;
        }

        if (activePlayersCount === 0) {
            clearInterval(room.timerInterval);
        }
    }, 1000);
}

function endRound(io, room, winnerPlayer) {
    clearInterval(room.timerInterval);
    if (room.botTimeout) clearTimeout(room.botTimeout);

    if (winnerPlayer) {
        winnerPlayer.score++;
    }

    io.to(room.roomId).emit('round-over', {
        winnerId: winnerPlayer ? winnerPlayer.id : null,
        winnerName: winnerPlayer ? winnerPlayer.name : 'No one',
        word: room.word,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
    });
}

function findRoomBySocketId(socketId) {
    for (const room of rooms.values()) {
        if (room.players.some(p => p.id === socketId)) {
            return room;
        }
    }
    return null;
}

function leaveRoomsAndQueue(io, socket) {
    if (socket.matchmakingTimeout) {
        clearTimeout(socket.matchmakingTimeout);
    }
    matchmakingQueue = matchmakingQueue.filter(p => p.socket.id !== socket.id);

    const room = findRoomBySocketId(socket.id);
    if (room) {
        clearInterval(room.timerInterval);
        if (room.botTimeout) {
            clearTimeout(room.botTimeout);
        }
        const opponent = room.players.find(p => p.id !== socket.id);
        if (opponent && opponent.id !== 'bot') {
            io.to(opponent.id).emit('opponent-disconnected');
        }
        rooms.delete(room.roomId);
        socket.leave(room.roomId);
    }
}

async function startBotGame(io, socket, playerName, difficulty) {
    const roomId = "BOT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = {
        roomId,
        players: [
            { id: socket.id, name: playerName, score: 0, activeRow: 0, finished: false, timeLeft: 60 },
            { id: 'bot', name: `ByteBot [${difficulty.toUpperCase()}]`, score: 0, activeRow: 0, finished: false, timeLeft: 60 }
        ],
        word: wordBank.getRandomWord(),
        started: true,
        round: 1,
        difficulty,
        timerInterval: null,
        botTimeout: null
    };

    rooms.set(roomId, room);
    await socket.join(roomId);

    console.log(`Bot Match created! Room ${roomId} for ${playerName} vs Bot (${difficulty})`);

    io.to(roomId).emit('match-found', {
        roomId,
        players: room.players.map(p => ({ id: p.id, name: p.name }))
    });

    startGame(io, room);
}

function scheduleNextBotGuess(io, room) {
    if (room.botTimeout) clearTimeout(room.botTimeout);

    const bot = room.players.find(p => p.id === 'bot');
    if (!bot || bot.finished || !room.started) return;

    let minDelay = 12000;
    let maxDelay = 16000;

    if (room.difficulty === 'medium') {
        minDelay = 8000;
        maxDelay = 12000;
    } else if (room.difficulty === 'hardcore') {
        minDelay = 5000;
        maxDelay = 8000;
    }

    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    room.botTimeout = setTimeout(() => {
        makeBotGuess(io, room);
    }, delay);
}

function makeBotGuess(io, room) {
    const bot = room.players.find(p => p.id === 'bot');
    const human = room.players.find(p => p.id !== 'bot');

    if (!bot || bot.finished || !room.started) return;

    const targetWord = room.word;
    const activeRow = bot.activeRow;
    const difficulty = room.difficulty || 'hardcore';

    let guess = '';
    let shouldSolve = false;

    if (difficulty === 'easy') {
        if (activeRow === 4 && Math.random() < 0.2) shouldSolve = true;
        else if (activeRow === 5 && Math.random() < 0.4) shouldSolve = true;
    } else if (difficulty === 'medium') {
        if (activeRow === 2 && Math.random() < 0.15) shouldSolve = true;
        else if (activeRow === 3 && Math.random() < 0.4) shouldSolve = true;
        else if (activeRow === 4 && Math.random() < 0.7) shouldSolve = true;
        else if (activeRow === 5) shouldSolve = true;
    } else { // hardcore
        if (activeRow === 1 && Math.random() < 0.15) shouldSolve = true;
        else if (activeRow === 2 && Math.random() < 0.5) shouldSolve = true;
        else if (activeRow === 3 && Math.random() < 0.8) shouldSolve = true;
        else if (activeRow === 4 || activeRow === 5) shouldSolve = true;
    }

    if (shouldSolve) {
        guess = targetWord;
    } else {
        const pool = wordBank.WORDLE_WORDS.filter(w => w.toUpperCase() !== targetWord.toUpperCase());
        guess = pool[Math.floor(Math.random() * pool.length)].toUpperCase();
    }

    const targetLetters = targetWord.split("");
    const guessLetters = guess.split("");
    
    const cellStates = Array(5).fill("absent");
    const targetUsed = Array(5).fill(false);

    for (let i = 0; i < 5; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            cellStates[i] = "correct";
            targetUsed[i] = true;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (cellStates[i] === "correct") continue;

        for (let j = 0; j < 5; j++) {
            if (!targetUsed[j] && guessLetters[i] === targetLetters[j]) {
                cellStates[i] = "present";
                targetUsed[j] = true;
                break;
            }
        }
    }

    bot.activeRow++;

    // Deal damage
    let correctCount = 0;
    cellStates.forEach(s => {
        if (s === "correct") correctCount++;
    });

    if (correctCount > 0 && human) {
        human.timeLeft = Math.max(0, human.timeLeft - (correctCount * 3));
        console.log(`Bot dealt ${correctCount * 3}s damage to ${human.name}. Human time: ${human.timeLeft}`);
        
        io.to(human.id).emit('timer-sync', {
            playerTime: human.timeLeft,
            opponentTime: bot.timeLeft
        });
    }

    if (human) {
        io.to(human.id).emit('opponent-progress', {
            row: bot.activeRow - 1,
            cellStates
        });
    }

    console.log(`Bot guessed: ${guess} (Row: ${bot.activeRow - 1}, Feedback: ${cellStates.join(",")})`);

    if (guess === targetWord) {
        bot.finished = true;
        endRound(io, room, bot);
    } else if (bot.activeRow >= 6) {
        bot.finished = true;
        if (human && human.finished) {
            endRound(io, room, null);
        }
    } else {
        scheduleNextBotGuess(io, room);
    }
}

module.exports = {
    handleConnection
};
