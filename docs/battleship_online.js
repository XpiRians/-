/**
 * INFINITE GALLERY: BATTLESHIP (battleship_online.js)
 * Supabase Online Multiplayer & Native Email Auth Integration:
 * - Native Email + Password + 6-digit OTP verification
 * - Player Profiles (unique username, avatar, rank tier)
 * - Casual (unranked) vs Ranked (competitive ELO) matchmaking
 * - Cheat-proof server RPC shot execution (battleship_fire) with auto-ELO
 * - Server ELO calculation (K=32, atomic transactions, idempotency)
 * - Match history & global Leaderboard
 * - 100% Backward compatible with existing rooms & offline AI play
 */

(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://hxdwavbtjhxbyfcimctz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_uWgTHdlA9dZeOQhgaL36Nw_GgVH5LvI';

  // Supabase JS SDK client instance
  let supabaseClient = null;
  function getSupabaseClient() {
    if (!supabaseClient && global.supabase && typeof global.supabase.createClient === 'function') {
      supabaseClient = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return supabaseClient;
  }

  // Auth State
  let currentAuthUser = null;
  let currentAuthSession = null;
  let currentProfile = null;
  let currentRatings = null;
  const authStateListeners = [];

  // Persistent Guest Identity (Fallback for Casual Unauthenticated Play)
  let guestId = null;
  let guestName = 'Адмирал';

  try {
    guestId = localStorage.getItem('battleship_player_id');
    if (!guestId) {
      guestId = 'p_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      localStorage.setItem('battleship_player_id', guestId);
    }
    const savedName = localStorage.getItem('battleship_player_name');
    if (savedName) guestName = savedName;
  } catch (e) {
    guestId = 'p_' + Math.random().toString(36).slice(2, 11);
  }

  // Active Effective Identity
  let playerId = guestId;
  let playerName = guestName;

  function updateEffectiveIdentity() {
    if (currentAuthUser) {
      playerId = currentAuthUser.id;
      playerName = currentProfile?.username || 
                   currentAuthUser.user_metadata?.username || 
                   currentAuthUser.user_metadata?.full_name || 
                   'Капитан';
    } else {
      playerId = guestId;
      playerName = guestName;
    }
  }

  function setPlayerName(name) {
    if (name && name.trim()) {
      const clean = name.trim().slice(0, 24);
      if (!currentAuthUser) {
        guestName = clean;
        playerName = clean;
        try {
          localStorage.setItem('battleship_player_name', clean);
        } catch (e) {}
      }
    }
  }

  function getRankTier(rating) {
    const r = typeof rating === 'number' ? rating : 1000;
    if (r >= 1600) return { key: 'Master', name: 'Мастер', icon: '👑', color: '#e11d48', badgeClass: 'rank-master', min: 1600, max: 9999 };
    if (r >= 1400) return { key: 'Diamond', name: 'Алмаз', icon: '💎', color: '#06b6d4', badgeClass: 'rank-diamond', min: 1400, max: 1599 };
    if (r >= 1200) return { key: 'Platinum', name: 'Платина', icon: '⚔️', color: '#a855f7', badgeClass: 'rank-platinum', min: 1200, max: 1399 };
    if (r >= 1000) return { key: 'Gold', name: 'Золото', icon: '🥇', color: '#eab308', badgeClass: 'rank-gold', min: 1000, max: 1199 };
    if (r >= 800)  return { key: 'Silver', name: 'Серебро', icon: '🥈', color: '#94a3b8', badgeClass: 'rank-silver', min: 800, max: 999 };
    return { key: 'Bronze', name: 'Бронза', icon: '🥉', color: '#cd7f32', badgeClass: 'rank-bronze', min: 0, max: 799 };
  }

  function getPlayerInfo() {
    return {
      id: playerId,
      name: playerName,
      isAuth: Boolean(currentAuthUser),
      user: currentAuthUser,
      profile: currentProfile,
      ratings: currentRatings,
      rating: currentRatings ? currentRatings.rating : 1000,
      rankTier: getRankTier(currentRatings ? currentRatings.rating : 1000),
      avatarUrl: currentProfile?.avatar_url || currentAuthUser?.user_metadata?.avatar_url || null
    };
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
    const token = currentAuthSession ? currentAuthSession.access_token : SUPABASE_ANON_KEY;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
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

  // =========================================================================
  // SUPABASE AUTH (EMAIL, PASSWORD, 6-DIGIT OTP)
  // =========================================================================
  async function initAuth() {
    const sb = getSupabaseClient();
    if (!sb) {
      console.warn('Supabase SDK not loaded yet. Running in guest mode.');
      return null;
    }

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session && session.user) {
        currentAuthSession = session;
        currentAuthUser = session.user;
        await loadUserProfileAndRatings(session.user.id);
      }

      // Listen for auth changes (OAuth redirect, login, logout)
      sb.auth.onAuthStateChange(async (event, session) => {
        currentAuthSession = session;
        currentAuthUser = session ? session.user : null;
        if (session && session.user) {
          await loadUserProfileAndRatings(session.user.id);
        } else {
          currentProfile = null;
          currentRatings = null;
        }
        updateEffectiveIdentity();
        notifyAuthStateChange(event);
      });

      updateEffectiveIdentity();
      return getPlayerInfo();
    } catch (err) {
      console.warn('Auth initialization error:', err);
      return null;
    }
  }

  function onAuthStateChange(listener) {
    if (typeof listener === 'function') {
      authStateListeners.push(listener);
    }
  }

  function notifyAuthStateChange(event) {
    const info = getPlayerInfo();
    authStateListeners.forEach(fn => {
      try { fn(event, info); } catch (e) { console.error('Auth listener error:', e); }
    });
  }

  /**
   * Check if username is available (format + uniqueness check)
   */
  async function checkUsernameAvailable(username) {
    const clean = (username || '').trim();
    if (clean.length < 3 || clean.length > 16) {
      return { available: false, error: 'Позывной должен содержать от 3 до 16 символов' };
    }
    if (!/^[a-zA-Z0-9_а-яА-ЯёЁ]+$/.test(clean)) {
      return { available: false, error: 'Разрешены только буквы (латиница/кириллица), цифры и _' };
    }

    // 1. Preferred server RPC (checks profiles + frees unconfirmed abandoned accounts >24h)
    try {
      const rpcRes = await apiFetch('rpc/battleship_check_username_available', {
        method: 'POST',
        body: JSON.stringify({ p_username: clean })
      });
      if (typeof rpcRes === 'boolean') {
        return rpcRes ? { available: true } : { available: false, error: 'Этот позывной уже занят другим капитаном' };
      }
    } catch (_) {}

    // 2. Client query fallback
    try {
      const existing = await apiFetch(`profiles?username=ilike.${encodeURIComponent(clean)}&limit=1`, { method: 'GET' });
      if (existing && existing.length > 0) {
        return { available: false, error: 'Этот позывной уже занят другим капитаном' };
      }
      return { available: true };
    } catch (e) {
      return { available: true };
    }
  }

  /**
   * Register a new captain with Email and Password
   * (Callsign and avatar are selected after email confirmation)
   */
  async function signUpWithEmail(arg1, arg2, arg3) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Сетевой шлюз Supabase не инициализирован');

    let cleanEmail, password;
    if (arg3 !== undefined) {
      cleanEmail = (arg2 || '').trim().toLowerCase();
      password = arg3;
    } else {
      cleanEmail = (arg1 || '').trim().toLowerCase();
      password = arg2;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Укажите корректный адрес электронной почты');
    }

    if (!password || password.length < 6) {
      throw new Error('Пароль должен содержать не менее 6 символов');
    }

    const { data, error } = await sb.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.href : undefined
      }
    });

    if (error) {
      if (error.message && (error.message.includes('already registered') || error.message.includes('User already registered'))) {
        throw new Error('Пользователь с такой почтой уже зарегистрирован. Пожалуйста, выполните вход.');
      }
      throw error;
    }

    if (data && data.session && data.session.user) {
      currentAuthSession = data.session;
      currentAuthUser = data.session.user;
      await loadUserProfileAndRatings(data.session.user.id);
      updateEffectiveIdentity();
      notifyAuthStateChange('SIGNED_IN');
    }

    return data;
  }

  /**
   * Verify 6-digit OTP code from email
   */
  async function verifyOtpCode(email, token, type = 'signup') {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Сетевой шлюз Supabase не инициализирован');

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanToken = (token || '').replace(/\D/g, '').trim();

    if (!cleanToken || cleanToken.length < 6) {
      throw new Error('Введите корректный шестизначный код подтверждения');
    }

    let { data, error } = await sb.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: type
    });

    // Если 'signup' вернул ошибку, пробуем 'email' как запасной вариант
    if (error && type === 'signup') {
      const retry = await sb.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email'
      });
      if (!retry.error && retry.data) {
        data = retry.data;
        error = null;
      }
    }

    if (error) {
      if (error.message && (error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('Token has expired'))) {
        throw new Error('Неверный или истёкший код. Проверьте письмо или запросите код повторно.');
      }
      throw error;
    }

    if (data && data.session && data.session.user) {
      currentAuthSession = data.session;
      currentAuthUser = data.session.user;
      await loadUserProfileAndRatings(data.session.user.id);
      updateEffectiveIdentity();
      notifyAuthStateChange('SIGNED_IN');
    }

    return data;
  }

  /**
   * Resend 6-digit OTP code
   */
  async function resendOtpCode(email, type = 'signup') {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Сетевой шлюз Supabase не инициализирован');

    const cleanEmail = (email || '').trim().toLowerCase();
    const { data, error } = await sb.auth.resend({
      type: type,
      email: cleanEmail
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign In with Email & Password
   */
  async function signInWithEmail(email, password) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Сетевой шлюз Supabase не инициализирован');

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Пожалуйста, укажите email и пароль');
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) {
      if (error.message && error.message.includes('Email not confirmed')) {
        const unconfirmedErr = new Error('Электронная почта ещё не подтверждена. Введите шестизначный код.');
        unconfirmedErr.code = 'EMAIL_NOT_CONFIRMED';
        unconfirmedErr.email = cleanEmail;
        throw unconfirmedErr;
      }
      if (error.message && (error.message.includes('Invalid login credentials') || error.message.includes('invalid_grant'))) {
        throw new Error('Неверный адрес электронной почты или пароль');
      }
      throw error;
    }

    if (data && data.session && data.session.user) {
      currentAuthSession = data.session;
      currentAuthUser = data.session.user;
      await loadUserProfileAndRatings(data.session.user.id);
      updateEffectiveIdentity();
      notifyAuthStateChange('SIGNED_IN');
    }

    return data;
  }

  /**
   * Request password reset code
   */
  async function resetPasswordForEmail(email) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Сетевой шлюз Supabase не инициализирован');

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Укажите адрес электронной почты');

    const { data, error } = await sb.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? window.location.href : undefined
    });
    if (error) throw error;
    return data;
  }

  /**
   * Update user password after recovery
   */
  async function updateUserPassword(newPassword) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Сетевой шлюз Supabase не инициализирован');

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Новый пароль должен содержать минимум 6 символов');
    }

    const { data, error } = await sb.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    const sb = getSupabaseClient();
    if (sb) {
      await sb.auth.signOut();
    }
    currentAuthSession = null;
    currentAuthUser = null;
    currentProfile = null;
    currentRatings = null;
    updateEffectiveIdentity();
    notifyAuthStateChange('SIGNED_OUT');
  }

  async function loadUserProfileAndRatings(userId) {
    try {
      const profiles = await apiFetch(`profiles?id=eq.${userId}&limit=1`, { method: 'GET' });
      if (profiles && profiles.length > 0) {
        currentProfile = profiles[0];
      } else {
        // Fallback to registration metadata so the captain always has their chosen callsign
        const metaName = currentAuthUser?.user_metadata?.username || currentAuthUser?.user_metadata?.full_name;
        if (metaName) {
          currentProfile = {
            id: userId,
            username: metaName,
            avatar_url: currentAuthUser?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(metaName)}`
          };
          // Sync to database in background
          setProfileUsername(metaName).catch(() => {});
        } else {
          currentProfile = null;
        }
      }

      const ratings = await apiFetch(`player_ratings?user_id=eq.${userId}&limit=1`, { method: 'GET' });
      if (ratings && ratings.length > 0) {
        currentRatings = ratings[0];
      } else {
        currentRatings = { rating: 1000, wins: 0, losses: 0, draws: 0, games_played: 0 };
      }
      updateEffectiveIdentity();
    } catch (e) {
      console.warn('Failed to load profile data:', e);
    }
  }

  /**
   * Set or update player nickname (calls secure RPC battleship_set_username)
   */
  async function setProfileUsername(username, avatarUrl = null) {
    if (!currentAuthUser) throw new Error('Требуется авторизация');
    const res = await apiFetch('rpc/battleship_set_username', {
      method: 'POST',
      body: JSON.stringify({
        p_username: username.trim(),
        p_avatar_url: avatarUrl || currentAuthUser.user_metadata?.avatar_url || null
      })
    });

    if (!res || !res.success) {
      throw new Error(res?.error || 'Не удалось сохранить никнейм');
    }

    currentProfile = {
      id: currentAuthUser.id,
      username: res.username,
      avatar_url: res.avatar_url
    };
    updateEffectiveIdentity();
    notifyAuthStateChange('PROFILE_UPDATED');
    return currentProfile;
  }

  /**
   * Fetch full public profile with match history
   */
  async function getProfile(userId) {
    const res = await apiFetch('rpc/battleship_get_profile', {
      method: 'POST',
      body: JSON.stringify({ p_user_id: userId })
    });
    return res;
  }

  /**
   * Fetch global Leaderboard with pagination
   */
  async function getLeaderboard(limit = 20, offset = 0) {
    const res = await apiFetch('rpc/battleship_get_leaderboard', {
      method: 'POST',
      body: JSON.stringify({ p_limit: limit, p_offset: offset })
    });
    return res;
  }

  /**
   * Retrieve processed ELO result for a finished ranked match (read-only)
   */
  async function processMatchElo(roomCode) {
    const res = await apiFetch('rpc/battleship_get_match_elo', {
      method: 'POST',
      body: JSON.stringify({ p_room_code: roomCode.trim().toUpperCase() })
    });
    return res;
  }

  // =========================================================================
  // MATCH ROOM MANAGEMENT (CASUAL & RANKED)
  // =========================================================================

  /**
   * Create room: supports both Casual (unranked) and Ranked modes
   * Server-authoritative RPC creation (battleship_create_room)
   */
  async function createRoom(isRanked = false, maxRetries = 3) {
    if (!currentAuthUser) {
      throw new Error('Для создания онлайн-комнаты необходимо войти в аккаунт капитана');
    }

    // 1. Preferred server-authoritative RPC
    try {
      const res = await apiFetch('rpc/battleship_create_room', {
        method: 'POST',
        body: JSON.stringify({ p_is_ranked: Boolean(isRanked) })
      });
      if (res && res.success && res.room) {
        return res.room;
      } else if (res && !res.success) {
        throw new Error(res.error || 'Ошибка создания комнаты');
      }
    } catch (rpcErr) {
      console.warn('RPC battleship_create_room fallback:', rpcErr);
    }

    // 2. Direct insert fallback (if migration v3.2 not yet applied)
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const code = generateRoomCode();
      const payload = {
        code: code,
        status: 'waiting',
        player1_id: playerId,
        player1_name: playerName,
        player1_ready: false,
        is_ranked: isRanked,
        player1_user_id: currentAuthUser ? currentAuthUser.id : null,
        prep_deadline: new Date(Date.now() + 120 * 1000).toISOString()
      };

      try {
        const rows = await apiFetch('battleship_rooms', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        return rows[0];
      } catch (err) {
        if (attempt === maxRetries - 1) throw err;
      }
    }
  }

  /**
   * Browse available open rooms (can filter by Casual vs Ranked)
   */
  async function getOpenRooms(isRanked = null) {
    let url = 'battleship_rooms?status=eq.waiting&order=created_at.desc&limit=20';
    if (isRanked !== null) {
      url += `&is_ranked=eq.${Boolean(isRanked)}`;
    }
    return apiFetch(url, { method: 'GET' });
  }

  /**
   * Join room by code with authentication checks (server-authoritative RPC)
   */
  async function joinRoom(code) {
    if (!currentAuthUser) {
      throw new Error('Для участия в онлайн-боях необходимо войти в аккаунт капитана');
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Preferred server-authoritative RPC
    try {
      const res = await apiFetch('rpc/battleship_join_room', {
        method: 'POST',
        body: JSON.stringify({ p_room_code: cleanCode })
      });
      if (res && res.success && res.room) {
        return res.room;
      } else if (res && !res.success) {
        throw new Error(res.error || 'Ошибка входа в комнату');
      }
    } catch (rpcErr) {
      console.warn('RPC battleship_join_room fallback:', rpcErr);
    }

    // 2. Client fallback (if migration v3.2 not yet applied)
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

    if (room.player1_user_id && room.player1_user_id === currentAuthUser.id) {
      throw new Error('Нельзя вступить в онлайн-матч с самим собой');
    }

    const updatePayload = {
      player2_id: playerId,
      player2_name: playerName,
      player2_ready: false,
      player2_user_id: currentAuthUser ? currentAuthUser.id : null,
      status: 'placement',
      prep_deadline: new Date(Date.now() + 120 * 1000).toISOString()
    };

    const updated = await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(cleanCode)}&status=eq.waiting`, {
      method: 'PATCH',
      body: JSON.stringify(updatePayload)
    });

    if (!updated || updated.length === 0) {
      throw new Error('Комната только что была занята другим игроком');
    }

    return updated[0];
  }

  /**
   * Quick Match: matchmake for Casual or Ranked game
   */
  async function quickMatch(isRanked = false) {
    if (!currentAuthUser) {
      throw new Error('Для участия в онлайн-игре необходимо войти в аккаунт капитана');
    }

    const openRooms = await getOpenRooms(isRanked);
    const validRooms = openRooms.filter(r => {
      const notMyPId = r.player1_id !== playerId;
      const notMyAuth = !currentAuthUser || r.player1_user_id !== currentAuthUser.id;
      return notMyPId && notMyAuth && r.status === 'waiting' && (Boolean(r.is_ranked) === Boolean(isRanked));
    });

    if (validRooms.length > 0) {
      const chosen = validRooms[0];
      return joinRoom(chosen.code);
    } else {
      return createRoom(isRanked);
    }
  }

  /**
   * Submit fleet placement (uses atomic RPC battleship_submit_placement with graceful fallback)
   */
  async function submitPlacement(roomCode, serializedFleet) {
    const cleanCode = roomCode.trim().toUpperCase();

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
      const res = await apiFetch('rpc/battleship_submit_placement', {
        method: 'POST',
        body: JSON.stringify({
          p_room_code: cleanCode,
          p_player_id: playerId,
          p_fleet: formattedFleet
        })
      });

      if (res && res.success) {
        const room = await getRoom(cleanCode);
        return room || res;
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

  async function getRoom(code) {
    const cleanCode = code.trim().toUpperCase();
    // 1. Secure server-authoritative RPC (masks opponent fleet, provides own fleet for F5 recovery)
    try {
      const res = await apiFetch('rpc/battleship_get_room', {
        method: 'POST',
        body: JSON.stringify({ p_room_code: cleanCode })
      });
      if (res && res.id) return res;
    } catch (_) {}

    // 2. Direct REST query fallback
    const rooms = await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(cleanCode)}&limit=1`, {
      method: 'GET'
    });
    return rooms && rooms.length > 0 ? rooms[0] : null;
  }

  /**
   * Fire shot via secure server RPC (battleship_fire)
   */
  async function fireShot(roomCode, x, y) {
    const cleanCode = roomCode.trim().toUpperCase();
    const token = currentAuthSession ? currentAuthSession.access_token : SUPABASE_ANON_KEY;
    const url = `${SUPABASE_URL}/rest/v1/rpc/battleship_fire`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_room_code: cleanCode,
        p_player_id: playerId,
        p_x: x,
        p_y: y
      })
    });

    if (!res.ok) {
      let errMsg = `Ошибка сервера (${res.status})`;
      try {
        const errObj = await res.json();
        if (errObj && errObj.message) errMsg = errObj.message;
        else if (errObj && errObj.error) errMsg = errObj.error;
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
   * Handle turn timeout via atomic RPC (battleship_handle_timeout)
   */
  async function handleTimeout(roomCode) {
    try {
      const cleanCode = roomCode.trim().toUpperCase();
      const token = currentAuthSession ? currentAuthSession.access_token : SUPABASE_ANON_KEY;
      const url = `${SUPABASE_URL}/rest/v1/rpc/battleship_handle_timeout`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          p_room_code: cleanCode,
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
   * Leave or forfeit room (server-authoritative RPC)
   */
  async function leaveRoom(roomCode) {
    const cleanCode = roomCode.trim().toUpperCase();
    try {
      // 1. Try server RPC
      const res = await apiFetch('rpc/battleship_leave_room', {
        method: 'POST',
        body: JSON.stringify({ p_room_code: cleanCode })
      });
      if (res && res.success) return res;
    } catch (rpcErr) {
      console.warn('RPC battleship_leave_room fallback:', rpcErr);
    }

    // 2. Client fallback
    try {
      const room = await getRoom(cleanCode);
      if (!room) return;

      if (room.status === 'battle') {
        await apiFetch('rpc/battleship_forfeit', {
          method: 'POST',
          body: JSON.stringify({ p_room_code: cleanCode })
        }).catch(e => console.warn('Forfeit RPC error:', e));
      } else if (room.status === 'waiting') {
        await apiFetch(`battleship_rooms?code=eq.${encodeURIComponent(cleanCode)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelled' })
        }).catch(e => console.warn('Cancel room PATCH error:', e));
      }
    } catch (e) {
      console.warn('Leave room error:', e);
    }
  }

  global.BattleshipOnline = {
    initAuth,
    checkUsernameAvailable,
    signUpWithEmail,
    verifyOtpCode,
    resendOtpCode,
    signInWithEmail,
    resetPasswordForEmail,
    updateUserPassword,
    signOut,
    onAuthStateChange,
    getPlayerInfo,
    setPlayerName,
    getRankTier,
    setProfileUsername,
    getProfile,
    getLeaderboard,
    processMatchElo,
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
