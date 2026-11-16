document.addEventListener('DOMContentLoaded', () => {
  const MAX_FILES = (window.APP_CONFIG && window.APP_CONFIG.maxFiles) || 10;
  const MAX_TOTAL_MB = (window.APP_CONFIG && window.APP_CONFIG.maxTotalMb) || 15;
  const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;

  let selectedFiles = [];
  let latestResultData = null;
  let stepTimers = [];

  // Elemen Status Peladen
  const statusBadge = document.getElementById('server-status-badge');
  const statusDot = document.getElementById('server-status-dot');
  const statusText = document.getElementById('server-status-text');

  // Elemen Bagian Utama
  const uploadSection = document.getElementById('upload-section');
  const loadingSection = document.getElementById('loading-section');
  const errorSection = document.getElementById('error-section');
  const resultsSection = document.getElementById('results-section');

  // Elemen Unggah & Validasi
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnSample = document.getElementById('btn-sample');
  const clientAlert = document.getElementById('client-alert');
  const fileListContainer = document.getElementById('file-list-container');
  const fileListEl = document.getElementById('file-list');
  const fileCountInfo = document.getElementById('file-count-info');
  const totalSizeInfo = document.getElementById('total-size-info');
  const btnClearFiles = document.getElementById('btn-clear-files');
  const privacyConsent = document.getElementById('privacy-consent');
  const btnAnalyze = document.getElementById('btn-analyze');

  // Elemen Galat & Hasil
  const errorMessageEl = document.getElementById('error-message');
  const errorCodeEl = document.getElementById('error-code');
  const btnResetError = document.getElementById('btn-reset-error');
  const metaInfoEl = document.getElementById('meta-info');
  const matrixTbody = document.getElementById('matrix-tbody');
  const gapPreviewSnippetEl = document.getElementById('gap-preview-snippet');
  const btnGotoGap = document.getElementById('btn-goto-gap');
  const paragrafGapEl = document.getElementById('paragraf-gap');
  const gapListEl = document.getElementById('gap-list');
  const judulListEl = document.getElementById('judul-list');
  const catatanVerifikasiEl = document.getElementById('catatan-verifikasi');
  const btnCopy = document.getElementById('btn-copy');
  const btnPrint = document.getElementById('btn-print');
  const btnNewAnalysis = document.getElementById('btn-new-analysis');
  const printDateEl = document.getElementById('print-date');
  const tabButtons = document.querySelectorAll('.result-tab-btn');
  const tabPanels = document.querySelectorAll('.result-tab-panel');

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function showClientAlert(message) {
    clientAlert.textContent = message;
    clientAlert.classList.remove('hidden');
  }

  function hideClientAlert() {
    clientAlert.textContent = '';
    clientAlert.classList.add('hidden');
  }

  function switchView(viewName) {
    uploadSection.classList.add('hidden');
    loadingSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    resultsSection.classList.add('hidden');

    if (viewName === 'upload') uploadSection.classList.remove('hidden');
    if (viewName === 'loading') loadingSection.classList.remove('hidden');
    if (viewName === 'error') errorSection.classList.remove('hidden');
    if (viewName === 'results') resultsSection.classList.remove('hidden');
  }

  function switchResultTab(tabName) {
    tabButtons.forEach((btn) => {
      const isMatch = btn.dataset.tab === tabName;
      if (isMatch) {
        btn.className =
          'result-tab-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-semibold bg-[#EEF0FF] text-[#4F46E5] transition cursor-pointer';
      } else {
        btn.className =
          'result-tab-btn w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer';
      }
    });

    tabPanels.forEach((panel) => {
      if (panel.id === `tab-${tabName}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });
  }

  async function checkServerStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();

      if (response.ok && data.success) {
        statusBadge.className =
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200';
        statusDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        statusText.textContent = `Peladen Aktif (Antrean: ${data.antrean_aktif}/${data.maks_antrean})`;
      } else {
        throw new Error('Status tidak valid');
      }
    } catch (err) {
      statusBadge.className =
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200';
      statusDot.className = 'w-2 h-2 rounded-full bg-rose-500';
      statusText.textContent = 'Peladen Tidak Terhubung';
    }
  }

  function updateAnalyzeButtonState() {
    const isReady = selectedFiles.length > 0 && privacyConsent.checked;
    btnAnalyze.disabled = !isReady;
  }

  function renderFileList() {
    fileListEl.innerHTML = '';

    if (selectedFiles.length === 0) {
      fileListContainer.classList.add('hidden');
      updateAnalyzeButtonState();
      return;
    }

    fileListContainer.classList.remove('hidden');

    let totalBytes = 0;
    selectedFiles.forEach((file, index) => {
      totalBytes += file.size;

      const li = document.createElement('li');
      li.className = 'flex items-center justify-between gap-3 px-4 py-2.5 text-xs sm:text-sm hover:bg-white';

      const infoWrap = document.createElement('div');
      infoWrap.className = 'min-w-0 flex-1 flex items-center gap-2.5';

      const badge = document.createElement('span');
      badge.className = 'px-1.5 py-0.5 rounded bg-indigo-50 text-[#5B5CE6] font-mono text-[10px] font-bold shrink-0';
      badge.textContent = 'PDF';

      const nameEl = document.createElement('span');
      nameEl.className = 'font-medium text-slate-800 truncate';
      nameEl.textContent = file.name;

      const sizeEl = document.createElement('span');
      sizeEl.className = 'text-xs text-slate-400 shrink-0';
      sizeEl.textContent = `(${formatBytes(file.size)})`;

      infoWrap.appendChild(badge);
      infoWrap.appendChild(nameEl);
      infoWrap.appendChild(sizeEl);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className =
        'text-xs font-semibold text-rose-600 hover:text-rose-800 px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0';
      removeBtn.textContent = 'Hapus';
      removeBtn.addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        hideClientAlert();
        renderFileList();
      });

      li.appendChild(infoWrap);
      li.appendChild(removeBtn);
      fileListEl.appendChild(li);
    });

    fileCountInfo.textContent = `${selectedFiles.length} dari ${MAX_FILES} dokumen dipilih`;
    totalSizeInfo.textContent = `Total: ${formatBytes(totalBytes)} / ${MAX_TOTAL_MB} MB`;
    updateAnalyzeButtonState();
  }

  function addIncomingFiles(fileList) {
    hideClientAlert();
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const errors = [];
    let currentBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);

    for (const file of incoming) {
      const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
      const isPdfMime = file.type === 'application/pdf' || file.type === '';

      if (!isPdfExt || !isPdfMime) {
        errors.push(`"${file.name}" ditolak karena bukan berkas PDF.`);
        continue;
      }

      if (file.size === 0) {
        errors.push(`"${file.name}" kosong (0 byte).`);
        continue;
      }

      const isDuplicate = selectedFiles.some(
        (existing) => existing.name === file.name && existing.size === file.size
      );
      if (isDuplicate) continue;

      if (selectedFiles.length >= MAX_FILES) {
        errors.push(`Maksimal hanya ${MAX_FILES} berkas PDF yang diperbolehkan.`);
        break;
      }

      if (currentBytes + file.size > MAX_TOTAL_BYTES) {
        errors.push(`Total ukuran seluruh berkas tidak boleh melebihi ${MAX_TOTAL_MB} MB.`);
        break;
      }

      selectedFiles.push(file);
      currentBytes += file.size;
    }

    if (errors.length > 0) {
      showClientAlert(errors[0]);
    }

    renderFileList();
  }

  function startProgressAnimation() {
    clearProgressTimers();
    const steps = ['step-1', 'step-2', 'step-3', 'step-4'].map((id) =>
      document.getElementById(id)
    );

    const setActiveStep = (activeIndex) => {
      steps.forEach((stepEl, idx) => {
        const iconEl = stepEl.querySelector('.step-icon');
        if (idx < activeIndex) {
          stepEl.className = 'flex items-center gap-3.5 text-sm font-medium text-slate-700';
          iconEl.className =
            'step-icon w-6 h-6 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center text-[11px] font-bold shrink-0 ring-4 ring-white';
          iconEl.innerHTML = '&#10003;';
        } else if (idx === activeIndex) {
          stepEl.className = 'flex items-center gap-3.5 text-sm font-semibold text-[#111827]';
          iconEl.className =
            'step-icon w-6 h-6 rounded-full bg-indigo-100 text-[#5B5CE6] inline-flex items-center justify-center text-[10px] font-bold animate-pulse shrink-0 ring-4 ring-white';
          iconEl.innerHTML = '&#9679;';
        } else {
          stepEl.className = 'flex items-center gap-3.5 text-sm text-slate-400';
          iconEl.className =
            'step-icon w-6 h-6 rounded-full bg-slate-100 inline-flex items-center justify-center text-xs shrink-0 ring-4 ring-white';
          iconEl.innerHTML = '';
        }
      });
    };

    setActiveStep(0);
    stepTimers.push(setTimeout(() => setActiveStep(1), 2500));
    stepTimers.push(setTimeout(() => setActiveStep(2), 7000));
    stepTimers.push(setTimeout(() => setActiveStep(3), 14000));
  }

  function clearProgressTimers() {
    stepTimers.forEach((timerId) => clearTimeout(timerId));
    stepTimers = [];
  }

  function renderAnalysisResults(payload) {
    latestResultData = payload;
    const { data, meta, catatan_verifikasi } = payload;

    const durasiDetik = meta && meta.durasi_ms ? (meta.durasi_ms / 1000).toFixed(1) : '0';
    const jumlahFile = meta && meta.jumlah_file ? meta.jumlah_file : data.ringkasan_dokumen.length;
    metaInfoEl.textContent = `${jumlahFile} jurnal disintesis dalam ${durasiDetik} detik`;

    // 1. Render Tabel Ringkasan Literatur
    matrixTbody.innerHTML = '';
    data.ringkasan_dokumen.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = 'align-top hover:bg-slate-50/70';

      const noTd = document.createElement('td');
      noTd.className = 'py-3.5 px-4 text-center font-medium text-slate-500';
      noTd.textContent = `${index + 1}`;
      tr.appendChild(noTd);

      const titleTd = document.createElement('td');
      titleTd.className = 'py-3.5 px-4 space-y-1';
      const topicEl = document.createElement('p');
      topicEl.className = 'font-semibold text-[#111827] leading-snug';
      topicEl.textContent = item.topik;
      const fileTag = document.createElement('p');
      fileTag.className = 'text-[11px] font-mono text-slate-400 break-all';
      fileTag.textContent = item.nama_file;
      titleTd.appendChild(topicEl);
      titleTd.appendChild(fileTag);
      tr.appendChild(titleTd);

      const otherCells = [
        { text: item.metode, className: 'py-3.5 px-4 text-slate-600' },
        { text: item.temuan_utama, className: 'py-3.5 px-4 text-slate-600' },
        { text: item.keterbatasan, className: 'py-3.5 px-4 text-slate-600' },
      ];

      otherCells.forEach((cell) => {
        const td = document.createElement('td');
        td.className = cell.className;
        td.textContent = cell.text;
        tr.appendChild(td);
      });

      matrixTbody.appendChild(tr);
    });

    // Isi Pratinjau Research Gap di Tab Pertama
    if (data.research_gap && data.research_gap.length > 0) {
      gapPreviewSnippetEl.textContent = data.research_gap[0].gap;
    } else {
      gapPreviewSnippetEl.textContent = data.paragraf_research_gap;
    }

    // 2. Render Kartu Peta Research Gap
    gapListEl.innerHTML = '';
    data.research_gap.forEach((gapItem, idx) => {
      const card = document.createElement('div');
      card.className =
        'print-card bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4';

      const topWrap = document.createElement('div');
      topWrap.className = 'space-y-2';

      const badge = document.createElement('span');
      badge.className =
        'inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#EEF0FF] text-[#4F46E5]';
      badge.textContent = `Celah #${idx + 1}`;

      const gapTitle = document.createElement('h4');
      gapTitle.className = 'text-base font-bold text-[#111827] leading-snug';
      gapTitle.textContent = gapItem.gap;

      const reason = document.createElement('p');
      reason.className = 'text-xs sm:text-sm text-slate-600 leading-relaxed';
      reason.textContent = gapItem.alasan;

      topWrap.appendChild(badge);
      topWrap.appendChild(gapTitle);
      topWrap.appendChild(reason);

      const sourceWrap = document.createElement('div');
      sourceWrap.className = 'pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5';

      const sourceLabel = document.createElement('span');
      sourceLabel.className = 'text-xs font-semibold text-slate-500 mr-1';
      sourceLabel.textContent = 'Sumber:';
      sourceWrap.appendChild(sourceLabel);

      (gapItem.sumber || []).forEach((srcName) => {
        const tag = document.createElement('span');
        tag.className =
          'px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono break-all';
        tag.textContent = srcName;
        sourceWrap.appendChild(tag);
      });

      card.appendChild(topWrap);
      card.appendChild(sourceWrap);
      gapListEl.appendChild(card);
    });

    // 3. Render Paragraf Sintesis Research Gap
    paragrafGapEl.textContent = data.paragraf_research_gap;

    // 4. Render Rekomendasi Judul
    judulListEl.innerHTML = '';
    data.rekomendasi_judul.forEach((judulItem, idx) => {
      const card = document.createElement('div');
      card.className =
        'print-card bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-3';

      const header = document.createElement('div');
      header.className = 'flex items-start gap-3';

      const numBadge = document.createElement('span');
      numBadge.className =
        'w-7 h-7 rounded-lg bg-[#111827] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5';
      numBadge.textContent = `${idx + 1}`;

      const titleEl = document.createElement('h4');
      titleEl.className = 'font-serif text-lg sm:text-xl font-bold text-[#111827] leading-snug';
      titleEl.textContent = judulItem.judul;

      header.appendChild(numBadge);
      header.appendChild(titleEl);

      const kebaruanEl = document.createElement('p');
      kebaruanEl.className = 'text-xs sm:text-sm text-slate-600 leading-relaxed';
      const kebaruanStrong = document.createElement('strong');
      kebaruanStrong.className = 'text-slate-800';
      kebaruanStrong.textContent = 'Alasan Kebaruan: ';
      kebaruanEl.appendChild(kebaruanStrong);
      kebaruanEl.appendChild(document.createTextNode(judulItem.alasan_kebaruan));

      const metodeEl = document.createElement('p');
      metodeEl.className = 'text-xs sm:text-sm text-slate-600 leading-relaxed';
      const metodeStrong = document.createElement('strong');
      metodeStrong.className = 'text-slate-800';
      metodeStrong.textContent = 'Pendekatan Disarankan: ';
      metodeEl.appendChild(metodeStrong);
      metodeEl.appendChild(document.createTextNode(judulItem.pendekatan_disarankan));

      card.appendChild(header);
      card.appendChild(kebaruanEl);
      card.appendChild(metodeEl);
      judulListEl.appendChild(card);
    });

    catatanVerifikasiEl.textContent = catatan_verifikasi || '';
    switchResultTab('ringkasan');
    switchView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitAnalysis(useSampleMode = false) {
    hideClientAlert();

    if (!privacyConsent.checked) {
      showClientAlert(
        'Silakan centang kotak persetujuan pemrosesan dokumen untuk analisis AI terlebih dahulu.'
      );
      privacyConsent.focus();
      return;
    }

    if (!useSampleMode && selectedFiles.length === 0) {
      showClientAlert('Silakan pilih minimal satu berkas jurnal PDF terlebih dahulu.');
      return;
    }

    const formData = new FormData();
    if (useSampleMode) {
      formData.append('useSample', 'true');
    } else {
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
    }

    switchView('loading');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    startProgressAnimation();

    try {
      const response = await fetch('/api/analisis', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      clearProgressTimers();
      checkServerStatus();

      if (!response.ok || !result.success) {
        errorMessageEl.textContent =
          result.message || 'Gagal memproses dokumen PDF. Silakan coba kembali.';
        errorCodeEl.textContent = result.code ? `Kode Galat: ${result.code}` : '';
        switchView('error');
        return;
      }

      renderAnalysisResults(result);
    } catch (err) {
      clearProgressTimers();
      checkServerStatus();
      errorMessageEl.textContent =
        'Koneksi ke peladen terputus atau waktu permintaan habis. Periksa jaringan Anda lalu coba lagi.';
      errorCodeEl.textContent = 'Kode Galat: KONEKSI_TERPUTUS';
      switchView('error');
    }
  }

  function buildPlainTextReport() {
    if (!latestResultData || !latestResultData.data) return '';
    const { data, catatan_verifikasi } = latestResultData;

    const lines = [
      'LAPORAN SINTESIS LITERATUR & REKOMENDASI JUDUL PENELITIAN (NOVELLITY)',
      '====================================================================',
      '',
      '1. RINGKASAN LITERATUR',
    ];

    data.ringkasan_dokumen.forEach((doc, idx) => {
      lines.push(`${idx + 1}. ${doc.topik} (${doc.nama_file})`);
      lines.push(`   - Metode: ${doc.metode}`);
      lines.push(`   - Temuan Utama: ${doc.temuan_utama}`);
      lines.push(`   - Keterbatasan: ${doc.keterbatasan}`);
    });

    lines.push('', '2. PETA RESEARCH GAP TERIDENTIFIKASI');
    data.research_gap.forEach((g, idx) => {
      lines.push(`${idx + 1}. ${g.gap}`);
      lines.push(`   - Alasan: ${g.alasan}`);
      lines.push(`   - Sumber: ${(g.sumber || []).join(', ')}`);
    });

    lines.push('', '3. SINTESIS RESEARCH GAP', data.paragraf_research_gap, '');
    lines.push('4. REKOMENDASI JUDUL PENELITIAN BARU');

    data.rekomendasi_judul.forEach((j, idx) => {
      lines.push(`${idx + 1}. ${j.judul}`);
      lines.push(`   - Alasan Kebaruan: ${j.alasan_kebaruan}`);
      lines.push(`   - Pendekatan Disarankan: ${j.pendekatan_disarankan}`);
    });

    lines.push('', `Catatan: ${catatan_verifikasi}`);
    return lines.join('\n');
  }

  if (btnGotoGap) btnGotoGap.addEventListener('click', () => switchResultTab('gap'));

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchResultTab(btn.dataset.tab);
    });
  });

  // Event Listeners Dropzone
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    addIncomingFiles(e.target.files);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('border-[#5B5CE6]', 'bg-indigo-50/40');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('border-[#5B5CE6]', 'bg-indigo-50/40');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files) {
      addIncomingFiles(e.dataTransfer.files);
    }
  });

  btnClearFiles.addEventListener('click', () => {
    selectedFiles = [];
    hideClientAlert();
    renderFileList();
  });

  privacyConsent.addEventListener('change', updateAnalyzeButtonState);
  btnAnalyze.addEventListener('click', () => submitAnalysis(false));
  btnSample.addEventListener('click', () => submitAnalysis(true));

  btnResetError.addEventListener('click', () => switchView('upload'));
  btnNewAnalysis.addEventListener('click', () => {
    selectedFiles = [];
    latestResultData = null;
    hideClientAlert();
    renderFileList();
    switchView('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  btnCopy.addEventListener('click', async () => {
    const reportText = buildPlainTextReport();
    if (!reportText) return;

    try {
      await navigator.clipboard.writeText(reportText);
      const labelSpan = btnCopy.querySelector('span');
      const originalText = labelSpan.textContent;
      labelSpan.textContent = 'Tersalin ke Papan Klip!';
      setTimeout(() => {
        labelSpan.textContent = originalText;
      }, 2500);
    } catch (err) {
      alert('Gagal menyalin otomatis. Silakan gunakan tombol Cetak / Simpan PDF.');
    }
  });

  btnPrint.addEventListener('click', () => {
    if (printDateEl) {
      printDateEl.textContent = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    window.print();
  });

  checkServerStatus();
});