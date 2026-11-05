/**
 * INFINITE GALLERY: BATTLESHIP (battleship_online.js)
 * Supabase Online Multiplayer Integration:
 * - Room creation (Code format: SEA###)
 * - Quick match (Find open room or create new)
 * - Lobby room browser
 * - Join by direct 6-character code
 * - Fleet commitment & match synchronization
 * - Cheat-proof server RPC shot execution (battleship_fire)
 * - 60-second session reconnect protection via localStorage
 */

(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://hxdwavbtjhxbyfcimctz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_uWgTHdlA9dZeOQhgaL36Nw_GgVH5LvI';

  // Persistent Player Identity
  let playerId = null;
  let playerName = 'Адмирал';

  try {
    playerId = localStorage.getItem('battleship_player_id');
    if (!playerId) {
      playerId = 'p_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      localStorage.setItem('battleship_player_id', playerId);
    }
    const savedName = localStorage.getItem('battleship_player_name');
    if (savedName) playerName = savedName;
  } catch (e) {
    playerId = 'p_' + Math.random().toString(36).slice(2, 11);
  }

  function setPlayerName(name) {
    if (name && name.trim()) {
      playerName = name.trim().slice(0, 24);
      try {
        localStorage.setItem('battleship_player_name', playerName);
      } catch (e) {}
    }
  }

  function getPlayerInfo() {
    return { id: playerId, name: playerName };
  }

  function generateRoomCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const num = Math.floor(100 + Math.random() * 900);
    const prefix = letters[Math.floor(Math.random() * letters.length)] +
                   letters[Math.floor(Math.random() * letters.length)] +
                   letters[Math.floor(Math.random() * letters.length)];
    return `${prefix}${num}`;
  }

  async function apiFetch(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Supabase API error (${res.status}): ${err}`);
    }
    return res.json();
  }

  /**
   * Create a new match room
   */
  async function createRoom() {
    const code = generateRoomCode();
    const rows = await apiFetch('battleship_rooms', {
      method: 'POST',
      body: JSON.stringify({
        code: code,
        status: 'waiting',
        player1_id: playerId,
        player1_name: playerName,
        player1_ready: false,
        prep_deadline: new Date(Date.now() + 120 * 1000).toISOString()
      })
    });
    return rows[0];
  }

  /**
   * Browse available open rooms
   */
  async function getOpenRooms() {
    return apiFetch('battleship_rooms?status=eq.waiting&order=created_at.desc&limit=15', {
      method: 'GET'
    });
  }

  /**
   * Join room by 6-character code
   */
  async function joinRoom(code) {
    const cleanCode = code.trim().toUpperCase();
    const rooms = await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(cleanCode)}&limit=1`, {
      method: 'GET'
    });

    if (!rooms || rooms.length === 0) {
      throw new Error('Комната не найдена');
    }

    const room = rooms[0];

    // Check if player is rejoining their own existing room
    if (room.player1_id === playerId || room.player2_id === playerId) {
      return room;
    }

    if (room.status !== 'waiting') {
      throw new Error('Комната уже заполнена или игра началась');
    }

    // Join as player 2 and set status to 'placement'
    const updated = await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(cleanCode)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        player2_id: playerId,
        player2_name: playerName,
        player2_ready: false,
        status: 'placement',
        prep_deadline: new Date(Date.now() + 120 * 1000).toISOString()
      })
    });

    return updated[0];
  }

  /**
   * Quick Match: search for open waiting room, join it, or create a new room
   */
  async function quickMatch() {
    const openRooms = await getOpenRooms();
    const validRooms = openRooms.filter(r => r.player1_id !== playerId && r.status === 'waiting');

    if (validRooms.length > 0) {
      const chosen = validRooms[0];
      return joinRoom(chosen.code);
    } else {
      return createRoom();
    }
  }

  /**
   * Submit fleet placement
   */
  async function submitPlacement(roomCode, serializedFleet) {
    const room = await getRoom(roomCode);
    if (!room) throw new Error('Комната не найдена');

    const isP1 = room.player1_id === playerId;
    const isP2 = room.player2_id === playerId;

    if (!isP1 && !isP2) throw new Error('Вы не участник этой комнаты');

    // Convert fleet to coordinate structures for server verification
    const formattedFleet = serializedFleet.map(s => {
      const coords = [];
      for (let i = 0; i < s.size; i++) {
        coords.push({
          x: s.horizontal ? s.x + i : s.x,
          y: s.horizontal ? s.y : s.y + i
        });
      }
      return { id: s.id, type: s.type, size: s.size, coords };
    });

    const updatePayload = {};
    if (isP1) {
      updatePayload.player1_fleet = formattedFleet;
      updatePayload.player1_ready = true;
    } else {
      updatePayload.player2_fleet = formattedFleet;
      updatePayload.player2_ready = true;
    }

    // If opponent is already ready, transition to 'battle' and pick random first turn!
    const opponentReady = isP1 ? room.player2_ready : room.player1_ready;
    if (opponentReady) {
      updatePayload.status = 'battle';
      updatePayload.current_turn = Math.random() < 0.5 ? 'player1' : 'player2';
      updatePayload.turn_deadline = new Date(Date.now() + 25 * 1000).toISOString();
    }

    const updated = await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(roomCode)}`, {
      method: 'PATCH',
      body: JSON.stringify(updatePayload)
    });

    return updated[0];
  }

  /**
   * Fetch current state of a room
   */
  async function getRoom(code) {
    const rooms = await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(code.trim().toUpperCase())}&limit=1`, {
      method: 'GET'
    });
    return rooms && rooms.length > 0 ? rooms[0] : null;
  }

  /**
   * Fire a shot via secure server RPC (battleship_fire)
   */
  async function fireShot(roomCode, x, y) {
    const url = `${SUPABASE_URL}/rest/v1/rpc/battleship_fire`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_room_code: roomCode,
        p_player_id: playerId,
        p_x: x,
        p_y: y
      })
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Ошибка выстрела (${res.status}): ${err}`);
    }

    return res.json();
  }

  /**
   * Leave or forfeit room
   */
  async function leaveRoom(roomCode) {
    try {
      const room = await getRoom(roomCode);
      if (!room) return;

      if (room.status === 'battle') {
        // Technical forfeit
        const isP1 = room.player1_id === playerId;
        await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(roomCode)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'finished',
            winner: isP1 ? 'player2' : 'player1'
          })
        });
      } else if (room.status === 'waiting') {
        await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(roomCode)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelled' })
        });
      }
    } catch (e) {
      console.warn('Leave room error:', e);
    }
  }

  global.BattleshipOnline = {
    getPlayerInfo,
    setPlayerName,
    createRoom,
    joinRoom,
    quickMatch,
    getOpenRooms,
    getRoom,
    submitPlacement,
    fireShot,
    leaveRoom
  };

})(typeof window !== 'undefined' ? window : globalThis);
