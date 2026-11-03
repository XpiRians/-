/**
 * MUSYA & KETI: INFINITE GALLERY - Digital Museum Controller (JavaScript ES6+)
 * Dedicated to the two feline guardians: Musya & Keti
 * Manages central masterpiece viewport, Babel Permutation traversal (prev/next/random, +/-10),
 * full untruncated clipboard copying, search modal (by full ID & by short number),
 * and catalog of saved exhibits.
 */

(function () {
  'use strict';

  const { bytesToId, encodeImageSource, getResolutionSpec, RESOLUTIONS } = window.InfiniteGalleryEncoder || {};
  const { validateId, detectResolution, renderIdToCanvas, downloadIdAsPng, idToBytesAndResolution } = window.InfiniteGalleryDecoder || {};
  const { generateRandomId, stepAddress, generateBatch } = window.InfiniteGalleryGenerator || {};
  const { t, getLanguage } = window.InfiniteGalleryI18n || { t: (k) => k, getLanguage: () => 'ru' };
  const Catalog = window.InfiniteGalleryCatalog || {
    formatExhibitNumber: (n) => `EXHIBIT #${String(n).padStart(9, '0')}`,
    parseExhibitNumber: (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || null,
    getAllExhibits: () => [],
    findByNumber: () => null,
    findById: () => null,
    saveExhibit: () => ({ number: 1 })
  };

  // Global Toast Notification Helper
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : '🐾');
    const color = type === 'success' ? '#10b981' : (type === 'error' ? '#f43f5e' : '#c084fc');

    toast.innerHTML = `<span style="font-weight:bold; color:${color}; font-size:1.1rem; line-height:1;">${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Full Untruncated Clipboard Copy
  async function copyFullAddress(text, successMsg = null) {
    const msg = successMsg || t('toast_copied');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(`${msg} (${text.length} chars)`, 'success');
    } catch (err) {
      showToast('Could not access clipboard', 'error');
    }
  }

  // Read least-significant bytes of address as a stable integer fallback
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

  // --- MAIN DIGITAL MUSEUM CONTROLLER (index.html & image.html) ---
  function initMuseumApp() {
    const artworkCanvas = document.getElementById('artworkCanvas');
    if (!artworkCanvas) return;

    // Top Exhibition Bar Elements
    const exhibitNum = document.getElementById('exhibitNum');
    const exhibitShortId = document.getElementById('exhibitShortId');
    const topCopyBtn = document.getElementById('topCopyBtn');
    const topDownloadBtn = document.getElementById('topDownloadBtn');
    const resPill32 = document.getElementById('resPill32');
    const resPill64 = document.getElementById('resPill64');

    // Navigation Buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const randomBtn = document.getElementById('randomBtn');
    const stepMinus10 = document.getElementById('stepMinus10');
    const stepPlus10 = document.getElementById('stepPlus10');

    // Cat Guardians & Auxiliary Buttons
    const musyaCrestBtn = document.getElementById('musyaCrestBtn');
    const ketiCrestBtn = document.getElementById('ketiCrestBtn');
    const loadMusyaBtn = document.getElementById('loadMusyaBtn');
    const loadKetiBtn = document.getElementById('loadKetiBtn');
    const saveToCatalogBtn = document.getElementById('saveToCatalogBtn');

    const jumpModalBtn = document.getElementById('jumpModalBtn');
    const photoModalBtn = document.getElementById('photoModalBtn');
    const shareBtn = document.getElementById('shareBtn');

    // Placard Elements
    const placardSector = document.getElementById('placardSector');
    const placardBytes = document.getElementById('placardBytes');
    const placardProb = document.getElementById('placardProb');
    const placardFullId = document.getElementById('placardFullId');
    const placardCopyBtn = document.getElementById('placardCopyBtn');

    // Search Modal Elements (Dual search: by short number and by full ID)
    const jumpModal = document.getElementById('jumpModal');
    const jumpCloseBtn = document.getElementById('jumpCloseBtn');
    const searchTabNumBtn = document.getElementById('searchTabNumBtn');
    const searchTabIdBtn = document.getElementById('searchTabIdBtn');
    const searchTabNumPane = document.getElementById('searchTabNumPane');
    const searchTabIdPane = document.getElementById('searchTabIdPane');
    const searchNumInput = document.getElementById('searchNumInput');
    const searchNumExecuteBtn = document.getElementById('searchNumExecuteBtn');
    const jumpInput = document.getElementById('jumpInput');
    const jumpExecuteBtn = document.getElementById('jumpExecuteBtn');
    const jumpErrorBox = document.getElementById('jumpErrorBox');

    // Photo Locator Modal Elements
    const photoModal = document.getElementById('photoModal');
    const photoCloseBtn = document.getElementById('photoCloseBtn');
    const photoDropzone = document.getElementById('photoDropzone');
    const photoFileInput = document.getElementById('photoFileInput');
    const photoPreviewStrip = document.getElementById('photoPreviewStrip');
    const photoThumb = document.getElementById('photoThumb');
    const photoFileName = document.getElementById('photoFileName');
    const photoResToggle = document.getElementById('photoResToggle');
    const photoDownscaleWarning = document.getElementById('photoDownscaleWarning');
    const photoCalculateBtn = document.getElementById('photoCalculateBtn');

    // Current State
    let currentId = null;
    let currentResolution = 32;
    let currentExhibitNumber = 1; // Integer tracking
    let selectedPhotoFile = null;

    // Load and Render an Exhibit
    function loadExhibit(idStr, explicitNumber = null) {
      const validation = validateId(idStr);
      if (!validation.valid) {
        showToast(validation.error, 'error');
        return false;
      }

      currentId = idStr.trim();
      currentResolution = validation.resolution;
      const spec = RESOLUTIONS[currentResolution];

      // Determine Exhibit Number
      if (explicitNumber !== null && explicitNumber !== undefined) {
        currentExhibitNumber = Math.max(1, Math.floor(Number(explicitNumber)));
      } else {
        const catalogEntry = Catalog.findById(currentId);
        if (catalogEntry && catalogEntry.number) {
          currentExhibitNumber = catalogEntry.number;
        } else {
          // If URL parameter num exists
          const urlParams = new URLSearchParams(window.location.search);
          const qNum = parseInt(urlParams.get('num'), 10);
          if (Number.isFinite(qNum) && qNum >= 1) {
            currentExhibitNumber = qNum;
          } else {
            currentExhibitNumber = addressToExhibitNumber(currentId);
          }
        }
      }

      // Update Resolution Pills
      if (resPill32 && resPill64) {
        if (currentResolution === 32) {
          resPill32.classList.add('active');
          resPill64.classList.remove('active');
        } else {
          resPill64.classList.add('active');
          resPill32.classList.remove('active');
        }
      }

      // Render Canvas
      const scale = currentResolution === 32 ? 14 : 7; // ~440px
      renderIdToCanvas(currentId, artworkCanvas, { scale });

      // Update Top Bar & Placard
      updateTopBarAndPlacard(spec);

      // Update URL without reload
      const newUrl = `${window.location.pathname}?id=${encodeURIComponent(currentId)}&num=${currentExhibitNumber}`;
      window.history.replaceState({ id: currentId, num: currentExhibitNumber }, '', newUrl);

      return true;
    }

    function updateTopBarAndPlacard(spec) {
      if (!spec && currentResolution) {
        spec = RESOLUTIONS[currentResolution];
      }
      if (!spec) return;

      const formattedNum = Catalog.formatExhibitNumber(currentExhibitNumber);
      if (exhibitNum) exhibitNum.textContent = formattedNum;
      if (exhibitShortId) {
        exhibitShortId.textContent = `ID: ${currentId.slice(0, 14)}...${currentId.slice(-8)}`;
        exhibitShortId.title = t('toast_copied');
      }

      // Update Placard
      if (placardSector) placardSector.textContent = `${currentResolution}×${currentResolution} RGBA (${spec.name})`;
      if (placardBytes) placardBytes.textContent = `${spec.totalBytes.toLocaleString()} Bytes`;
      if (placardProb) placardProb.innerHTML = `1 / 2<sup>${spec.totalBits.toLocaleString()}</sup>`;
      if (placardFullId) placardFullId.textContent = currentId;
    }

    // Step by Delta (+1, -1, +10, -10) with full boundary verification
    function stepBy(delta) {
      if (!currentId) return;

      const nextNum = currentExhibitNumber + delta;

      // Lower boundary check: exhibit number cannot go below 1
      if (nextNum < 1) {
        showToast(t('toast_boundary_min') || 'Достигнута граница галереи: номер не может быть меньше 1', 'error');
        return;
      }

      try {
        const nextId = stepAddress(currentId, delta);
        loadExhibit(nextId, nextNum);
      } catch (err) {
        showToast('Ошибка при переходе: ' + err.message, 'error');
      }
    }

    // Load Cat Portrait Exhibit helper
    function loadCatPortrait(catKey) {
      const catData = (window.CAT_EXHIBITS && window.CAT_EXHIBITS[catKey]) || null;
      if (!catData) {
        showToast('Cat exhibit data not found.', 'error');
        return;
      }

      const id = currentResolution === 64 ? catData.id_64 : catData.id_32;
      const catName = getLanguage() === 'ru' ? catData.name_ru : catData.name_en;
      const targetNum = (catKey === 'musya') ? (currentResolution === 64 ? 3 : 1) : (currentResolution === 64 ? 4 : 2);
      loadExhibit(id, targetNum);
      showToast(`${t('toast_cat_loaded')}: ${catName} (${currentResolution}×${currentResolution}) 🐾`, 'success');
    }

    // Attach Cat Button Handlers
    if (musyaCrestBtn) {
      musyaCrestBtn.addEventListener('click', () => loadCatPortrait('musya'));
    }
    if (ketiCrestBtn) {
      ketiCrestBtn.addEventListener('click', () => loadCatPortrait('keti'));
    }
    if (loadMusyaBtn) {
      loadMusyaBtn.addEventListener('click', () => loadCatPortrait('musya'));
    }
    if (loadKetiBtn) {
      loadKetiBtn.addEventListener('click', () => loadCatPortrait('keti'));
    }

    // Traversal Handlers: -10, Prev (-1), Random, Next (+1), +10
    if (stepMinus10) {
      stepMinus10.addEventListener('click', () => stepBy(-10));
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', () => stepBy(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => stepBy(1));
    }
    if (stepPlus10) {
      stepPlus10.addEventListener('click', () => stepBy(10));
    }

    // Traversal: Random (🎲)
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        const randId = generateRandomId(currentResolution, true);
        const randNum = addressToExhibitNumber(randId);
        loadExhibit(randId, randNum);
        showToast(`${t('toast_random_gen')} ${currentResolution}×${currentResolution}`, 'info');
      });
    }

    // Save to Catalog Button
    if (saveToCatalogBtn) {
      saveToCatalogBtn.addEventListener('click', () => {
        if (!currentId) return;

        const existing = Catalog.findById(currentId);
        if (existing) {
          showToast(`Этот экспонат уже сохранён в каталоге под номером ${Catalog.formatExhibitNumber(existing.number)}`, 'info');
          return;
        }

        const saved = Catalog.saveExhibit({
          id: currentId,
          resolution: currentResolution,
          number: currentExhibitNumber,
          title_ru: `Экспонат ${Catalog.formatExhibitNumber(currentExhibitNumber)}`,
          title_en: `Exhibit ${Catalog.formatExhibitNumber(currentExhibitNumber)}`
        });

        showToast(`${t('toast_saved_catalog') || 'Экспонат сохранён в каталоге с номером'} ${Catalog.formatExhibitNumber(saved.number)} ⭐`, 'success');
      });
    }

    // Resolution Sector Switchers
    if (resPill32 && resPill64) {
      resPill32.addEventListener('click', () => {
        if (currentResolution !== 32) {
          const randId = generateRandomId(32, true);
          loadExhibit(randId, 1);
          showToast('Сектор переключён на 32×32 (Standard)', 'info');
        }
      });

      resPill64.addEventListener('click', () => {
        if (currentResolution !== 64) {
          const randId = generateRandomId(64, true);
          loadExhibit(randId, 3);
          showToast('Сектор переключён на 64×64 (Enhanced)', 'info');
        }
      });
    }

    // Copy ID actions
    if (topCopyBtn) {
      topCopyBtn.addEventListener('click', () => {
        if (currentId) copyFullAddress(currentId);
      });
    }
    if (exhibitShortId) {
      exhibitShortId.addEventListener('click', () => {
        if (currentId) copyFullAddress(currentId);
      });
    }
    if (placardCopyBtn) {
      placardCopyBtn.addEventListener('click', () => {
        if (currentId) copyFullAddress(currentId);
      });
    }

    // Download Artwork
    if (topDownloadBtn) {
      topDownloadBtn.addEventListener('click', () => {
        if (currentId) {
          const scale = currentResolution === 32 ? 16 : 8; // 512px
          downloadIdAsPng(currentId, scale, `musya_keti_exhibit_${currentResolution}x${currentResolution}_${currentId.slice(0, 10)}.png`);
          showToast('Скачано 512×512 HD изображение экспоната', 'success');
        }
      });
    }

    // Share direct link
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (currentId) {
          copyFullAddress(window.location.href, t('toast_link_copied'));
        }
      });
    }

    // Keyboard Shortcuts: Left (Prev), Right (Next), Space / R (Random)
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

    // Re-render strings when language changes
    window.addEventListener('languageChanged', () => {
      if (currentId) {
        updateTopBarAndPlacard();
      }
    });

    // =========================================
    // MODAL 1: SEARCH EXHIBIT (BY SHORT NUMBER & BY FULL ID)
    // =========================================
    function openJumpModal() {
      if (jumpModal) {
        jumpModal.classList.add('active');
        if (jumpErrorBox) jumpErrorBox.style.display = 'none';
        if (searchNumInput) {
          searchNumInput.value = '';
          setTimeout(() => searchNumInput.focus(), 100);
        }
      }
    }

    function closeJumpModal() {
      if (jumpModal) jumpModal.classList.remove('active');
    }

    if (jumpModalBtn) jumpModalBtn.addEventListener('click', openJumpModal);
    if (jumpCloseBtn) jumpCloseBtn.addEventListener('click', closeJumpModal);
    if (jumpModal) {
      jumpModal.addEventListener('click', (e) => {
        if (e.target === jumpModal) closeJumpModal();
      });
    }

    // Search Tabs: By Short Number vs By Full ID
    if (searchTabNumBtn && searchTabIdBtn && searchTabNumPane && searchTabIdPane) {
      searchTabNumBtn.addEventListener('click', () => {
        searchTabNumBtn.classList.add('active');
        searchTabIdBtn.classList.remove('active');
        searchTabNumPane.style.display = 'block';
        searchTabIdPane.style.display = 'none';
        if (jumpErrorBox) jumpErrorBox.style.display = 'none';
        setTimeout(() => searchNumInput && searchNumInput.focus(), 50);
      });

      searchTabIdBtn.addEventListener('click', () => {
        searchTabIdBtn.classList.add('active');
        searchTabNumBtn.classList.remove('active');
        searchTabIdPane.style.display = 'block';
        searchTabNumPane.style.display = 'none';
        if (jumpErrorBox) jumpErrorBox.style.display = 'none';
        setTimeout(() => jumpInput && jumpInput.focus(), 50);
      });
    }

    // Execute Search By Short Number (e.g. EXHIBIT #000000001)
    if (searchNumExecuteBtn && searchNumInput) {
      const executeSearchByNum = () => {
        const val = searchNumInput.value.trim();
        if (!val) {
          showToast('Введите номер сохранённого экспоната (например, EXHIBIT #000000001).', 'error');
          return;
        }

        const entry = Catalog.findByNumber(val);
        if (entry && entry.id) {
          loadExhibit(entry.id, entry.number);
          closeJumpModal();
          showToast(`Экспонат ${Catalog.formatExhibitNumber(entry.number)} найден в каталоге!`, 'success');
        } else {
          const parsed = Catalog.parseExhibitNumber(val);
          const formatted = parsed ? Catalog.formatExhibitNumber(parsed) : val;
          if (jumpErrorBox) {
            jumpErrorBox.style.display = 'flex';
            jumpErrorBox.innerHTML = `<span>✕</span><div>Экспонат с номером <strong>${escapeHtml(formatted)}</strong> не найден в каталоге сохранённых экспонатов. В каталоге содержатся зарегистрированные шедевры музея.</div>`;
          }
        }
      };

      searchNumExecuteBtn.addEventListener('click', executeSearchByNum);
      searchNumInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeSearchByNum();
        }
      });
    }

    // Execute Search By Full ID
    if (jumpExecuteBtn && jumpInput) {
      const executeSearchById = () => {
        const val = jumpInput.value.trim();
        if (!val) {
          showToast('Пожалуйста, введите полный адрес экспоната.', 'error');
          return;
        }

        // If user accidentally entered a short number in the ID box
        const asNum = Catalog.parseExhibitNumber(val);
        if (asNum && val.length < 50) {
          const entry = Catalog.findByNumber(asNum);
          if (entry && entry.id) {
            loadExhibit(entry.id, entry.number);
            closeJumpModal();
            showToast(`Экспонат ${Catalog.formatExhibitNumber(entry.number)} найден в каталоге!`, 'success');
            return;
          }
        }

        const success = loadExhibit(val);
        if (success) {
          closeJumpModal();
          showToast('Экспонат материализован по заданному адресу!', 'success');
        } else {
          const validation = validateId(val);
          if (jumpErrorBox) {
            jumpErrorBox.style.display = 'flex';
            jumpErrorBox.innerHTML = `<span>✕</span><div>${escapeHtml(validation.error)}</div>`;
          }
        }
      };

      jumpExecuteBtn.addEventListener('click', executeSearchById);
    }

    // =========================================
    // MODAL 2: LOCATE PHOTO IN ARCHIVE
    // =========================================
    function openPhotoModal() {
      if (photoModal) {
        photoModal.classList.add('active');
        selectedPhotoFile = null;
        if (photoPreviewStrip) photoPreviewStrip.style.display = 'none';
        if (photoCalculateBtn) photoCalculateBtn.style.display = 'none';
        if (photoDownscaleWarning) photoDownscaleWarning.style.display = 'none';
      }
    }

    function closePhotoModal() {
      if (photoModal) photoModal.classList.remove('active');
    }

    if (photoModalBtn) photoModalBtn.addEventListener('click', openPhotoModal);
    if (photoCloseBtn) photoCloseBtn.addEventListener('click', closePhotoModal);
    if (photoModal) {
      photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) closePhotoModal();
      });
    }

    if (photoDropzone && photoFileInput) {
      photoDropzone.addEventListener('click', () => photoFileInput.click());

      ['dragenter', 'dragover'].forEach(name => {
        photoDropzone.addEventListener(name, (e) => {
          e.preventDefault();
          photoDropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        photoDropzone.addEventListener(name, (e) => {
          e.preventDefault();
          photoDropzone.classList.remove('dragover');
        });
      });

      photoDropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files[0]) stagePhoto(files[0]);
      });

      photoFileInput.addEventListener('change', () => {
        if (photoFileInput.files && photoFileInput.files[0]) stagePhoto(photoFileInput.files[0]);
      });
    }

    function stagePhoto(file) {
      if (!file.type.startsWith('image/')) {
        showToast('Пожалуйста, выберите файл изображения.', 'error');
        return;
      }
      selectedPhotoFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        if (photoThumb) photoThumb.src = e.target.result;
        if (photoFileName) photoFileName.textContent = file.name;
        if (photoPreviewStrip) photoPreviewStrip.style.display = 'flex';
      };
      reader.readAsDataURL(file);

      if (photoDownscaleWarning) {
        photoDownscaleWarning.style.display = 'flex';
        photoDownscaleWarning.innerHTML = `<span>⚠️</span><div>${escapeHtml(t('modal_locate_warn'))}</div>`;
      }
      if (photoCalculateBtn) photoCalculateBtn.style.display = 'inline-flex';
    }

    if (photoCalculateBtn) {
      photoCalculateBtn.addEventListener('click', async () => {
        if (!selectedPhotoFile) return;

        const targetRes = (photoResToggle && photoResToggle.value === '64') ? 64 : 32;

        try {
          showToast(`Вычисление адреса в секторе ${targetRes}×${targetRes}...`, 'info');
          const res = await encodeImageSource(selectedPhotoFile, {
            resolution: targetRes,
            fit: 'cover',
            usePermutation: true
          });

          // Automatically catalog newly located photo
          const saved = Catalog.saveExhibit({
            id: res.id,
            resolution: targetRes,
            title_ru: `Фото: ${selectedPhotoFile.name.slice(0, 24)}`,
            title_en: `Photo: ${selectedPhotoFile.name.slice(0, 24)}`
          });

          loadExhibit(res.id, saved.number);
          closePhotoModal();
          showToast(`${t('toast_address_calc')} (${targetRes}×${targetRes}) [${Catalog.formatExhibitNumber(saved.number)}]`, 'success');
        } catch (err) {
          showToast('Ошибка кодирования: ' + err.message, 'error');
        }
      });
    }

    // Initial Load: URL query ?id=...&num=... or Musya's portrait or Random 32x32
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

  // --- EXPLORE & CATALOG PAGE CONTROLLER (explore.html) ---
  function initExploreGallery() {
    const catalogGrid = document.getElementById('catalogGrid');
    const galleryGrid = document.getElementById('galleryGrid');
    if (!catalogGrid && !galleryGrid) return;

    // View tabs: Catalog vs Random
    const tabCatalogBtn = document.getElementById('tabCatalogBtn');
    const tabRandomBtn = document.getElementById('tabRandomBtn');
    const catalogSection = document.getElementById('catalogSection');
    const randomSection = document.getElementById('randomSection');

    // Catalog controls
    const catalogSearchInput = document.getElementById('catalogSearchInput');
    const catFilterAll = document.getElementById('catFilterAll');
    const catFilter32 = document.getElementById('catFilter32');
    const catFilter64 = document.getElementById('catFilter64');
    let activeCatalogFilter = 'all';

    // Random generator controls
    const res32Btn = document.getElementById('exploreRes32Btn');
    const res64Btn = document.getElementById('exploreRes64Btn');
    const generateBtn = document.getElementById('exploreGenerateBtn');
    const loadMoreBtn = document.getElementById('exploreLoadMoreBtn');
    let exploreRes = 32;

    // Tab switching between Catalog & Random
    if (tabCatalogBtn && tabRandomBtn && catalogSection && randomSection) {
      tabCatalogBtn.addEventListener('click', () => {
        tabCatalogBtn.classList.add('active');
        tabRandomBtn.classList.remove('active');
        catalogSection.style.display = 'block';
        randomSection.style.display = 'none';
        renderCatalog();
      });

      tabRandomBtn.addEventListener('click', () => {
        tabRandomBtn.classList.add('active');
        tabCatalogBtn.classList.remove('active');
        randomSection.style.display = 'block';
        catalogSection.style.display = 'none';
        if (galleryGrid && galleryGrid.children.length === 0) {
          renderRandomBatch(12, false);
        }
      });
    }

    // 1. RENDER SAVED EXHIBITS CATALOG
    function renderCatalog() {
      if (!catalogGrid) return;
      catalogGrid.innerHTML = '';

      const all = Catalog.getAllExhibits();
      const query = (catalogSearchInput ? catalogSearchInput.value.trim().toLowerCase() : '');

      const filtered = all.filter(ex => {
        // Filter by resolution
        if (activeCatalogFilter === '32' && ex.resolution !== 32) return false;
        if (activeCatalogFilter === '64' && ex.resolution !== 64) return false;

        // Filter by search query (matches number or title)
        if (query) {
          const numStr = Catalog.formatExhibitNumber(ex.number).toLowerCase();
          const rawNum = String(ex.number);
          const titleRu = (ex.title_ru || '').toLowerCase();
          const titleEn = (ex.title_en || '').toLowerCase();
          const matches = numStr.includes(query) || rawNum.includes(query) || titleRu.includes(query) || titleEn.includes(query);
          if (!matches) return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        catalogGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🐾</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-muted);">Экспонаты не найдены</div>
            <div style="font-size: 0.75rem; margin-top: 0.25rem;">Попробуйте изменить запрос или сохраните новые экспонаты из Галереи.</div>
          </div>
        `;
        return;
      }

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'explore-card';

        const wrap = document.createElement('div');
        wrap.className = 'explore-canvas-wrap';

        const canvas = document.createElement('canvas');
        canvas.className = 'explore-canvas';
        const scale = item.resolution === 32 ? 5.5 : 2.8;
        renderIdToCanvas(item.id, canvas, { scale });
        wrap.appendChild(canvas);

        const info = document.createElement('div');
        info.className = 'explore-card-info';

        const title = document.createElement('div');
        title.style.fontFamily = 'var(--font-mono)';
        title.style.fontSize = '0.75rem';
        title.style.fontWeight = '800';
        title.style.color = 'var(--accent-gold)';
        title.textContent = Catalog.formatExhibitNumber(item.number);

        const subtitle = document.createElement('div');
        subtitle.style.fontSize = '0.8125rem';
        subtitle.style.fontWeight = '600';
        subtitle.style.color = '#fff';
        subtitle.style.marginTop = '2px';
        subtitle.style.whiteSpace = 'nowrap';
        subtitle.style.overflow = 'hidden';
        subtitle.style.textOverflow = 'ellipsis';
        subtitle.textContent = (getLanguage() === 'ru' ? item.title_ru : item.title_en) || `Экспонат #${item.number}`;

        const shortId = document.createElement('div');
        shortId.style.fontFamily = 'var(--font-mono)';
        shortId.style.fontSize = '0.625rem';
        shortId.style.color = 'var(--text-muted)';
        shortId.style.whiteSpace = 'nowrap';
        shortId.style.overflow = 'hidden';
        shortId.style.textOverflow = 'ellipsis';
        shortId.style.marginTop = '2px';
        shortId.textContent = `${item.resolution}×${item.resolution} • ${item.id.slice(0, 16)}...`;

        const actions = document.createElement('div');
        actions.className = 'explore-card-actions';

        const viewBtn = document.createElement('a');
        viewBtn.className = 'btn btn-secondary btn-sm';
        viewBtn.href = `index.html?id=${encodeURIComponent(item.id)}&num=${item.number}`;
        viewBtn.textContent = 'ОСМОТРЕТЬ В ГАЛЕРЕЕ';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-primary btn-sm';
        copyBtn.textContent = 'COPY ID';
        copyBtn.addEventListener('click', () => {
          copyFullAddress(item.id);
        });

        actions.appendChild(viewBtn);
        actions.appendChild(copyBtn);

        info.appendChild(title);
        info.appendChild(subtitle);
        info.appendChild(shortId);
        info.appendChild(actions);

        card.appendChild(wrap);
        card.appendChild(info);

        catalogGrid.appendChild(card);
      });
    }

    // Catalog Filter Listeners
    if (catFilterAll && catFilter32 && catFilter64) {
      catFilterAll.addEventListener('click', () => {
        activeCatalogFilter = 'all';
        catFilterAll.classList.add('active');
        catFilter32.classList.remove('active');
        catFilter64.classList.remove('active');
        renderCatalog();
      });
      catFilter32.addEventListener('click', () => {
        activeCatalogFilter = '32';
        catFilter32.classList.add('active');
        catFilterAll.classList.remove('active');
        catFilter64.classList.remove('active');
        renderCatalog();
      });
      catFilter64.addEventListener('click', () => {
        activeCatalogFilter = '64';
        catFilter64.classList.add('active');
        catFilterAll.classList.remove('active');
        catFilter32.classList.remove('active');
        renderCatalog();
      });
    }

    if (catalogSearchInput) {
      catalogSearchInput.addEventListener('input', () => renderCatalog());
    }

    // 2. RENDER RANDOM EXHIBITS BATCH
    function renderRandomBatch(count = 12, append = false) {
      if (!galleryGrid) return;
      if (!append) galleryGrid.innerHTML = '';

      const batch = generateBatch(count, exploreRes, true);

      batch.forEach(item => {
        const card = document.createElement('div');
        card.className = 'explore-card';

        const wrap = document.createElement('div');
        wrap.className = 'explore-canvas-wrap';

        const canvas = document.createElement('canvas');
        canvas.className = 'explore-canvas';
        const scale = exploreRes === 32 ? 5.5 : 2.8;
        renderIdToCanvas(item.id, canvas, { scale });
        wrap.appendChild(canvas);

        const info = document.createElement('div');
        info.className = 'explore-card-info';

        const num = addressToExhibitNumber(item.id);
        const title = document.createElement('div');
        title.style.fontFamily = 'var(--font-mono)';
        title.style.fontSize = '0.75rem';
        title.style.fontWeight = '700';
        title.textContent = `${Catalog.formatExhibitNumber(num)} (${exploreRes}×${exploreRes})`;

        const shortId = document.createElement('div');
        shortId.style.fontFamily = 'var(--font-mono)';
        shortId.style.fontSize = '0.625rem';
        shortId.style.color = 'var(--text-muted)';
        shortId.style.whiteSpace = 'nowrap';
        shortId.style.overflow = 'hidden';
        shortId.style.textOverflow = 'ellipsis';
        shortId.textContent = item.id;

        const actions = document.createElement('div');
        actions.className = 'explore-card-actions';

        const viewBtn = document.createElement('a');
        viewBtn.className = 'btn btn-secondary btn-sm';
        viewBtn.href = `index.html?id=${encodeURIComponent(item.id)}&num=${num}`;
        viewBtn.textContent = 'ОСМОТРЕТЬ';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-sm';
        saveBtn.textContent = '⭐ В КАТАЛОГ';
        saveBtn.addEventListener('click', () => {
          const saved = Catalog.saveExhibit({
            id: item.id,
            resolution: exploreRes,
            number: num,
            title_ru: `Случайный экспонат #${num}`,
            title_en: `Random Exhibit #${num}`
          });
          showToast(`Экспонат ${Catalog.formatExhibitNumber(saved.number)} добавлен в каталог!`, 'success');
        });

        actions.appendChild(viewBtn);
        actions.appendChild(saveBtn);

        info.appendChild(title);
        info.appendChild(shortId);
        info.appendChild(actions);

        card.appendChild(wrap);
        card.appendChild(info);

        galleryGrid.appendChild(card);
      });
    }

    if (res32Btn && res64Btn) {
      res32Btn.addEventListener('click', () => {
        exploreRes = 32;
        res32Btn.classList.add('active');
        res64Btn.classList.remove('active');
        renderRandomBatch(12, false);
      });

      res64Btn.addEventListener('click', () => {
        exploreRes = 64;
        res64Btn.classList.add('active');
        res32Btn.classList.remove('active');
        renderRandomBatch(12, false);
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        renderRandomBatch(12, false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Материализовано 12 новых экспонатов (${exploreRes}×${exploreRes})`, 'info');
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        renderRandomBatch(12, true);
        showToast(`Добавлено ещё 12 экспонатов (${exploreRes}×${exploreRes})`, 'info');
      });
    }

    // Default start: render catalog first
    renderCatalog();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMuseumApp();
    initExploreGallery();
  });

  window.InfiniteGalleryApp = {
    showToast,
    copyFullAddress
  };
})();
