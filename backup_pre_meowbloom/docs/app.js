/**
 * MUSYA & KETI: INFINITE GALLERY - Minimalist Digital Museum Controller (app.js)
 * Features:
 * - Robust clipboard image paste (Ctrl+V for screenshots, graphic editors, files)
 * - Drag & drop and file upload for PNG, JPG/JPEG, WebP
 * - Full 32x32 and 64x64 resolution switcher on main screen and in photo encoder
 * - Compact "Share Link" directly on the main screen with URL state persistence
 * - Unified search by short number or full mathematical ID with auto resolution detection
 * - Complete catalog with canvas previews, deletion of personal exhibits, and JSON export/import
 */

(function () {
  'use strict';

  const { bytesToId, encodeImageSource, getResolutionSpec, RESOLUTIONS } = window.InfiniteGalleryEncoder || {};
  const { validateId, detectResolution, renderIdToCanvas, downloadIdAsPng, idToBytesAndResolution } = window.InfiniteGalleryDecoder || {};
  const { generateRandomId, stepAddress, generateBatch } = window.InfiniteGalleryGenerator || {};
  const Catalog = window.InfiniteGalleryCatalog || {
    formatExhibitNumber: (n) => `EXHIBIT #${String(n).padStart(9, '0')}`,
    parseExhibitNumber: (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || null,
    getAllExhibits: () => [],
    getMyExhibits: () => [],
    getSeedExhibits: () => [],
    findByNumber: () => null,
    findById: () => null,
    saveExhibit: () => ({ number: 1 }),
    deleteExhibit: () => false,
    exportCatalogJSON: () => "{}",
    importCatalogJSON: () => ({ success: false })
  };

  // Subtle corner notification pill (never intrusive, vanishes in 1.8s)
  let activeNoticeTimer = null;
  function showMinimalNotice(message, type = 'info') {
    let pill = document.getElementById('minimalNoticePill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'minimalNoticePill';
      document.body.appendChild(pill);
    }

    if (activeNoticeTimer) clearTimeout(activeNoticeTimer);

    pill.className = `minimal-notice-pill minimal-notice-${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    pill.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    pill.style.display = 'flex';
    pill.style.opacity = '1';

    activeNoticeTimer = setTimeout(() => {
      pill.style.opacity = '0';
      setTimeout(() => {
        pill.style.display = 'none';
      }, 200);
    }, 1800);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Full untruncated clipboard copy
  async function copyText(text, feedbackEl = null, noticeText = 'Скопировано в буфер') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      if (feedbackEl) {
        feedbackEl.style.display = 'inline';
        setTimeout(() => {
          feedbackEl.style.display = 'none';
        }, 1400);
      }
      showMinimalNotice(noticeText, 'success');
    } catch (e) {
      showMinimalNotice('Не удалось скопировать', 'error');
    }
  }

  function addressToExhibitNumber(idStr) {
    try {
      const decoded = idToBytesAndResolution(idStr);
      if (!decoded || !decoded.bytes) return 1;
      const b = decoded.bytes;
      const n = b.length;
      let low = ((b[n - 4] << 24) >>> 0) | (b[n - 3] << 16) | (b[n - 2] << 8) | b[n - 1];
      return Math.abs(low % 90000000) + 1;
    } catch (e) {
      return 1;
    }
  }

  // =========================================
  // MAIN DIGITAL MUSEUM CONTROLLER (index.html)
  // =========================================
  function initMuseumApp() {
    const artworkCanvas = document.getElementById('artworkCanvas');
    if (!artworkCanvas) return;

    // Top Meta Elements
    const exhibitNum = document.getElementById('exhibitNum');
    const resBtn32 = document.getElementById('resBtn32');
    const resBtn64 = document.getElementById('resBtn64');
    const stageCopyIdBtn = document.getElementById('stageCopyIdBtn');
    const stageShortId = document.getElementById('stageShortId');
    const copyInlineFeedback = document.getElementById('copyInlineFeedback');
    const stageShareBtn = document.getElementById('stageShareBtn');
    const shareInlineFeedback = document.getElementById('shareInlineFeedback');

    // Navigation Controls
    const stepMinus10 = document.getElementById('stepMinus10');
    const prevBtn = document.getElementById('prevBtn');
    const randomBtn = document.getElementById('randomBtn');
    const nextBtn = document.getElementById('nextBtn');
    const stepPlus10 = document.getElementById('stepPlus10');
    const openSearchBtn = document.getElementById('openSearchBtn');

    // Secondary Actions Dropdown
    const actionsToggleBtn = document.getElementById('actionsToggleBtn');
    const actionsMenu = document.getElementById('actionsMenu');
    const menuSaveCatalog = document.getElementById('menuSaveCatalog');
    const menuDownloadHd = document.getElementById('menuDownloadHd');
    const menuMusyaPortrait = document.getElementById('menuMusyaPortrait');
    const menuKetiPortrait = document.getElementById('menuKetiPortrait');
    const menuLocatePhoto = document.getElementById('menuLocatePhoto');

    // Search Modal
    const searchModal = document.getElementById('searchModal');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchCancelBtn = document.getElementById('searchCancelBtn');
    const searchSubmitBtn = document.getElementById('searchSubmitBtn');
    const searchUnifiedInput = document.getElementById('searchUnifiedInput');
    const searchErrorNotice = document.getElementById('searchErrorNotice');

    // Photo Locator Modal Elements
    const photoModal = document.getElementById('photoModal');
    const photoCloseBtn = document.getElementById('photoCloseBtn');
    const photoCancelBtn = document.getElementById('photoCancelBtn');
    const photoDropzone = document.getElementById('photoDropzone');
    const photoFileInput = document.getElementById('photoFileInput');
    const photoPreviewWrap = document.getElementById('photoPreviewWrap');
    const photoThumb = document.getElementById('photoThumb');
    const photoName = document.getElementById('photoName');
    const photoMeta = document.getElementById('photoMeta');
    const photoTarget32 = document.getElementById('photoTarget32');
    const photoTarget64 = document.getElementById('photoTarget64');
    const photoCalculateBtn = document.getElementById('photoCalculateBtn');

    // State
    let currentId = null;
    let currentResolution = 32;
    let currentExhibitNumber = 1;
    let stagedPhotoFile = null;
    let photoTargetRes = 32;

    // Update Resolution Switcher UI (32x32 vs 64x64)
    function updateResolutionUI() {
      if (resBtn32 && resBtn64) {
        if (currentResolution === 64) {
          resBtn64.classList.add('active');
          resBtn32.classList.remove('active');
        } else {
          resBtn32.classList.add('active');
          resBtn64.classList.remove('active');
        }
      }
    }

    // Load and Render Exhibit with Automatic Resolution Detection
    function loadExhibit(idStr, explicitNumber = null) {
      if (!idStr || typeof idStr !== 'string') return false;

      const cleanId = idStr.trim();
      const validation = validateId(cleanId);
      if (!validation.valid) {
        showMinimalNotice(validation.error, 'error');
        return false;
      }

      currentId = cleanId;
      // Auto-detect resolution from ID!
      currentResolution = validation.resolution || 32;
      updateResolutionUI();

      // Determine Exhibit Number
      if (explicitNumber !== null && explicitNumber !== undefined) {
        currentExhibitNumber = Math.max(1, Math.floor(Number(explicitNumber)));
      } else {
        const catEntry = Catalog.findById(currentId);
        if (catEntry && catEntry.number) {
          currentExhibitNumber = catEntry.number;
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          const qNum = parseInt(urlParams.get('num'), 10);
          if (Number.isFinite(qNum) && qNum >= 1) {
            currentExhibitNumber = qNum;
          } else {
            currentExhibitNumber = addressToExhibitNumber(currentId);
          }
        }
      }

      // Render Artwork on Canvas
      const scale = currentResolution === 32 ? 14 : 7; // ~440px
      renderIdToCanvas(currentId, artworkCanvas, { scale });

      // Update Top Meta Bar
      if (exhibitNum) exhibitNum.textContent = Catalog.formatExhibitNumber(currentExhibitNumber);
      if (stageShortId) {
        stageShortId.textContent = `${currentId.slice(0, 10)}...${currentId.slice(-6)}`;
      }

      // Update URL silently
      const newUrl = `${window.location.pathname}?id=${encodeURIComponent(currentId)}&num=${currentExhibitNumber}`;
      window.history.replaceState({ id: currentId, num: currentExhibitNumber }, '', newUrl);

      return true;
    }

    // Resolution Switcher Click Handlers on Main Screen
    if (resBtn32) {
      resBtn32.addEventListener('click', () => {
        if (currentResolution !== 32) {
          currentResolution = 32;
          updateResolutionUI();
          // If on Keti/Musya 64x64, switch to 32x32 counterpart, else generate random 32x32
          if (currentExhibitNumber === 3) {
            loadExhibit(window.CAT_EXHIBITS.musya.id_32, 1);
          } else if (currentExhibitNumber === 4) {
            loadExhibit(window.CAT_EXHIBITS.keti.id_32, 2);
          } else {
            const randId = generateRandomId(32, true);
            loadExhibit(randId);
          }
          showMinimalNotice('Переключено на 32×32 (Стандарт)', 'info');
        }
      });
    }

    if (resBtn64) {
      resBtn64.addEventListener('click', () => {
        if (currentResolution !== 64) {
          currentResolution = 64;
          updateResolutionUI();
          // Switch to 64x64
          if (currentExhibitNumber === 1 && window.CAT_EXHIBITS && window.CAT_EXHIBITS.musya) {
            loadExhibit(window.CAT_EXHIBITS.musya.id_64, 3);
          } else if (currentExhibitNumber === 2 && window.CAT_EXHIBITS && window.CAT_EXHIBITS.keti) {
            loadExhibit(window.CAT_EXHIBITS.keti.id_64, 4);
          } else {
            const randId = generateRandomId(64, true);
            loadExhibit(randId);
          }
          showMinimalNotice('Переключено на 64×64 (Детализированный)', 'info');
        }
      });
    }

    // Step by Delta (+1, -1, +10, -10)
    function stepBy(delta) {
      if (!currentId) return;
      const nextNum = currentExhibitNumber + delta;
      if (nextNum < 1) {
        showMinimalNotice('Достигнута граница: номер не может быть меньше 1', 'error');
        return;
      }

      try {
        const nextId = stepAddress(currentId, delta);
        loadExhibit(nextId, nextNum);
      } catch (err) {
        showMinimalNotice('Ошибка шага: ' + err.message, 'error');
      }
    }

    if (stepMinus10) stepMinus10.addEventListener('click', () => stepBy(-10));
    if (prevBtn) prevBtn.addEventListener('click', () => stepBy(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => stepBy(1));
    if (stepPlus10) stepPlus10.addEventListener('click', () => stepBy(10));

    // Random Exhibit: Generates in the CURRENTLY SELECTED resolution (32x32 or 64x64)
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        const randId = generateRandomId(currentResolution, true);
        const randNum = addressToExhibitNumber(randId);
        loadExhibit(randId, randNum);
      });
    }

    // Copy ID on Meta Bar
    if (stageCopyIdBtn) {
      stageCopyIdBtn.addEventListener('click', () => {
        if (currentId) copyText(currentId, copyInlineFeedback, 'ID скопирован в буфер');
      });
    }

    // Share Link on Meta Bar
    if (stageShareBtn) {
      stageShareBtn.addEventListener('click', () => {
        if (currentId) {
          const directUrl = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(currentId)}&num=${currentExhibitNumber}`;
          copyText(directUrl, shareInlineFeedback, 'Ссылка на экспонат скопирована');
        }
      });
    }

    // Actions Dropdown Menu Toggle
    if (actionsToggleBtn && actionsMenu) {
      actionsToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actionsMenu.classList.toggle('active');
      });

      document.addEventListener('click', () => {
        actionsMenu.classList.remove('active');
      });
    }

    // Secondary Actions
    if (menuSaveCatalog) {
      menuSaveCatalog.addEventListener('click', () => {
        if (!currentId) return;
        const existing = Catalog.findById(currentId);
        if (existing) {
          showMinimalNotice(`Уже в каталоге: ${Catalog.formatExhibitNumber(existing.number)}`, 'info');
          return;
        }

        const saved = Catalog.saveExhibit({
          id: currentId,
          resolution: currentResolution,
          number: currentExhibitNumber,
          title_ru: `Экспонат ${Catalog.formatExhibitNumber(currentExhibitNumber)}`,
          title_en: `Exhibit ${Catalog.formatExhibitNumber(currentExhibitNumber)}`
        });
        showMinimalNotice(`Сохранено: ${Catalog.formatExhibitNumber(saved.number)} ⭐`, 'success');
      });
    }

    if (menuDownloadHd) {
      menuDownloadHd.addEventListener('click', () => {
        if (currentId) {
          const scale = currentResolution === 32 ? 16 : 8; // 512px
          downloadIdAsPng(currentId, scale, `musya_keti_${currentResolution}x${currentResolution}_${currentId.slice(0, 8)}.png`);
          showMinimalNotice('Скачано HD изображение 512×512', 'success');
        }
      });
    }

    if (menuMusyaPortrait) {
      menuMusyaPortrait.addEventListener('click', () => {
        if (window.CAT_EXHIBITS && window.CAT_EXHIBITS.musya) {
          const id = currentResolution === 64 ? window.CAT_EXHIBITS.musya.id_64 : window.CAT_EXHIBITS.musya.id_32;
          loadExhibit(id, currentResolution === 64 ? 3 : 1);
          showMinimalNotice(`Портрет Муси (${currentResolution}×${currentResolution}) 🐾`, 'info');
        }
      });
    }

    if (menuKetiPortrait) {
      menuKetiPortrait.addEventListener('click', () => {
        if (window.CAT_EXHIBITS && window.CAT_EXHIBITS.keti) {
          const id = currentResolution === 64 ? window.CAT_EXHIBITS.keti.id_64 : window.CAT_EXHIBITS.keti.id_32;
          loadExhibit(id, currentResolution === 64 ? 4 : 2);
          showMinimalNotice(`Портрет Кейти (${currentResolution}×${currentResolution}) 🐾`, 'info');
        }
      });
    }

    // =========================================
    // SEARCH MODAL
    // =========================================
    function openSearch() {
      if (!searchModal) return;
      searchModal.classList.add('active');
      if (searchErrorNotice) searchErrorNotice.style.display = 'none';
      if (searchUnifiedInput) {
        searchUnifiedInput.value = '';
        setTimeout(() => searchUnifiedInput.focus(), 80);
      }
    }

    function closeSearch() {
      if (searchModal) searchModal.classList.remove('active');
    }

    if (openSearchBtn) openSearchBtn.addEventListener('click', openSearch);
    if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
    if (searchCancelBtn) searchCancelBtn.addEventListener('click', closeSearch);
    if (searchModal) {
      searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) closeSearch();
      });
    }

    function executeUnifiedSearch() {
      const val = searchUnifiedInput ? searchUnifiedInput.value.trim() : '';
      if (!val) {
        if (searchErrorNotice) {
          searchErrorNotice.textContent = 'Пожалуйста, введите номер или ID экспоната.';
          searchErrorNotice.style.display = 'block';
        }
        return;
      }

      // Check if it's a short exhibit number
      const parsedNum = Catalog.parseExhibitNumber(val);
      if (parsedNum && val.length < 50) {
        const found = Catalog.findByNumber(parsedNum);
        if (found && found.id) {
          loadExhibit(found.id, found.number);
          closeSearch();
          showMinimalNotice(`Экспонат ${Catalog.formatExhibitNumber(found.number)} найден!`, 'success');
          return;
        } else {
          if (searchErrorNotice) {
            searchErrorNotice.textContent = `Экспонат ${Catalog.formatExhibitNumber(parsedNum)} не найден в каталоге.`;
            searchErrorNotice.style.display = 'block';
          }
          return;
        }
      }

      // Otherwise treat as full mathematical ID (with auto resolution detection)
      const success = loadExhibit(val);
      if (success) {
        closeSearch();
        showMinimalNotice('Экспонат материализован по адресу!', 'success');
      } else {
        const validation = validateId(val);
        if (searchErrorNotice) {
          searchErrorNotice.textContent = validation.error || 'Некорректный адрес экспоната.';
          searchErrorNotice.style.display = 'block';
        }
      }
    }

    if (searchSubmitBtn) searchSubmitBtn.addEventListener('click', executeUnifiedSearch);
    if (searchUnifiedInput) {
      searchUnifiedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          executeUnifiedSearch();
        }
      });
    }

    // =========================================
    // IMAGE PASTING (CTRL+V), DRAG & DROP & UPLOAD
    // =========================================
    function openPhotoModal() {
      if (!photoModal) return;
      photoModal.classList.add('active');
      photoTargetRes = currentResolution || 32;
      updatePhotoTargetResUI();
    }

    function closePhotoModal() {
      if (photoModal) photoModal.classList.remove('active');
      stagedPhotoFile = null;
      if (photoPreviewWrap) photoPreviewWrap.style.display = 'none';
      if (photoCalculateBtn) photoCalculateBtn.style.display = 'none';
    }

    function updatePhotoTargetResUI() {
      if (photoTarget32 && photoTarget64) {
        if (photoTargetRes === 64) {
          photoTarget64.classList.add('active');
          photoTarget32.classList.remove('active');
        } else {
          photoTarget32.classList.add('active');
          photoTarget64.classList.remove('active');
        }
      }
    }

    if (photoTarget32) {
      photoTarget32.addEventListener('click', () => {
        photoTargetRes = 32;
        updatePhotoTargetResUI();
      });
    }

    if (photoTarget64) {
      photoTarget64.addEventListener('click', () => {
        photoTargetRes = 64;
        updatePhotoTargetResUI();
      });
    }

    if (menuLocatePhoto) menuLocatePhoto.addEventListener('click', openPhotoModal);
    if (photoCloseBtn) photoCloseBtn.addEventListener('click', closePhotoModal);
    if (photoCancelBtn) photoCancelBtn.addEventListener('click', closePhotoModal);
    if (photoModal) {
      photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) closePhotoModal();
      });
    }

    // Stage an image file (from File Input, Drag & Drop, or Clipboard Paste)
    function stageImageFile(file) {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        showMinimalNotice('Поддерживаются только изображения (PNG, JPG/JPEG, WebP).', 'error');
        return;
      }

      stagedPhotoFile = file;
      openPhotoModal();

      const reader = new FileReader();
      reader.onload = (e) => {
        if (photoThumb) photoThumb.src = e.target.result;
        if (photoName) photoName.textContent = file.name || 'Вставленное изображение';

        // Load image to read natural dimensions
        const testImg = new Image();
        testImg.onload = () => {
          if (photoMeta) photoMeta.textContent = `${testImg.naturalWidth} × ${testImg.naturalHeight} px (${(file.size / 1024).toFixed(1)} KB)`;
        };
        testImg.src = e.target.result;

        if (photoPreviewWrap) photoPreviewWrap.style.display = 'flex';
        if (photoCalculateBtn) photoCalculateBtn.style.display = 'inline-flex';
      };
      reader.readAsDataURL(file);
    }

    // 1. File Input handler
    if (photoDropzone && photoFileInput) {
      photoDropzone.addEventListener('click', () => photoFileInput.click());
      photoFileInput.addEventListener('change', () => {
        if (photoFileInput.files && photoFileInput.files[0]) {
          stageImageFile(photoFileInput.files[0]);
        }
      });
    }

    // 2. Drag & Drop handlers (Window + Dropzone)
    ['dragenter', 'dragover'].forEach(name => {
      window.addEventListener(name, (e) => {
        e.preventDefault();
        if (photoDropzone) photoDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      window.addEventListener(name, (e) => {
        e.preventDefault();
        if (photoDropzone) photoDropzone.classList.remove('dragover');
      });
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files[0] && files[0].type.startsWith('image/')) {
        stageImageFile(files[0]);
      }
    });

    // 3. CLIPBOARD PASTE (Ctrl+V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              stageImageFile(file);
              showMinimalNotice('Изображение вставлено из буфера обмена! 📋', 'success');
              return;
            }
          }
        }
      }

      // If text paste on the main window outside of an active input/textarea
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (!['INPUT', 'TEXTAREA'].includes(activeTag)) {
        const text = e.clipboardData ? e.clipboardData.getData('text/plain').trim() : '';
        if (text && (text.startsWith('b32_') || text.startsWith('b64_') || text.length === 5462 || text.length === 21846)) {
          e.preventDefault();
          loadExhibit(text);
          showMinimalNotice('Экспонат загружен из вставленного ID!', 'success');
        }
      }
    });

    // 4. Calculate Address with the Selected Target Resolution (32x32 or 64x64)
    if (photoCalculateBtn) {
      photoCalculateBtn.addEventListener('click', async () => {
        if (!stagedPhotoFile) return;

        try {
          showMinimalNotice(`Вычисление адреса матрицы ${photoTargetRes}×${photoTargetRes}...`, 'info');

          // Correct call to encodeImageSource with options object!
          const result = await encodeImageSource(stagedPhotoFile, {
            resolution: photoTargetRes,
            fit: 'cover',
            usePermutation: true
          });

          const newId = result.id;
          const fileName = stagedPhotoFile.name || 'Скриншот';

          // Save into Catalog
          const saved = Catalog.saveExhibit({
            id: newId,
            resolution: photoTargetRes,
            title_ru: `Фото: ${fileName.slice(0, 24)}`,
            title_en: `Photo: ${fileName.slice(0, 24)}`
          });

          closePhotoModal();
          loadExhibit(newId, saved.number);
          showMinimalNotice(`Адрес рассчитан (${photoTargetRes}×${photoTargetRes})! [${Catalog.formatExhibitNumber(saved.number)}] 🐾`, 'success');
        } catch (err) {
          showMinimalNotice('Ошибка кодирования изображения: ' + err.message, 'error');
        }
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBy(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepBy(1);
      } else if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (randomBtn) randomBtn.click();
      }
    });

    // Initial Load: URL parameters or Musya 32x32
    const params = new URLSearchParams(window.location.search);
    const initialId = params.get('id');
    const initialNum = parseInt(params.get('num'), 10);

    if (initialId) {
      loadExhibit(initialId, Number.isFinite(initialNum) ? initialNum : null);
    } else if (window.CAT_EXHIBITS && window.CAT_EXHIBITS.musya) {
      loadExhibit(window.CAT_EXHIBITS.musya.id_32, 1);
    } else {
      loadExhibit(generateRandomId(32, true), 1);
    }
  }

  // =========================================
  // EXPLORE & CATALOG CONTROLLER (explore.html)
  // =========================================
  function initExploreGallery() {
    const catalogCardsGrid = document.getElementById('catalogCardsGrid');
    if (!catalogCardsGrid) return;

    const catalogSearchInput = document.getElementById('catalogSearchInput');
    const filterPills = document.querySelectorAll('.filter-pill');
    const btnExportCatalog = document.getElementById('btnExportCatalog');
    const importCatalogInput = document.getElementById('importCatalogInput');
    const catalogCountBadge = document.getElementById('catalogCountBadge');

    let currentFilter = 'all';

    function renderCatalog() {
      catalogCardsGrid.innerHTML = '';
      const all = Catalog.getAllExhibits();
      const my = Catalog.getMyExhibits();
      const seeds = Catalog.getSeedExhibits();

      const query = (catalogSearchInput ? catalogSearchInput.value.trim().toLowerCase() : '');

      let filtered = all;

      if (currentFilter === 'my') {
        filtered = my;
      } else if (currentFilter === 'guardians') {
        filtered = seeds;
      } else if (currentFilter === '32') {
        filtered = all.filter(e => e.resolution === 32);
      } else if (currentFilter === '64') {
        filtered = all.filter(e => e.resolution === 64);
      }

      if (query) {
        filtered = filtered.filter(e => {
          const formattedNum = Catalog.formatExhibitNumber(e.number).toLowerCase();
          const numStr = String(e.number);
          const title = (e.title_ru || e.title_en || '').toLowerCase();
          const id = (e.id || '').toLowerCase();
          return formattedNum.includes(query) || numStr.includes(query) || title.includes(query) || id.includes(query);
        });
      }

      if (catalogCountBadge) {
        catalogCountBadge.textContent = `Экспонатов: ${filtered.length}`;
      }

      if (filtered.length === 0) {
        catalogCardsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
            Ни одного экспоната не найдено по данному фильтру.
          </div>
        `;
        return;
      }

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'catalog-card';

        const wrap = document.createElement('div');
        wrap.className = 'catalog-card-canvas-wrap';

        const canvas = document.createElement('canvas');
        canvas.className = 'catalog-card-canvas';
        const res = item.resolution || (item.id && item.id.startsWith('b64_') ? 64 : 32);
        const scale = res === 32 ? 6 : 3;
        renderIdToCanvas(item.id, canvas, { scale });
        wrap.appendChild(canvas);

        const body = document.createElement('div');
        body.className = 'catalog-card-body';

        const numSpan = document.createElement('span');
        numSpan.className = 'catalog-card-num';
        numSpan.textContent = Catalog.formatExhibitNumber(item.number);

        const titleDiv = document.createElement('div');
        titleDiv.className = 'catalog-card-title';
        titleDiv.textContent = item.title_ru || item.title_en || `Экспонат #${item.number}`;
        titleDiv.title = titleDiv.textContent;

        const resTag = document.createElement('span');
        resTag.style.fontSize = '0.6875rem';
        resTag.style.color = 'var(--text-dim)';
        resTag.textContent = `${res}×${res} RGBA`;

        const actions = document.createElement('div');
        actions.className = 'catalog-card-actions';

        const openBtn = document.createElement('a');
        openBtn.className = 'btn btn-secondary btn-sm';
        openBtn.href = `index.html?id=${encodeURIComponent(item.id)}&num=${item.number}`;
        openBtn.textContent = 'Осмотреть';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-secondary btn-sm';
        copyBtn.type = 'button';
        copyBtn.textContent = 'Копировать';
        copyBtn.addEventListener('click', () => {
          copyText(item.id, null, 'ID экспоната скопирован');
        });

        actions.appendChild(openBtn);
        actions.appendChild(copyBtn);

        // Deletion for custom exhibits (seeds 1-4 are protected)
        if (item.number > 4) {
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-sm';
          deleteBtn.style.color = '#fb7185';
          deleteBtn.style.background = 'rgba(244, 63, 94, 0.1)';
          deleteBtn.type = 'button';
          deleteBtn.textContent = '🗑';
          deleteBtn.title = 'Удалить из каталога';
          deleteBtn.addEventListener('click', () => {
            if (confirm(`Удалить ${Catalog.formatExhibitNumber(item.number)} из личного каталога?`)) {
              Catalog.deleteExhibit(item.number);
              showMinimalNotice(`Экспонат #${item.number} удалён`, 'info');
              renderCatalog();
            }
          });
          actions.appendChild(deleteBtn);
        }

        body.appendChild(numSpan);
        body.appendChild(titleDiv);
        body.appendChild(resTag);
        body.appendChild(actions);

        card.appendChild(wrap);
        card.appendChild(body);

        catalogCardsGrid.appendChild(card);
      });
    }

    // Filter pills
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.getAttribute('data-filter') || 'all';
        renderCatalog();
      });
    });

    if (catalogSearchInput) {
      catalogSearchInput.addEventListener('input', () => renderCatalog());
    }

    // Export Catalog JSON
    if (btnExportCatalog) {
      btnExportCatalog.addEventListener('click', () => {
        const jsonStr = Catalog.exportCatalogJSON();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `musya_keti_catalog_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showMinimalNotice('Каталог экспортирован в JSON 💾', 'success');
      });
    }

    // Import Catalog JSON
    if (importCatalogInput) {
      importCatalogInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const res = Catalog.importCatalogJSON(event.target.result);
          if (res.success) {
            showMinimalNotice(`Импортировано ${res.count} экспонатов! 🎉`, 'success');
            renderCatalog();
          } else {
            showMinimalNotice('Ошибка импорта: ' + res.error, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    renderCatalog();
  }

  // DOM Loaded Bootstrap
  document.addEventListener('DOMContentLoaded', () => {
    initMuseumApp();
    initExploreGallery();
  });

})();
