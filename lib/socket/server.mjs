/**
 * ═══════════════════════════════════════════════════════════════
 * ARENA 1v1 MULTIPLAYER — AUTHORITATIVE SOCKET.IO ROOM SERVER
 * ═══════════════════════════════════════════════════════════════
 * Provides:
 * 1. Authoritative 1000ms clock ticks from server (0ms client drift)
 * 2. Atomic buzzer resolution (first packet to arrive locks buzz)
 * 3. Authoritative answer verification & score updates (+100)
 * 4. Server-driven 2.5s round transitions & game end
 * 5. Reconnection & room state snapshot recovery
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} socketId
 * @property {string} name
 * @property {number} score
 * @property {boolean} ready
 * @property {boolean} connected
 */

/**
 * @typedef {Object} Room
 * @property {string} code
 * @property {string} hostId
 * @property {string} sport
 * @property {string} difficulty
 * @property {string} [tournament]
 * @property {number} questionCount
 * @property {Array<any>} questions
 * @property {"lobby" | "playing" | "finished"} status
 * @property {Record<string, Player>} players
 * @property {number} currentQ
 * @property {"buzzer" | "answering" | "revealed"} phase
 * @property {string | null} buzzWinner
 * @property {number} timeRemaining
 * @property {NodeJS.Timeout | null} timerInterval
 * @property {NodeJS.Timeout | null} transitionTimeout
 */

/** @type {Record<string, Room>} */
const rooms = {};

/**
 * Sanitize player list for network payload
 * @param {Room} room
 */
function getPlayersPayload(room) {
  const result = {};
  for (const [id, p] of Object.entries(room.players)) {
    result[id] = {
      name: p.name,
      score: p.score,
      ready: p.ready,
      connected: p.connected,
    };
  }
  return result;
}

/**
 * Get simple scores mapping { [token]: score }
 * @param {Room} room
 */
function getScoresPayload(room) {
  const scores = {};
  for (const [id, p] of Object.entries(room.players)) {
    scores[id] = p.score;
  }
  return scores;
}

/**
 * Clear all timers for a room
 * @param {Room} room
 */
function clearRoomTimers(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.transitionTimeout) {
    clearTimeout(room.transitionTimeout);
    room.transitionTimeout = null;
  }
}

/**
 * Start question round authoritatively
 * @param {import("socket.io").Server} io
 * @param {Room} room
 * @param {number} qIndex
 */
function startQuestionRound(io, room, qIndex) {
  clearRoomTimers(room);

  room.currentQ = qIndex;
  room.phase = "buzzer";
  room.buzzWinner = null;
  room.timeRemaining = 15; // 15 seconds to buzz

  const q = room.questions[qIndex];
  if (!q) {
    finishGame(io, room);
    return;
  }

  // Mask the correct answer so clients cannot inspect packet payload during buzzer phase!
  const safeQuestion = {
    id: q.id || `q_${qIndex}`,
    sport: q.sport || room.sport,
    difficulty: q.difficulty || room.difficulty,
    question: q.question,
    options: q.options,
    category: q.category || room.tournament,
  };

  io.to(`room:${room.code}`).emit("question_start", {
    currentQ: qIndex,
    totalQ: room.questions.length,
    question: safeQuestion,
    timeRemaining: 15,
    scores: getScoresPayload(room),
  });

  // Authoritative 1000ms loop
  room.timerInterval = setInterval(() => {
    if (room.phase === "buzzer") {
      room.timeRemaining -= 1;

      io.to(`room:${room.code}`).emit("timer_tick", {
        phase: "buzzer",
        timeRemaining: room.timeRemaining,
        currentQ: room.currentQ,
        buzzWinner: null,
      });

      if (room.timeRemaining <= 0) {
        // Buzzer expired with no buzz
        clearRoomTimers(room);
        room.phase = "revealed";

        io.to(`room:${room.code}`).emit("round_timeout", {
          currentQ: room.currentQ,
          correctAnswer: q.answer,
          message: "Time expired — no one buzzed!",
          scores: getScoresPayload(room),
        });

        // 2500ms post-round reveal delay before advancing
        room.transitionTimeout = setTimeout(() => {
          advanceToNextQuestion(io, room);
        }, 2500);
      }
    } else if (room.phase === "answering") {
      room.timeRemaining -= 1;

      io.to(`room:${room.code}`).emit("timer_tick", {
        phase: "answering",
        timeRemaining: room.timeRemaining,
        currentQ: room.currentQ,
        buzzWinner: room.buzzWinner,
      });

      if (room.timeRemaining <= 0) {
        // Buzz winner timed out without selecting answer
        clearRoomTimers(room);
        room.phase = "revealed";
        const winnerId = room.buzzWinner;
        const winnerName = room.players[winnerId]?.name || "Player";

        io.to(`room:${room.code}`).emit("round_result", {
          currentQ: room.currentQ,
          winnerId,
          winnerName,
          answer: -1,
          correct: false,
          correctAnswer: q.answer,
          timedOut: true,
          scores: getScoresPayload(room),
        });

        // 2500ms post-round reveal delay
        room.transitionTimeout = setTimeout(() => {
          advanceToNextQuestion(io, room);
        }, 2500);
      }
    }
  }, 1000);
}

/**
 * Authoritatively advance to next question or finish game
 * @param {import("socket.io").Server} io
 * @param {Room} room
 */
function advanceToNextQuestion(io, room) {
  const nextQ = room.currentQ + 1;
  if (nextQ >= room.questions.length) {
    finishGame(io, room);
  } else {
    startQuestionRound(io, room, nextQ);
  }
}

/**
 * Finish match and declare winner
 * @param {import("socket.io").Server} io
 * @param {Room} room
 */
function finishGame(io, room) {
  clearRoomTimers(room);
  room.status = "finished";
  room.phase = "revealed";

  const scores = getScoresPayload(room);
  let highestScore = -1;
  let winnerId = null;
  let isTie = false;

  const playerIds = Object.keys(room.players);
  if (playerIds.length === 2) {
    const s0 = room.players[playerIds[0]]?.score || 0;
    const s1 = room.players[playerIds[1]]?.score || 0;
    if (s0 === s1) {
      isTie = true;
    } else if (s0 > s1) {
      winnerId = playerIds[0];
      highestScore = s0;
    } else {
      winnerId = playerIds[1];
      highestScore = s1;
    }
  } else if (playerIds.length === 1) {
    winnerId = playerIds[0];
    highestScore = room.players[playerIds[0]]?.score || 0;
  }

  io.to(`room:${room.code}`).emit("game_finished", {
    scores,
    winnerId: isTie ? null : winnerId,
    isTie,
    players: getPlayersPayload(room),
  });
}

/**
 * Configure Socket.IO Server event handlers
 * @param {import("socket.io").Server} io
 */
export function setupSocketServer(io) {
  io.on("connection", (socket) => {
    let currentRoomCode = null;
    let currentPlayerToken = null;

    // ── Create Room ─────────────────────────────────────────
    socket.on("create_room", (data, callback) => {
      try {
        const {
          roomCode,
          hostName = "Host",
          playerToken,
          sport = "All Sports",
          difficulty = "Mixed",
          tournament = "All Tournaments",
          count = 10,
          questions = [],
        } = data || {};

        if (!roomCode || !playerToken) {
          if (callback) callback({ error: "Missing room code or player token" });
          return;
        }

        const code = roomCode.toUpperCase();

        // Clear previous room timers if existing
        if (rooms[code]) {
          clearRoomTimers(rooms[code]);
        }

        rooms[code] = {
          code,
          hostId: playerToken,
          sport,
          difficulty,
          tournament,
          questionCount: count,
          questions: Array.isArray(questions) ? questions : [],
          status: "lobby",
          players: {
            [playerToken]: {
              id: playerToken,
              socketId: socket.id,
              name: hostName,
              score: 0,
              ready: true,
              connected: true,
            },
          },
          currentQ: 0,
          phase: "buzzer",
          buzzWinner: null,
          timeRemaining: 15,
          timerInterval: null,
          transitionTimeout: null,
        };

        currentRoomCode = code;
        currentPlayerToken = playerToken;
        socket.join(`room:${code}`);

        const payload = {
          success: true,
          roomCode: code,
          hostId: playerToken,
          isHost: true,
          players: getPlayersPayload(rooms[code]),
          settings: {
            sport,
            difficulty,
            tournament,
            count,
            hostName,
          },
        };

        if (callback) callback(payload);
        socket.emit("room_created", payload);
      } catch (err) {
        console.error("[Socket] create_room error:", err);
        if (callback) callback({ error: "Failed to create room on server" });
      }
    });

    // ── Join Room ───────────────────────────────────────────
    socket.on("join_room", (data, callback) => {
      try {
        const { roomCode, playerName = "Player 2", playerToken } = data || {};

        if (!roomCode || !playerToken) {
          if (callback) callback({ error: "Missing room code or player token" });
          return;
        }

        const code = roomCode.toUpperCase();
        const room = rooms[code];

        if (!room) {
          if (callback) callback({ error: "Room not found. Please verify the 6-digit code." });
          return;
        }

        currentRoomCode = code;
        currentPlayerToken = playerToken;
        socket.join(`room:${code}`);

        // Deduplication & Reconnection
        if (room.players[playerToken]) {
          room.players[playerToken].connected = true;
          room.players[playerToken].socketId = socket.id;
          if (playerName) room.players[playerToken].name = playerName;

          const joinPayload = {
            success: true,
            roomCode: code,
            isHost: room.hostId === playerToken,
            hostId: room.hostId,
            status: room.status,
            phase: room.phase,
            currentQ: room.currentQ,
            totalQ: room.questions.length,
            timeRemaining: room.timeRemaining,
            buzzWinner: room.buzzWinner,
            players: getPlayersPayload(room),
            scores: getScoresPayload(room),
            settings: {
              sport: room.sport,
              difficulty: room.difficulty,
              tournament: room.tournament,
              count: room.questionCount,
              hostName: room.players[room.hostId]?.name || "Host",
            },
            currentQuestion:
              room.status === "playing" && room.questions[room.currentQ]
                ? {
                    id: room.questions[room.currentQ].id,
                    sport: room.questions[room.currentQ].sport || room.sport,
                    difficulty: room.questions[room.currentQ].difficulty || room.difficulty,
                    question: room.questions[room.currentQ].question,
                    options: room.questions[room.currentQ].options,
                    category: room.questions[room.currentQ].category || room.tournament,
                    ...(room.phase === "revealed" ? { answer: room.questions[room.currentQ].answer } : {}),
                  }
                : null,
          };

          if (callback) callback(joinPayload);
          socket.emit("room_joined", joinPayload);
          io.to(`room:${code}`).emit("room_state", {
            players: getPlayersPayload(room),
            scores: getScoresPayload(room),
          });
          return;
        }

        // Capacity check: strictly 1v1 (maximum 2 players)
        const currentCount = Object.keys(room.players).length;
        if (currentCount >= 2) {
          if (callback) callback({ error: "Room is full (maximum 2 players for 1v1 arena)." });
          return;
        }

        if (room.status === "finished") {
          if (callback) callback({ error: "This match has already completed." });
          return;
        }

        // Add guest player
        room.players[playerToken] = {
          id: playerToken,
          socketId: socket.id,
          name: playerName,
          score: 0,
          ready: true,
          connected: true,
        };

        const joinPayload = {
          success: true,
          roomCode: code,
          isHost: false,
          hostId: room.hostId,
          status: room.status,
          players: getPlayersPayload(room),
          settings: {
            sport: room.sport,
            difficulty: room.difficulty,
            tournament: room.tournament,
            count: room.questionCount,
            hostName: room.players[room.hostId]?.name || "Host",
          },
        };

        if (callback) callback(joinPayload);
        socket.emit("room_joined", joinPayload);

        // Notify both players of updated lobby state
        io.to(`room:${code}`).emit("room_state", {
          players: getPlayersPayload(room),
          scores: getScoresPayload(room),
          message: `${playerName} joined the room`,
        });
      } catch (err) {
        console.error("[Socket] join_room error:", err);
        if (callback) callback({ error: "Failed to join room" });
      }
    });

    // ── Start Game ──────────────────────────────────────────
    socket.on("start_game", (data, callback) => {
      try {
        const { roomCode, playerToken } = data || {};
        const code = (roomCode || currentRoomCode || "").toUpperCase();
        const room = rooms[code];

        if (!room) {
          if (callback) callback({ error: "Room not found" });
          return;
        }

        if (room.hostId !== (playerToken || currentPlayerToken)) {
          if (callback) callback({ error: "Only the host can start the match" });
          return;
        }

        if (Object.keys(room.players).length < 2) {
          if (callback) callback({ error: "Waiting for opponent to join" });
          return;
        }

        // Reset scores
        for (const p of Object.values(room.players)) {
          p.score = 0;
        }

        room.status = "playing";
        if (callback) callback({ success: true });

        io.to(`room:${code}`).emit("game_started", {
          roomCode: code,
          totalQuestions: room.questions.length,
          players: getPlayersPayload(room),
        });

        // Start Question 0
        startQuestionRound(io, room, 0);
      } catch (err) {
        console.error("[Socket] start_game error:", err);
        if (callback) callback({ error: "Error starting match" });
      }
    });

    // ── Buzzer (Atomic Lock) ────────────────────────────────
    socket.on("buzz", (data) => {
      try {
        const { roomCode, playerToken } = data || {};
        const code = (roomCode || currentRoomCode || "").toUpperCase();
        const room = rooms[code];
        const token = playerToken || currentPlayerToken;

        if (!room || room.status !== "playing") return;

        // Strictly verify buzzer phase & single buzz winner atomic lock
        if (room.phase !== "buzzer" || room.buzzWinner !== null) {
          return;
        }

        // First packet to arrive wins!
        room.buzzWinner = token;
        room.phase = "answering";
        room.timeRemaining = 8; // 8 seconds to select answer

        const winnerName = room.players[token]?.name || "Player";

        io.to(`room:${code}`).emit("buzz_winner", {
          winnerId: token,
          winnerName,
          answerTime: 8,
          currentQ: room.currentQ,
        });
      } catch (err) {
        console.error("[Socket] buzz error:", err);
      }
    });

    // ── Submit Answer ───────────────────────────────────────
    socket.on("submit_answer", (data) => {
      try {
        const { roomCode, playerToken, answer } = data || {};
        const code = (roomCode || currentRoomCode || "").toUpperCase();
        const room = rooms[code];
        const token = playerToken || currentPlayerToken;

        if (!room || room.status !== "playing") return;

        // Strictly verify answering phase & that submitter is the buzz winner
        if (room.phase !== "answering" || room.buzzWinner !== token) {
          return;
        }

        clearRoomTimers(room);
        room.phase = "revealed";

        const q = room.questions[room.currentQ];
        if (!q) return;

        const isCorrect = typeof answer === "number" && answer === q.answer;
        if (isCorrect && room.players[token]) {
          room.players[token].score += 100;
        }

        const winnerName = room.players[token]?.name || "Player";

        io.to(`room:${code}`).emit("round_result", {
          currentQ: room.currentQ,
          winnerId: token,
          winnerName,
          answer,
          correct: isCorrect,
          correctAnswer: q.answer,
          scores: getScoresPayload(room),
        });

        // Authoritative 2500ms reveal before moving to next question
        room.transitionTimeout = setTimeout(() => {
          advanceToNextQuestion(io, room);
        }, 2500);
      } catch (err) {
        console.error("[Socket] submit_answer error:", err);
      }
    });

    // ── Leave Room ──────────────────────────────────────────
    socket.on("leave_room", (data) => {
      try {
        const { roomCode, playerToken } = data || {};
        const code = (roomCode || currentRoomCode || "").toUpperCase();
        const token = playerToken || currentPlayerToken;
        const room = rooms[code];

        if (!room) return;

        socket.leave(`room:${code}`);

        if (room.hostId === token) {
          // Host left: close room completely
          clearRoomTimers(room);
          io.to(`room:${code}`).emit("room_closed", {
            message: "The host closed the room.",
          });
          delete rooms[code];
        } else {
          // Guest left
          delete room.players[token];
          if (room.status === "lobby") {
            io.to(`room:${code}`).emit("room_state", {
              players: getPlayersPayload(room),
              scores: getScoresPayload(room),
              message: "Guest left the room",
            });
          } else {
            io.to(`room:${code}`).emit("player_left", {
              playerToken: token,
              message: "Opponent left the match.",
            });
          }
        }
      } catch (err) {
        console.error("[Socket] leave_room error:", err);
      }
    });

    // ── WebRTC Voice Chat Signaling Relay ─────────────────────
    // These events relay SDP offers/answers and ICE candidates
    // between the two players for P2P voice chat establishment.
    // The server does NOT process or decode any media — it's
    // purely a signaling relay. All audio flows directly P2P.

    socket.on("webrtc_offer", (data) => {
      try {
        const { roomCode, playerToken, sdp } = data || {};
        const code = (roomCode || currentRoomCode || "").toUpperCase();
        if (!code || !sdp) return;

        // Forward offer to the other player in the room
        socket.to(`room:${code}`).emit("webrtc_offer", {
          sdp,
          from: playerToken || currentPlayerToken,
        });
      } catch (err) {
        console.error("[Socket] webrtc_offer relay error:", err);
      }
    });

    socket.on("webrtc_answer", (data) => {
      try {
        const { roomCode, playerToken, sdp } = data || {};
        const code = (roomCode || currentRoomCode || "").toUpperCase();
        if (!code || !sdp) return;

        socket.to(`room:${code}`).emit("webrtc_answer", {
          sdp,
          from: playerToken || currentPlayerToken,
        });
      } catch (err) {
        console.error("[Socket] webrtc_answer relay error:", err);
      }
    });

    socket.on("webrtc_ice_candidate", (data) => {
      try {
        const { roomCode, playerToken, candidate } = data || {};
        const code = (roomCode || currentRoomCode || "").toUpperCase();
        if (!code || !candidate) return;

        socket.to(`room:${code}`).emit("webrtc_ice_candidate", {
          candidate,
          from: playerToken || currentPlayerToken,
        });
      } catch (err) {
        console.error("[Socket] webrtc_ice_candidate relay error:", err);
      }
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on("disconnect", () => {
      if (currentRoomCode && rooms[currentRoomCode]) {
        const room = rooms[currentRoomCode];
        if (currentPlayerToken && room.players[currentPlayerToken]) {
          room.players[currentPlayerToken].connected = false;

          io.to(`room:${currentRoomCode}`).emit("player_disconnected", {
            playerToken: currentPlayerToken,
            name: room.players[currentPlayerToken].name,
          });
        }
      }
    });
  });
}
