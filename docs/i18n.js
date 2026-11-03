/**
 * MUSYA & KETI: INFINITE GALLERY - Internationalization (i18n) Module
 * Supports Russian (RU) and English (EN) with automatic browser detection
 * and persistent language selection.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'musya_keti_gallery_lang';

  const TRANSLATIONS = {
    ru: {
      site_title: "ГАЛЕРЕЯ МУСИ И КЕТИ — Бесконечный цифровой музей всех возможных изображений",
      site_badge: "БЕСКОНЕЧНЫЙ МУЗЕЙ",
      site_name: "ГАЛЕРЕЯ МУСИ И КЕТИ",
      hero_title: "ГАЛЕРЕЯ МУСИ И КЕТИ",
      hero_sub: "Бесконечный цифровой музей изображений • Хранительницы бесконечных миров",
      
      nav_gallery: "ГАЛЕРЕЯ",
      nav_archive: "ЗАЛ ЭКСПОНАТОВ",
      nav_about: "О МУЗЕЕ",
      nav_tests: "ТЕСТЫ",

      cat_musya_name: "Муся",
      cat_musya_role: "Хранительница Пространства",
      cat_musya_hint: "Нажмите, чтобы материализовать Мусю",
      cat_keti_name: "Кети",
      cat_keti_role: "Хранительница Симметрии",
      cat_keti_hint: "Нажмите, чтобы материализовать Кети",

      exhibit_badge_prefix: "ЭКСПОНАТ #",
      exhibit_id_prefix: "АДРЕС: ",
      btn_copy_id: "📋 КОПИРОВАТЬ ID",
      btn_download: "💾 СКАЧАТЬ HD",

      nav_step_minus10: "-10",
      nav_prev: "← НАЗАД",
      nav_random: "🎲 СЛУЧАЙНЫЙ",
      nav_next: "ВПЕРЁД →",
      nav_step_plus10: "+10",

      tool_jump: "🔍 ПОИСК ЭКСПОНАТА",
      tool_locate: "📷 НАЙТИ ФОТО",
      tool_musya: "🐾 ПОРТРЕТ МУСИ",
      tool_keti: "🐾 ПОРТРЕТ КЕТИ",
      tool_share: "🔗 ПОДЕЛИТЬСЯ",
      tool_save_catalog: "⭐ В КАТАЛОГ",

      placard_title: "АРТИФАКТ МУЗЕЯ МУСИ И КЕТИ",
      placard_provenance: "ОБРАТИМАЯ БИЕКЦИЯ ФЕЙСТЕЛЯ-SPN",
      placard_desc: "Каждое возможное изображение Вселенной обладает точным, математически обратимым адресом. Соседние координаты рассеиваются псевдослучайно с эффектом лавины ~50%.",
      placard_curators: "Хранительницы цифрового архива: Муся и Кети",
      placard_sector: "СЕКТОР МАТРИЦЫ",
      placard_payload: "ОБЪЁМ ДАННЫХ",
      placard_prob: "КОСМИЧЕСКАЯ ВЕРОЯТНОСТЬ",
      placard_addr_title: "ТОЧНЫЙ МАТЕМАТИЧЕСКИЙ АДРЕС",
      placard_btn_copy: "КОПИРОВАТЬ АДРЕС",

      modal_jump_title: "🔍 Поиск экспоната в Галерее Муси и Кети",
      search_tab_num: "ПО НОМЕРУ ЭКСПОНАТА",
      search_tab_id: "ПО ПОЛНОМУ ID",
      modal_search_num_hint: "Введите номер сохранённого экспоната (например, EXHIBIT #000000001 или 1):",
      modal_search_num_placeholder: "EXHIBIT #000000001...",
      modal_search_num_btn: "НАЙТИ В КАТАЛОГЕ",
      modal_jump_hint: "Вставьте полный адрес 32×32 (b32_...), 64×64 (b64_...) или Base64 ID:",
      modal_jump_placeholder: "Вставьте полный ID экспоната здесь...",
      modal_jump_btn: "ДЕКОДИРОВАТЬ И ОТКРЫТЬ",
      search_num_not_found: "Экспонат с указанным номером не найден в каталоге сохранённых экспонатов.",
      toast_boundary_min: "Достигнута граница галереи: номер экспоната не может быть меньше 1",
      toast_boundary_max: "Достигнута верхняя граница адресного пространства",
      toast_saved_catalog: "Экспонат успешно сохранён в каталоге с номером",

      modal_locate_title: "📷 Найти фотографию в Галерее Муси и Кети",
      modal_locate_hint: "Загрузите любую фотографию, чтобы вычислить её уникальные координаты через обратную перестановку:",
      modal_dropzone_main: "Выберите или перетащите фото",
      modal_dropzone_sub: "100% локальная обработка на вашем устройстве без сервера",
      modal_locate_sector: "ЦЕЛЕВОЙ СЕКТОР:",
      modal_locate_opt32: "32×32 Стандарт (1 024 px)",
      modal_locate_opt64: "64×64 Детализированный (4 096 px)",
      modal_locate_warn: "⚠️ Фотография будет нормализована к выбранному разрешению. Мелкие детали будут квантованы.",
      modal_locate_btn: "РАССЧИТАТЬ АДРЕС В АРХИВЕ",

      archive_title: "ЗАЛ ЭКСПОНАТОВ МУЗЕЯ",
      archive_sub: "Случайные экспонаты из бесконечного континуума Муси и Кети.",
      archive_resample: "🎲 ОБНОВИТЬ",
      archive_load_more: "＋ ЕЩЁ 12 ЭКСПОНАТОВ",
      archive_examine: "ОСМОТРЕТЬ",
      archive_copy: "КОПИРОВАТЬ ID",

      toast_copied: "Полный адрес скопирован в буфер!",
      toast_link_copied: "Ссылка на экспонат скопирована!",
      toast_random_gen: "Материализован случайный экспонат сектора",
      toast_cat_loaded: "Материализован портрет хранительницы",
      toast_address_calc: "Координата найдена в пространстве Муси и Кети!",

      footer_copy: "ГАЛЕРЕЯ МУСИ И КЕТИ • БЕСКОНЕЧНЫЙ ЦИФРОВОЙ МУЗЕЙ",
      footer_tech: "Биективная псевдослучайная перестановка (Feistel-SPN) • Без серверов и баз данных",
    },

    en: {
      site_title: "MUSYA & KETI GALLERY — Digital Museum of All Possible Images",
      site_badge: "INFINITE ARCHIVE",
      site_name: "MUSYA & KETI GALLERY",
      hero_title: "MUSYA & KETI INFINITE GALLERY",
      hero_sub: "Digital Museum of All Possible Images • Feline Guardians of Infinite Continua",

      nav_gallery: "GALLERY",
      nav_archive: "ARCHIVE",
      nav_about: "ABOUT",
      nav_tests: "TESTS",

      cat_musya_name: "Musya",
      cat_musya_role: "Guardian of Space",
      cat_musya_hint: "Click to materialize Musya in the Gallery",
      cat_keti_name: "Keti",
      cat_keti_role: "Guardian of Symmetry",
      cat_keti_hint: "Click to materialize Keti in the Gallery",

      exhibit_badge_prefix: "EXHIBIT #",
      exhibit_id_prefix: "ID: ",
      btn_copy_id: "📋 COPY ID",
      btn_download: "💾 DOWNLOAD HD",

      nav_step_minus10: "-10",
      nav_prev: "← PREVIOUS",
      nav_random: "🎲 RANDOM",
      nav_next: "NEXT →",
      nav_step_plus10: "+10",

      tool_jump: "🔍 SEARCH EXHIBIT",
      tool_locate: "📷 LOCATE PHOTO",
      tool_musya: "🐾 MUSYA'S PORTRAIT",
      tool_keti: "🐾 KETI'S PORTRAIT",
      tool_share: "🔗 SHARE LINK",
      tool_save_catalog: "⭐ TO CATALOG",

      placard_title: "MUSYA & KETI MUSEUM ARTIFACT",
      placard_provenance: "FEISTEL-SPN BIJECTIVE PERMUTATION",
      placard_desc: "Every possible image in the Universe exists at an exact, mathematically reversible address. Neighboring coordinates diffuse pseudo-randomly with ~50% avalanche effect.",
      placard_curators: "Archive Curators & Guardians: Musya & Keti",
      placard_sector: "MATRIX SECTOR",
      placard_payload: "DATA PAYLOAD",
      placard_prob: "COSMIC PROBABILITY",
      placard_addr_title: "EXACT REVERSIBLE ADDRESS",
      placard_btn_copy: "COPY FULL ADDRESS",

      modal_jump_title: "🔍 Search Exhibit in Musya & Keti Gallery",
      search_tab_num: "BY EXHIBIT NUMBER",
      search_tab_id: "BY FULL ID",
      modal_search_num_hint: "Enter saved exhibit number (e.g. EXHIBIT #000000001 or 1):",
      modal_search_num_placeholder: "EXHIBIT #000000001...",
      modal_search_num_btn: "FIND IN CATALOG",
      modal_jump_hint: "Paste any 32×32 (b32_...), 64×64 (b64_...) or Base64 ID:",
      modal_jump_placeholder: "Paste full exhibit ID here...",
      modal_jump_btn: "DECODE & OPEN",
      search_num_not_found: "Exhibit with specified number was not found in the catalog of saved exhibits.",
      toast_boundary_min: "Reached gallery boundary: exhibit number cannot be less than 1",
      toast_boundary_max: "Reached maximum boundary of address space",
      toast_saved_catalog: "Exhibit successfully saved to catalog with number",

      modal_locate_title: "📷 Locate Photograph in Musya & Keti Gallery",
      modal_locate_hint: "Upload any photograph to calculate its unique coordinate using the inverse permutation:",
      modal_dropzone_main: "Choose or drag & drop photo",
      modal_dropzone_sub: "100% processed locally on your device without server upload",
      modal_locate_sector: "TARGET SECTOR:",
      modal_locate_opt32: "32×32 Standard (1,024 px)",
      modal_locate_opt64: "64×64 Enhanced (4,096 px)",
      modal_locate_warn: "⚠️ Photo will be normalized to target resolution. Fine details will be quantized.",
      modal_locate_btn: "CALCULATE BABEL ADDRESS",

      archive_title: "MUSEUM ARCHIVE CORRIDOR",
      archive_sub: "Random exhibits sampled across Musya & Keti's infinite continuum.",
      archive_resample: "🎲 RESAMPLE",
      archive_load_more: "＋ LOAD 12 MORE",
      archive_examine: "EXAMINE",
      archive_copy: "COPY ID",

      toast_copied: "Full address copied to clipboard!",
      toast_link_copied: "Direct link copied!",
      toast_random_gen: "Materialized random exhibit coordinate",
      toast_cat_loaded: "Materialized guardian portrait",
      toast_address_calc: "Coordinate located in Musya & Keti's Space!",

      footer_copy: "MUSYA & KETI GALLERY • DIGITAL MUSEUM OF BABEL",
      footer_tech: "Deterministic Bijective Permutation (Feistel-SPN) • Zero Database Storage",
    }
  };

  function detectInitialLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'ru' || saved === 'en')) {
      return saved;
    }
    const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (navLang.startsWith('ru') || navLang.startsWith('be') || navLang.startsWith('uk') || navLang.startsWith('kk')) {
      return 'ru';
    }
    return 'en';
  }

  let currentLang = detectInitialLanguage();

  function t(key) {
    const langDict = TRANSLATIONS[currentLang] || TRANSLATIONS.ru;
    return langDict[key] || TRANSLATIONS.en[key] || key;
  }

  function setLanguage(lang) {
    if (lang !== 'ru' && lang !== 'en') return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    applyTranslations();

    // Notify listeners
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  function getLanguage() {
    return currentLang;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;

    // Elements with data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (text) {
        el.innerHTML = text;
      }
    });

    // Elements with data-i18n-placeholder
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = t(key);
      if (text) {
        el.setAttribute('placeholder', text);
      }
    });

    // Elements with data-i18n-title
    const titled = document.querySelectorAll('[data-i18n-title]');
    titled.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = t(key);
      if (text) {
        el.setAttribute('title', text);
      }
    });

    // Update Language Toggle Switch Button state
    const langBtnRu = document.getElementById('langBtnRu');
    const langBtnEn = document.getElementById('langBtnEn');
    if (langBtnRu && langBtnEn) {
      if (currentLang === 'ru') {
        langBtnRu.classList.add('active');
        langBtnEn.classList.remove('active');
      } else {
        langBtnEn.classList.add('active');
        langBtnRu.classList.remove('active');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();

    // Attach click listeners to language toggle if present
    const langBtnRu = document.getElementById('langBtnRu');
    const langBtnEn = document.getElementById('langBtnEn');
    if (langBtnRu) {
      langBtnRu.addEventListener('click', () => setLanguage('ru'));
    }
    if (langBtnEn) {
      langBtnEn.addEventListener('click', () => setLanguage('en'));
    }
  });

  window.InfiniteGalleryI18n = {
    t,
    setLanguage,
    getLanguage,
    applyTranslations,
    TRANSLATIONS
  };
})();
