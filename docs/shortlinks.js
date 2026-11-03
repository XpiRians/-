/**
 * INFINITE GALLERY — СИСТЕМА КОРОТКИХ ССЫЛОК (SUPABASE INTEGRATION)
 * Модуль shortlinks.js:
 * - Подключение к Supabase PostgREST API без внешних тяжелых зависимостей
 * - Генерация криптографически стойких Base62 коротких кодов (7 символов)
 * - Атомарная дедупликация через PostgreSQL RPC (get_or_create_short_link)
 * - Разрешение коротких кодов ?s=КОД с автоматическим переключением разрешения (32/64)
 * - Полный офлайн-фолбек на прямые URL при сбое сети или недоступности Supabase
 */

(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://hxdwavbtjhxbyfcimctz.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_uWgTHdlA9dZeOQhgaL36Nw_GgVH5LvI';
  const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const REQUEST_TIMEOUT_MS = 6000;

  /**
   * Генерация случайного URL-безопасного Base62 кода заданной длины
   */
  function generateCode(len = 7) {
    let result = '';
    const randomBytes = new Uint8Array(len);
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      global.crypto.getRandomValues(randomBytes);
      for (let i = 0; i < len; i++) {
        result += BASE62_CHARS[randomBytes[i] % BASE62_CHARS.length];
      }
    } else {
      for (let i = 0; i < len; i++) {
        result += BASE62_CHARS[Math.floor(Math.random() * BASE62_CHARS.length)];
      }
    }
    return result;
  }

  /**
   * Обёртка над fetch с таймаутом AbortController
   */
  async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Создание или получение существующей короткой ссылки для изображения
   * @param {string} fullImageId - Полный ID изображения (Babel PRP или Base64)
   * @param {number} resolution - 32 или 64
   * @returns {Promise<{shortId: string, url: string, isExisting: boolean}>}
   */
  async function getOrCreateShortLink(fullImageId, resolution) {
    if (!fullImageId || typeof fullImageId !== 'string') {
      throw new Error('Invalid fullImageId parameter');
    }
    const resInt = parseInt(resolution, 10);
    const validRes = (resInt === 64) ? 64 : 32;

    const candidateCode = generateCode(7);

    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/get_or_create_short_link`;
    const response = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_id: candidateCode,
        p_full_image_id: fullImageId,
        p_resolution: validRes
      })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Supabase RPC error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Supabase RPC returned empty result');
    }

    const shortId = data[0].short_id;
    const isExisting = Boolean(data[0].is_existing);
    const shortUrl = `${window.location.origin}${window.location.pathname}?s=${encodeURIComponent(shortId)}`;

    return {
      shortId: shortId,
      url: shortUrl,
      isExisting: isExisting
    };
  }

  /**
   * Разрешение короткого кода ?s=КОД в полный ID и разрешение
   * @param {string} shortId - Короткий код
   * @returns {Promise<{fullImageId: string, resolution: number}|null>}
   */
  async function resolveShortLink(shortId) {
    if (!shortId || typeof shortId !== 'string') return null;
    const cleanId = shortId.trim();
    if (!/^[A-Za-z0-9_-]{6,12}$/.test(cleanId)) return null;

    const queryUrl = `${SUPABASE_URL}/rest/v1/gallery_links?id=eq.${encodeURIComponent(cleanId)}&select=id,full_image_id,resolution`;
    const response = await fetchWithTimeout(queryUrl, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase query error (${response.status})`);
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return {
      fullImageId: rows[0].full_image_id,
      resolution: rows[0].resolution === 64 ? 64 : 32
    };
  }

  /**
   * Резервный метод: построение классической прямой ссылки
   */
  function buildDirectFallbackUrl(fullImageId, resolution, exhibitNumber = null) {
    const params = new URLSearchParams();
    params.set('id', fullImageId);
    if (resolution === 64) params.set('res', '64');
    if (exhibitNumber) params.set('num', String(exhibitNumber));
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  global.ShortLinks = {
    getOrCreateShortLink,
    resolveShortLink,
    buildDirectFallbackUrl,
    generateCode
  };

})(typeof window !== 'undefined' ? window : globalThis);
