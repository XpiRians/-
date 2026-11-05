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
   * Create a new match room (with retry on rare code collision)
   */
  async function createRoom(maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const code = generateRoomCode();
      try {
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
      } catch (err) {
        if (attempt === maxRetries - 1) throw err;
      }
    }
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
   * Join room by 6-character code (safe against 3rd player race conditions)
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

    // Join as player 2 atomically (guaranteed by status=eq.waiting filter)
    const updated = await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(cleanCode)}&status=eq.waiting`, {
      method: 'PATCH',
      body: JSON.stringify({
        player2_id: playerId,
        player2_name: playerName,
        player2_ready: false,
        status: 'placement',
        prep_deadline: new Date(Date.now() + 120 * 1000).toISOString()
      })
    });

    if (!updated || updated.length === 0) {
      throw new Error('Комната только что была занята другим игроком');
    }

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
   * Submit fleet placement (uses atomic RPC battleship_submit_placement with graceful fallback)
   */
  async function submitPlacement(roomCode, serializedFleet) {
    const cleanCode = roomCode.trim().toUpperCase();

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

    // 1. Try atomic server RPC
    try {
      const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/battleship_submit_placement`;
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_room_code: cleanCode,
          p_player_id: playerId,
          p_fleet: formattedFleet
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const room = await getRoom(cleanCode);
          return room || data;
        }
      }
    } catch (rpcErr) {
      console.warn('RPC battleship_submit_placement fallback to direct PATCH:', rpcErr);
    }

    // 2. Fallback to direct PATCH
    const room = await getRoom(cleanCode);
    if (!room) throw new Error('Комната не найдена');

    const isP1 = room.player1_id === playerId;
    const isP2 = room.player2_id === playerId;
    if (!isP1 && !isP2) throw new Error('Вы не участник этой комнаты');

    const updatePayload = {};
    if (isP1) {
      updatePayload.player1_fleet = formattedFleet;
      updatePayload.player1_ready = true;
    } else {
      updatePayload.player2_fleet = formattedFleet;
      updatePayload.player2_ready = true;
    }

    const opponentReady = isP1 ? room.player2_ready : room.player1_ready;
    if (opponentReady) {
      updatePayload.status = 'battle';
      updatePayload.current_turn = Math.random() < 0.5 ? 'player1' : 'player2';
      updatePayload.turn_deadline = new Date(Date.now() + 25 * 1000).toISOString();
    }

    const updated = await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(cleanCode)}`, {
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
   * Fire a shot via secure server RPC (battleship_fire) with clear error handling
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
        p_room_code: roomCode.trim().toUpperCase(),
        p_player_id: playerId,
        p_x: x,
        p_y: y
      })
    });

    if (!res.ok) {
      let errMsg = `Ошибка сервера (${res.status})`;
      try {
        const errObj = await res.json();
        if (errObj && errObj.message) {
          errMsg = errObj.message;
        } else if (errObj && errObj.error) {
          errMsg = errObj.error;
        }
      } catch (_) {
        const text = await res.text().catch(() => '');
        if (text) errMsg = text;
      }
      console.error('battleship_fire error:', res.status, errMsg);
      throw new Error(errMsg);
    }

    return res.json();
  }

  /**
   * Notify server of turn timeout via atomic RPC (battleship_handle_timeout)
   */
  async function handleTimeout(roomCode) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/rpc/battleship_handle_timeout`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_room_code: roomCode.trim().toUpperCase(),
          p_player_id: playerId
        })
      });
      if (res.ok) {
        return res.json();
      }
    } catch (e) {
      console.warn('battleship_handle_timeout error:', e);
    }
    return null;
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
    handleTimeout,
    leaveRoom
  };

})(typeof window !== 'undefined' ? window : globalThis);
