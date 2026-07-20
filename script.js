const AUDIO_ACTIVATION_KEY = "venevo-radio-audio-activated";
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
const SUPPORTED_AUDIO_EXTENSIONS = new Set(["mp3", "wav", "aac", "m4a", "ogg"]);
const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/x-aac",
  "audio/ogg",
]);
const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
const PAD_DUCKING_RATIO = 0.32;
const PAD_DUCK_DOWN_MS = 420;
const PAD_RESTORE_MS = 680;
const LOCAL_STARTER_NAME = "ABRIR VENEVO RADIO.bat";
const LOCAL_LIBRARY_META_KEY = "venevo-radio-local-library-meta-v1";
const LOCAL_FOLDER_DB_NAME = "venevo-radio-folder-db";
const LOCAL_FOLDER_STORE_NAME = "folderHandles";
const LOCAL_FOLDER_HANDLE_KEY = "mainMusicFolder";

const state = {
  library: [],
  queue: [],
  history: [],
  autoMode: false,
  nowPlaying: null,
  nowStatus: "Detenido",
  nowError: "",
  activeDeck: 0,
  songsSinceCommercial: 0,
  lastIdAt: 0,
  isFading: false,
  audioActivated: readSessionFlag(AUDIO_ACTIVATION_KEY),
  audioContext: null,
  settings: {
    commercialEvery: 3,
    idEvery: 15,
    crossfadeSeconds: 4,
    artistRepeatMinutes: 60,
  },
  youtube: {
    apiPromise: null,
    player: null,
    readyPromise: null,
    ready: false,
    currentItem: null,
    progressTimer: 0,
    watchdogTimer: 0,
    lastEndedKey: "",
  },
  streamPreview: {
    audio: null,
    url: "",
    status: "Sin conectar.",
  },
  pendingErrorSkip: 0,
  advancingQueue: false,
  padFilter: "Todos",
  padMode: "overlay",
  auxiliaryPlayback: {
    item: null,
    status: "Detenido",
    previousInternalVolumes: [],
    previousYoutubeVolume: null,
    ducking: false,
    duckToken: 0,
    playToken: 0,
  },
  workbenchView: "library",
  sourceView: "youtube",
  muted: false,
  masterVolume: 1,
  streamConnectedAt: 0,
  playbackToken: 0,
  localFolder: {
    handle: null,
    supported: supportsPersistentFolder(),
  },
};

const dom = {
  autoToggle: document.querySelector("#autoToggle"),
  currentClock: document.querySelector("#currentClock"),
  headerRemainingTime: document.querySelector("#headerRemainingTime"),
  configBtn: document.querySelector("#configBtn"),
  fullscreenBtn: document.querySelector("#fullscreenBtn"),
  audioStatus: document.querySelector("#audioStatus"),
  audioGate: document.querySelector("#audioGate"),
  activateAudioBtn: document.querySelector("#activateAudioBtn"),
  audioGateTitle: document.querySelector("#audioGateTitle"),
  audioGateMessage: document.querySelector("#audioGateMessage"),
  libraryCount: document.querySelector("#libraryCount"),
  queueCount: document.querySelector("#queueCount"),
  historyCount: document.querySelector("#historyCount"),
  activeDeck: document.querySelector("#activeDeck"),
  onAirTitle: document.querySelector("#onAirTitle"),
  coverType: document.querySelector("#coverType"),
  nowTitle: document.querySelector("#nowTitle"),
  nowArtist: document.querySelector("#nowArtist"),
  nowStatus: document.querySelector("#nowStatus"),
  nowError: document.querySelector("#nowError"),
  elapsedTime: document.querySelector("#elapsedTime"),
  remainingTime: document.querySelector("#remainingTime"),
  progressFill: document.querySelector("#progressFill"),
  playPauseBtn: document.querySelector("#playPauseBtn"),
  pauseBtn: document.querySelector("#pauseBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  fadeBtn: document.querySelector("#fadeBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  restartBtn: document.querySelector("#restartBtn"),
  bottomAutoBtn: document.querySelector("#bottomAutoBtn"),
  bottomManualBtn: document.querySelector("#bottomManualBtn"),
  cueBtn: document.querySelector("#cueBtn"),
  muteBtn: document.querySelector("#muteBtn"),
  volumeSlider: document.querySelector("#volumeSlider"),
  workbenchPanel: document.querySelector("#workbenchPanel"),
  workbenchTitle: document.querySelector("#workbenchTitle"),
  workbenchBackBtn: document.querySelector("#workbenchBackBtn"),
  workbenchCloseBtn: document.querySelector("#workbenchCloseBtn"),
  workbenchButtons: Array.from(document.querySelectorAll("[data-workbench-target]")),
  workbenchCloseButtons: Array.from(document.querySelectorAll("[data-workbench-close]")),
  workbenchSections: Array.from(document.querySelectorAll("[data-workbench-section]")),
  clearQueueBtn: document.querySelector("#clearQueueBtn"),
  nextType: document.querySelector("#nextType"),
  nextName: document.querySelector("#nextName"),
  nextTime: document.querySelector("#nextTime"),
  queueList: document.querySelector("#queueList"),
  fileInput: document.querySelector("#fileInput"),
  folderInput: document.querySelector("#folderInput"),
  defaultType: document.querySelector("#defaultType"),
  defaultCategory: document.querySelector("#defaultCategory"),
  addAllMusicBtn: document.querySelector("#addAllMusicBtn"),
  libraryTable: document.querySelector("#libraryTable"),
  librarySearch: document.querySelector("#librarySearch"),
  libraryTypeFilter: document.querySelector("#libraryTypeFilter"),
  libraryCategoryFilter: document.querySelector("#libraryCategoryFilter"),
  clearLibraryFiltersBtn: document.querySelector("#clearLibraryFiltersBtn"),
  selectedFilesList: document.querySelector("#selectedFilesList"),
  importStatusTitle: document.querySelector("#importStatusTitle"),
  importStatusText: document.querySelector("#importStatusText"),
  rememberFolderBtn: document.querySelector("#rememberFolderBtn"),
  reloadSavedFolderBtn: document.querySelector("#reloadSavedFolderBtn"),
  savedFolderStatus: document.querySelector("#savedFolderStatus"),
  commercialEvery: document.querySelector("#commercialEvery"),
  idEvery: document.querySelector("#idEvery"),
  crossfadeSeconds: document.querySelector("#crossfadeSeconds"),
  artistRepeatMinutes: document.querySelector("#artistRepeatMinutes"),
  saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
  refreshPadsBtn: document.querySelector("#refreshPadsBtn"),
  padModeSelect: document.querySelector("#padModeSelect"),
  padFilterButtons: Array.from(document.querySelectorAll("[data-pad-filter]")),
  padGrid: document.querySelector("#padGrid"),
  padOverlayStatus: document.querySelector("#padOverlayStatus"),
  padOverlayTitle: document.querySelector("#padOverlayTitle"),
  padOverlayMeta: document.querySelector("#padOverlayMeta"),
  stopPadOverlayBtn: document.querySelector("#stopPadOverlayBtn"),
  youtubeUrl: document.querySelector("#youtubeUrl"),
  addYoutubeBtn: document.querySelector("#addYoutubeBtn"),
  youtubeNextBtn: document.querySelector("#youtubeNextBtn"),
  youtubePlayBtn: document.querySelector("#youtubePlayBtn"),
  youtubePreviewTitle: document.querySelector("#youtubePreviewTitle"),
  youtubeStatus: document.querySelector("#youtubeStatus"),
  sourceTabButtons: Array.from(document.querySelectorAll("[data-source-view]")),
  sourcePanes: Array.from(document.querySelectorAll("[data-source-pane]")),
  streamUrl: document.querySelector("#streamUrl"),
  previewStreamBtn: document.querySelector("#previewStreamBtn"),
  loadStreamBtn: document.querySelector("#loadStreamBtn"),
  streamNextBtn: document.querySelector("#streamNextBtn"),
  stopStreamPreviewBtn: document.querySelector("#stopStreamPreviewBtn"),
  streamStatus: document.querySelector("#streamStatus"),
  streamConnectedTime: document.querySelector("#streamConnectedTime"),
  youtubeFrame: document.querySelector("#youtubeFrame"),
  youtubePlaceholder: document.querySelector("#youtubePlaceholder"),
  exportHistoryBtn: document.querySelector("#exportHistoryBtn"),
  historySearch: document.querySelector("#historySearch"),
  historyDateFilter: document.querySelector("#historyDateFilter"),
  historyTypeFilter: document.querySelector("#historyTypeFilter"),
  clearHistoryBtn: document.querySelector("#clearHistoryBtn"),
  historyList: document.querySelector("#historyList"),
  audioDiagnostics: document.querySelector("#audioDiagnostics"),
  toast: document.querySelector("#toast"),
  vuBars: Array.from(document.querySelectorAll(".vu-meter span")),
};

const playerA = new Audio();
const playerB = new Audio();
const streamingPlayer = new Audio();
const streamPreviewPlayer = new Audio();
const decks = [playerA, playerB];
const auxiliaryPlayer = new Audio();
let activeMainSource = null;
let isChangingTrack = false;
let playbackTimer = 0;
let crossfadeFrame = 0;
let crossfadeToken = 0;

decks.forEach((audio, index) => {
  audio.preload = "auto";

  audio.addEventListener("loadstart", () => logLocalDeckEvent(index, "loadstart", audio));
  audio.addEventListener("loadedmetadata", () => logLocalDeckEvent(index, "loadedmetadata", audio));
  audio.addEventListener("canplay", () => logLocalDeckEvent(index, "canplay", audio));
  audio.addEventListener("stalled", () => logLocalDeckEvent(index, "stalled", audio));

  audio.addEventListener("timeupdate", () => {
    if (activeMainSource === sourceForDeck(index)) {
      updateProgress();
      maybeCrossfade();
    }
  });

  audio.addEventListener("waiting", () => {
    logLocalDeckEvent(index, "waiting", audio);
    if (isActiveDeck(index)) setNowStatus("Cargando");
  });

  audio.addEventListener("playing", () => {
    logLocalDeckEvent(index, "playing", audio);
    if (isActiveDeck(index)) {
      setNowError("");
      setNowStatus("Reproduciendo");
      startPlaybackTimer();
    }
    syncPlayingClass();
  });

  audio.addEventListener("pause", () => {
    logLocalDeckEvent(index, "pause", audio);
    if (isActiveDeck(index)) clearPlaybackTimer();
    syncPlayingClass();
  });

  audio.addEventListener("ended", () => {
    logLocalDeckEvent(index, "ended", audio);
    if (isActiveDeck(index) && !state.isFading) {
      clearPlaybackTimer();
      setNowStatus("Finalizado");
      updateLatestHistory("Reproducido");
      advance(true);
    }
  });

  audio.addEventListener("error", () => {
    console.error("Media error:", audio.error?.code, audio.error?.message, audio.currentSrc);
    if (audio._localPreparing || audio._mainStopping) return;
    if (!state.nowPlaying || !isActiveDeck(index) || !audio.currentSrc) return;
    if (state.nowPlaying.source !== "local") return;
    handleLocalPlaybackFailure(state.nowPlaying, audio, new Error(mediaErrorMessage(audio)));
  });
});

streamingPlayer.preload = "none";
streamingPlayer.addEventListener("loadstart", () => logStreamEvent("loadstart"));
streamingPlayer.addEventListener("canplay", () => logStreamEvent("canplay"));
streamingPlayer.addEventListener("waiting", () => {
  logStreamEvent("waiting");
  if (activeMainSource === "streaming") {
    setNowStatus("Conectando");
    setStreamStatus("Conectando...");
  }
});
streamingPlayer.addEventListener("playing", () => {
  logStreamEvent("playing");
  if (activeMainSource !== "streaming") return;
  state.streamConnectedAt = Date.now();
  setStreamStatus("Reproduciendo.");
  setNowError("");
  setNowStatus("Reproduciendo");
  updateLatestHistory("Reproduciendo");
  startPlaybackTimer();
  syncPlayingClass();
});
streamingPlayer.addEventListener("pause", () => {
  logStreamEvent("pause");
  if (activeMainSource === "streaming") clearPlaybackTimer();
  syncPlayingClass();
});
streamingPlayer.addEventListener("timeupdate", () => {
  if (activeMainSource === "streaming") updateProgress();
});
streamingPlayer.addEventListener("ended", () => {
  logStreamEvent("ended");
  if (activeMainSource !== "streaming") return;
  clearPlaybackTimer();
  setStreamStatus("Finalizado.");
  setNowStatus("Finalizado");
  updateLatestHistory("Reproducido");
  advance(true);
});
streamingPlayer.addEventListener("error", () => {
  logStreamEvent("error");
  if (streamingPlayer._streamPreparing || streamingPlayer._mainStopping) return;
  if (activeMainSource !== "streaming" || !state.nowPlaying || state.nowPlaying.source !== "stream") return;
  handleStreamPlaybackFailure(state.nowPlaying, streamingPlayer, new Error(mediaErrorMessage(streamingPlayer)));
});

streamPreviewPlayer.preload = "none";
auxiliaryPlayer.preload = "auto";
auxiliaryPlayer.addEventListener("playing", () => {
  if (!state.auxiliaryPlayback.item) return;
  state.auxiliaryPlayback.status = "Cuna al aire";
  renderAuxiliaryPlayback();
});
auxiliaryPlayer.addEventListener("timeupdate", renderAuxiliaryPlayback);
auxiliaryPlayer.addEventListener("ended", () => finishAuxiliaryPlayback("Finalizada"));
auxiliaryPlayer.addEventListener("error", () => {
  if (!state.auxiliaryPlayback.item || !auxiliaryPlayer.currentSrc) return;
  failAuxiliaryPlayback("No se pudo reproducir la cuna.");
});

let toastTimer = 0;
let vuTimer = 0;

init();

function init() {
  document.documentElement.dataset.venevoAppReady = "true";
  window.venevoActivateAudio = activateAudio;
  loadSettings();
  bindEvents();
  renderAll();
  refreshSavedFolderStatus();
  tickClock();
  tickVu();

  if (location.protocol === "file:") {
    renderAudioGate();
  }
}

function bindEvents() {
  dom.activateAudioBtn.addEventListener("click", activateAudio);

  dom.autoToggle.addEventListener("click", () => {
    state.autoMode = !state.autoMode;
    renderHeader();
    toast(state.autoMode ? "Modo automatico activado." : "Modo manual activado.");
    if (state.autoMode && !state.nowPlaying && state.audioActivated) {
      advance(false);
    }
  });

  dom.fileInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    await importFiles(files);
    event.target.value = "";
  });
  dom.folderInput?.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    await importFiles(files);
    event.target.value = "";
  });
  dom.rememberFolderBtn?.addEventListener("click", rememberLocalFolder);
  dom.reloadSavedFolderBtn?.addEventListener("click", reloadSavedLocalFolder);

  dom.playPauseBtn.addEventListener("click", togglePlayPause);
  dom.pauseBtn?.addEventListener("click", pauseCurrent);
  dom.nextBtn.addEventListener("click", () => advance(false, { skipped: true }));
  dom.fadeBtn.addEventListener("click", fadeOutCurrent);
  dom.stopBtn.addEventListener("click", stopAll);
  dom.restartBtn?.addEventListener("click", restartCurrent);
  dom.bottomAutoBtn?.addEventListener("click", () => {
    if (!state.autoMode) dom.autoToggle.click();
  });
  dom.bottomManualBtn?.addEventListener("click", () => {
    if (state.autoMode) dom.autoToggle.click();
  });
  dom.cueBtn?.addEventListener("click", () => advance(false));
  dom.muteBtn?.addEventListener("click", toggleMute);
  dom.volumeSlider?.addEventListener("input", () => {
    setMasterVolume(Number(dom.volumeSlider.value) / 100);
  });
  dom.configBtn?.addEventListener("click", () => {
    openWorkbench("settings");
  });
  dom.fullscreenBtn?.addEventListener("click", toggleFullscreen);
  dom.workbenchButtons.forEach((button) => {
    button.addEventListener("click", () => openWorkbench(button.dataset.workbenchTarget || "library"));
  });
  dom.workbenchCloseBtn?.addEventListener("click", closeWorkbench);
  dom.workbenchBackBtn?.addEventListener("click", closeWorkbench);
  dom.workbenchCloseButtons.forEach((button) => button.addEventListener("click", closeWorkbench));
  dom.sourceTabButtons.forEach((button) => {
    button.addEventListener("click", () => setSourceView(button.dataset.sourceView || "youtube"));
  });
  [dom.librarySearch, dom.libraryTypeFilter, dom.libraryCategoryFilter].forEach((field) => {
    field?.addEventListener("input", renderLibrary);
    field?.addEventListener("change", renderLibrary);
  });
  dom.clearLibraryFiltersBtn?.addEventListener("click", () => {
    dom.librarySearch.value = "";
    dom.libraryTypeFilter.value = "Todos";
    dom.libraryCategoryFilter.value = "";
    renderLibrary();
  });
  [dom.historySearch, dom.historyDateFilter, dom.historyTypeFilter].forEach((field) => {
    field?.addEventListener("input", renderHistory);
    field?.addEventListener("change", renderHistory);
  });
  dom.clearHistoryBtn?.addEventListener("click", () => {
    state.history = [];
    renderHistory();
    toast("Historial limpio.");
  });
  dom.clearQueueBtn.addEventListener("click", () => {
    state.queue = [];
    renderQueue();
    toast("Cola limpia.");
  });

  dom.addAllMusicBtn.addEventListener("click", () => {
    const music = state.library.filter((item) => item.type === "Musica");
    state.queue.push(...music.map(cloneQueueItem));
    renderQueue();
    toast(`${music.length} canciones agregadas a la cola.`);
  });

  dom.saveSettingsBtn.addEventListener("click", saveSettingsFromInputs);
  dom.padModeSelect?.addEventListener("change", () => {
    state.padMode = dom.padModeSelect.value || "overlay";
    renderPads();
  });
  dom.stopPadOverlayBtn?.addEventListener("click", () => {
    stopAuxiliaryPlayback({ restoreMain: true, showMessage: true });
  });
  dom.refreshPadsBtn.addEventListener("click", () => {
    renderPads();
    toast("Pads actualizados con IDs, cunas, cortinas y efectos.");
  });
  dom.padFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.padFilter = button.dataset.padFilter || "Todos";
      renderPads();
    });
  });

  dom.addYoutubeBtn.addEventListener("click", addYoutubeToQueue);
  dom.youtubeNextBtn?.addEventListener("click", addYoutubeAsNext);
  dom.youtubePlayBtn?.addEventListener("click", playYoutubeFromInput);
  dom.previewStreamBtn.addEventListener("click", previewStream);
  dom.loadStreamBtn.addEventListener("click", addStreamToQueue);
  dom.streamNextBtn?.addEventListener("click", addStreamAsNext);
  dom.stopStreamPreviewBtn.addEventListener("click", () => stopStreamPreview(true));
  dom.exportHistoryBtn.addEventListener("click", exportHistory);

  [dom.commercialEvery, dom.idEvery, dom.crossfadeSeconds, dom.artistRepeatMinutes].forEach(
    (input) => input.addEventListener("change", saveSettingsFromInputs),
  );
  document.querySelector("#saveSettingsMirrorBtn")?.addEventListener("click", saveSettingsFromInputs);
}

function openWorkbench(view = "library") {
  state.workbenchView = view;
  dom.workbenchPanel?.removeAttribute("aria-hidden");
  dom.workbenchPanel?.classList.add("is-open");
  renderWorkbench();
}

function closeWorkbench() {
  dom.workbenchPanel?.setAttribute("aria-hidden", "true");
  dom.workbenchPanel?.classList.remove("is-open");
}

function renderWorkbench() {
  const titles = {
    library: "Biblioteca",
    import: "Importar",
    external: "Fuentes externas",
    schedule: "Programacion",
    events: "Eventos",
    history: "Historial",
    settings: "Configuracion",
  };

  if (dom.workbenchTitle) {
    dom.workbenchTitle.textContent = titles[state.workbenchView] || "Panel de trabajo";
  }

  dom.workbenchSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.workbenchSection === state.workbenchView);
  });
  dom.workbenchButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.workbenchTarget === state.workbenchView);
  });
}

function setSourceView(view) {
  state.sourceView = view;
  dom.sourceTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sourceView === view);
  });
  dom.sourcePanes.forEach((pane) => {
    pane.classList.toggle("is-active", pane.dataset.sourcePane === view);
  });
}

async function activateAudio() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioContextCtor) {
    try {
      state.audioContext = state.audioContext || new AudioContextCtor();
      if (state.audioContext.state === "suspended") {
        Promise.resolve(state.audioContext.resume()).catch(() => {});
      }
      pulseSilentAudioContext();
    } catch {
      state.audioContext = null;
    }
  }

  await Promise.race([
    Promise.allSettled([...decks, streamingPlayer, streamPreviewPlayer, auxiliaryPlayer].map(primeAudioElement)),
    delay(700),
  ]).catch(() => {});

  state.audioActivated = true;
  writeSessionFlag(AUDIO_ACTIVATION_KEY, true);
  renderAudioGate(
    true,
    "Audio activado",
    "La cola puede continuar automaticamente durante esta sesion.",
    true,
  );
  toast("Audio activado. Ya puedes reproducir archivos, streams y YouTube desde la consola.");
}

function pulseSilentAudioContext() {
  if (!state.audioContext) return;
  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();
  gain.gain.value = 0.0001;
  oscillator.connect(gain);
  gain.connect(state.audioContext.destination);
  oscillator.start();
  oscillator.stop(state.audioContext.currentTime + 0.03);
}

function primeAudioElement(audio) {
  return new Promise((resolve) => {
    const originalMuted = audio.muted;
    audio.muted = true;
    audio.src = SILENT_WAV;
    const done = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = originalMuted;
      audio.removeAttribute("src");
      audio.load();
      resolve();
    };
    audio.play().then(done).catch(done);
  });
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setActiveMainSource(source) {
  activeMainSource = source;
  console.log("Fuente activa:", activeMainSource);
  renderAudioDiagnostics();
}

function setChangingTrack(value) {
  isChangingTrack = value;
  renderAudioDiagnostics();
  renderTransport();
}

function sourceForDeck(index) {
  return index === 0 ? "playerA" : "playerB";
}

function activeMainSourceLabel() {
  if (activeMainSource === "playerA") return "Player A";
  if (activeMainSource === "playerB") return "Player B";
  if (activeMainSource === "youtube") return "YouTube";
  if (activeMainSource === "streaming") return "Streaming";
  return state.activeDeck === 0 ? "Player A" : "Player B";
}

function deckIndexFromSource(source) {
  if (source === "playerA") return 0;
  if (source === "playerB") return 1;
  return -1;
}

function audioForMainSource(source) {
  if (source === "playerA") return playerA;
  if (source === "playerB") return playerB;
  if (source === "streaming") return streamingPlayer;
  return null;
}

function getActiveMainPlayer() {
  if (activeMainSource === "youtube") return state.youtube.player || null;
  return audioForMainSource(activeMainSource);
}

function isActiveMainPlaying() {
  if (activeMainSource === "youtube") return safeYoutubeState() === 1;
  const player = getActiveMainPlayer();
  return Boolean(player && !player.paused && !player.ended);
}

function stopMainAudioElement(audio, { clearSource = true } = {}) {
  if (!audio) return;
  audio._mainStopping = true;
  try {
    audio.pause();
    if (Number.isFinite(audio.currentTime)) audio.currentTime = 0;
  } catch {
    // Live streams can refuse seeking; pausing is the important part.
  }
  if (clearSource) {
    audio.removeAttribute("src");
    try {
      audio.load();
    } catch {
      // Some browsers throw if a media element is already detached.
    }
  }
  audio.volume = outputVolume();
  window.setTimeout(() => {
    audio._mainStopping = false;
  }, 0);
}

function cancelCrossfade() {
  crossfadeToken += 1;
  if (crossfadeFrame) {
    cancelAnimationFrame(crossfadeFrame);
    crossfadeFrame = 0;
  }
  state.isFading = false;
}

function clearPlaybackTimer() {
  if (playbackTimer) {
    window.clearInterval(playbackTimer);
    playbackTimer = 0;
  }
  state.youtube.progressTimer = 0;
  renderAudioDiagnostics();
}

function startPlaybackTimer() {
  clearPlaybackTimer();
  playbackTimer = window.setInterval(() => {
    updateProgress();
    renderTransport();
    renderStreamStatus();
    renderAudioDiagnostics();
  }, 500);
  state.youtube.progressTimer = playbackTimer;
  renderAudioDiagnostics();
}

function stopAllMainSources(exceptSource = null, { clearSource = true, resetYoutubeStatus = false } = {}) {
  console.log("Deteniendo fuente anterior");
  cancelCrossfade();
  clearPlaybackTimer();

  if (exceptSource !== "playerA") stopMainAudioElement(playerA, { clearSource });
  if (exceptSource !== "playerB") stopMainAudioElement(playerB, { clearSource });

  if (exceptSource !== "streaming") {
    stopMainAudioElement(streamingPlayer, { clearSource });
    state.streamConnectedAt = 0;
    if (state.nowPlaying?.source === "stream") setStreamStatus("Sin conectar.");
  }

  if (exceptSource !== "youtube") {
    stopYoutubePlayback(resetYoutubeStatus);
  }

  setActiveMainSource(exceptSource);
  logMainSourceState();
  syncPlayingClass();
}

function logMainSourceState() {
  console.log({
    playerAPaused: playerA.paused,
    playerBPaused: playerB.paused,
    youtubeState: safeYoutubeState(),
    streamingPaused: streamingPlayer.paused,
    activeMainSource,
  });
}

function waitForMediaPlaying(audio, timeoutMs = 7000) {
  if (!audio.paused && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("El audio no confirmo reproduccion."));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeout);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    };
    const onPlaying = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(mediaErrorMessage(audio)));
    };

    audio.addEventListener("playing", onPlaying, { once: true });
    audio.addEventListener("error", onError, { once: true });
  });
}

function showActivationRequired() {
  state.audioActivated = false;
  writeSessionFlag(AUDIO_ACTIVATION_KEY, false);
  renderAudioGate(
    false,
    "Audio pendiente de activacion",
    "El navegador necesita una primera interacción. Pulse Activar audio.",
    false,
  );
  toast("El navegador necesita una primera interacción. Pulse Activar audio.");
}

async function importFiles(files, options = {}) {
  const type = dom.defaultType.value;
  const category = dom.defaultCategory.value.trim() || "General";
  const imported = [];
  const metadata = readLibraryMetadata();
  const existingKeys = new Set(state.library.map((item) => item.localKey).filter(Boolean));
  let rejected = 0;
  let skipped = 0;

  updateImportStatus("Procesando archivos", `${files.length} archivo(s) seleccionados.`);

  for (const file of files) {
    if (!isSupportedAudioFile(file)) {
      console.warn("Archivo rechazado por formato no compatible:", file.name, file.type);
      rejected += 1;
      continue;
    }

    const localKey = fileLibraryKey(file);
    if (existingKeys.has(localKey)) {
      skipped += 1;
      continue;
    }

    const saved = metadata[localKey] || {};
    const objectUrl = URL.createObjectURL(file);
    const duration = await readDuration(objectUrl);
    const item = {
      id: makeId(),
      source: "local",
      sourceType: options.sourceType || "local",
      status: "Pendiente",
      file,
      objectUrl,
      url: objectUrl,
      fileName: file.name,
      localKey,
      mimeType: file.type || "audio/desconocido",
      size: file.size,
      available: true,
      type: saved.type || type,
      name: saved.name || cleanFileName(file.name),
      artist: saved.artist || guessArtist(file.name),
      duration,
      category: saved.category || category,
      addedAt: Date.now(),
    };
    imported.push({
      ...item,
    });
    existingKeys.add(localKey);
  }

  state.library.push(...imported);
  renderAll();
  renderSelectedFiles(imported);
  updateImportStatus(
    imported.length ? "Importacion completada" : "Sin archivos importados",
    `${imported.length} agregado(s). ${skipped} repetido(s). ${rejected} omitido(s).`,
  );

  if (imported.length) toast(`${imported.length} audios importados.`);
  if (rejected) toast(`${rejected} archivos omitidos por formato no compatible.`);
  if (options.statusText) setSavedFolderStatus(options.statusText);
}

async function rememberLocalFolder() {
  if (!supportsPersistentFolder()) {
    setSavedFolderStatus("Este navegador no puede recordar carpetas. Use Seleccionar carpeta.");
    dom.folderInput?.click();
    return;
  }

  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    const allowed = await ensureDirectoryPermission(handle, true);
    if (!allowed) {
      setSavedFolderStatus("Permiso de carpeta cancelado.");
      return;
    }

    await saveDirectoryHandle(handle);
    state.localFolder.handle = handle;
    setSavedFolderStatus(`Carpeta guardada: ${handle.name}.`);
    await loadFilesFromDirectoryHandle(handle, `Carpeta guardada: ${handle.name}.`);
  } catch (error) {
    if (error?.name === "AbortError") {
      setSavedFolderStatus("Seleccion de carpeta cancelada.");
      return;
    }
    console.error("No se pudo guardar la carpeta:", error);
    setSavedFolderStatus("No se pudo guardar esa carpeta.");
  }
}

async function reloadSavedLocalFolder() {
  if (!supportsPersistentFolder()) {
    setSavedFolderStatus("Este navegador no puede cargar carpeta guardada.");
    return;
  }

  try {
    const handle = state.localFolder.handle || (await loadDirectoryHandle());
    if (!handle) {
      setSavedFolderStatus("Todavia no hay carpeta guardada en esta computadora.");
      return;
    }

    const allowed = await ensureDirectoryPermission(handle, true);
    if (!allowed) {
      setSavedFolderStatus("Pulse Seleccionar carpeta para autorizarla otra vez.");
      return;
    }

    state.localFolder.handle = handle;
    await loadFilesFromDirectoryHandle(handle, `Carpeta cargada: ${handle.name}.`);
  } catch (error) {
    console.error("No se pudo cargar la carpeta guardada:", error);
    setSavedFolderStatus("No se pudo cargar la carpeta guardada.");
  }
}

async function loadFilesFromDirectoryHandle(handle, statusText) {
  updateImportStatus("Leyendo carpeta", "Buscando audios compatibles en esta computadora.");
  const files = await collectAudioFilesFromDirectory(handle);
  if (!files.length) {
    updateImportStatus("Sin audios compatibles", "La carpeta no tiene MP3, WAV, AAC, M4A u OGG.");
    setSavedFolderStatus(statusText);
    return;
  }
  await importFiles(files, {
    sourceType: "saved-folder",
    statusText,
  });
}

async function collectAudioFilesFromDirectory(directoryHandle) {
  const files = [];

  async function walk(handle) {
    for await (const entry of handle.values()) {
      if (entry.kind === "file") {
        const file = await entry.getFile();
        if (isSupportedAudioFile(file)) files.push(file);
      } else if (entry.kind === "directory") {
        await walk(entry);
      }
    }
  }

  await walk(directoryHandle);
  return files;
}

async function refreshSavedFolderStatus() {
  if (!dom.savedFolderStatus) return;
  if (!supportsPersistentFolder()) {
    setSavedFolderStatus("Este navegador puede seleccionar carpetas, pero no recordarlas.");
    if (dom.reloadSavedFolderBtn) dom.reloadSavedFolderBtn.disabled = true;
    return;
  }

  try {
    const handle = await loadDirectoryHandle();
    state.localFolder.handle = handle;
    if (dom.reloadSavedFolderBtn) dom.reloadSavedFolderBtn.disabled = !handle;
    setSavedFolderStatus(
      handle
        ? `Carpeta guardada en esta computadora: ${handle.name}.`
        : "Cada computadora debe autorizar su propia carpeta musical.",
    );
  } catch {
    setSavedFolderStatus("Cada computadora debe autorizar su propia carpeta musical.");
  }
}

function readDuration(url) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = url;
    audio.load();
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => resolve(0);
  });
}

function togglePlayPause() {
  if (!state.audioActivated) {
    showActivationRequired();
    return;
  }

  if (!state.nowPlaying) {
    advance(false);
    return;
  }

  const active = getActiveMainPlayer();
  console.log("Boton ejecutado sobre:", activeMainSource, active);

  if (activeMainSource === "youtube") {
    toggleYoutubePlayback();
    return;
  }

  if (!active) {
    advance(false);
    return;
  }

  if (active.paused) {
    ensureAudibleLocalOutput(active);
    const playingPromise = waitForMediaPlaying(active);
    Promise.all([
      active.play(),
      playingPromise,
    ])
      .then(() => playingPromise)
      .then(() => {
        setNowError("");
        setNowStatus("Reproduciendo");
        startPlaybackTimer();
      })
      .catch((error) => handlePlayRejection(error));
  } else {
    active.pause();
    clearPlaybackTimer();
    setNowStatus("Pausado");
  }
  renderTransport();
}

function pauseCurrent() {
  if (!state.nowPlaying) return;

  const active = getActiveMainPlayer();
  console.log("Boton ejecutado sobre:", activeMainSource, active);

  if (activeMainSource === "youtube") {
    const playerState = safeYoutubeState();
    if (playerState === 1 || playerState === 3) {
      state.youtube.player?.pauseVideo?.();
      stopYoutubeProgress();
      setNowStatus("Pausado");
    }
    return;
  }

  if (!active) return;
  active.pause();
  clearPlaybackTimer();
  setNowStatus("Pausado");
}

function restartCurrent() {
  if (!state.nowPlaying) return;

  const active = getActiveMainPlayer();
  console.log("Boton ejecutado sobre:", activeMainSource, active);

  if (activeMainSource === "youtube" && state.youtube.player?.seekTo) {
    state.youtube.player.seekTo(0, true);
    state.youtube.player.playVideo();
    setNowStatus("Reproduciendo");
    return;
  }

  if (!active) return;
  try {
    active.currentTime = 0;
  } catch {
    // Live streams can refuse seeking.
  }
  ensureAudibleLocalOutput(active);
  const playingPromise = waitForMediaPlaying(active);
  Promise.all([active.play(), playingPromise]).catch((error) => handlePlayRejection(error));
}

async function advance(useCrossfade, { skipped = false } = {}) {
  if (!state.audioActivated) {
    showActivationRequired();
    return;
  }

  if (isChangingTrack) return;
  state.advancingQueue = true;
  setChangingTrack(true);

  try {
    window.clearTimeout(state.pendingErrorSkip);
    const currentQueueItem = state.nowPlaying;
    const next = pickNextItem();
    console.log("Elemento terminado:", currentQueueItem || null);
    console.log("Indice antes de avanzar:", state.history.length);
    console.log("Siguiente elemento:", next || null);
    console.log("Video ID siguiente:", next?.videoId || "");

    if (!next) {
      if (currentQueueItem && skipped) updateLatestHistory("Omitido");
      if (state.autoMode) {
        toast("No hay contenido suficiente para continuar en automatico.");
      }
      stopAll(false);
      return;
    }

    if (currentQueueItem) updateLatestHistory(skipped ? "Omitido" : "Reproducido");
    await playQueueItem(next, useCrossfade, { lockHeld: true });
  } finally {
    state.advancingQueue = false;
    setChangingTrack(false);
  }
}

function pickNextItem() {
  const injected = pickAutomaticInsert();
  if (injected) return cloneQueueItem(injected);

  if (state.queue.length) return state.queue.shift();

  if (!state.autoMode) return null;

  return pickAutomaticMusic();
}

function pickAutomaticInsert() {
  if (!state.autoMode) return null;

  const now = Date.now();
  const idDue = now - state.lastIdAt >= state.settings.idEvery * 60 * 1000;
  if (idDue) {
    const stationId = state.library.find((item) => item.type === "ID");
    if (stationId) {
      state.lastIdAt = now;
      return stationId;
    }
  }

  if (state.songsSinceCommercial >= state.settings.commercialEvery) {
    const commercial = state.library.find((item) => item.type === "Cuna");
    if (commercial) {
      state.songsSinceCommercial = 0;
      return commercial;
    }
  }

  return null;
}

function pickAutomaticMusic() {
  const music = state.library.filter((item) => item.type === "Musica");
  if (!music.length) return null;

  const artistWindow = state.settings.artistRepeatMinutes * 60 * 1000;
  const now = Date.now();
  const recentArtists = new Set(
    state.history
      .filter((item) => now - item.playedAt < artistWindow)
      .map((item) => normalize(item.artist))
      .filter(Boolean),
  );

  const eligible = music.filter((item) => !recentArtists.has(normalize(item.artist)));
  const pool = eligible.length ? eligible : music;
  const index = Math.floor(Math.random() * pool.length);
  return cloneQueueItem(pool[index]);
}

async function playItem(item, useCrossfade) {
  return playQueueItem(item, useCrossfade);
}

async function playQueueItem(item, useCrossfade = false, { lockHeld = false } = {}) {
  if (!state.audioActivated) {
    showActivationRequired();
    return false;
  }

  if (isChangingTrack && !lockHeld) return false;
  if (!lockHeld) setChangingTrack(true);

  const token = ++state.playbackToken;
  console.log("Pista solicitada:", item);
  item.status = item.source === "local" ? "Preparando archivo" : "Conectando";
  state.nowError = "";

  try {
    if (item.source === "youtube") {
      await playYoutubeItem(item, token);
      return true;
    }

    await playInternalAudioItem(item, useCrossfade, token);
    return true;
  } finally {
    if (!lockHeld) setChangingTrack(false);
  }
}

async function playInternalAudioItem(item, useCrossfade, token) {
  stopStreamPreview(false);
  hideYoutube(false);

  const sourceUrl = localAudioSource(item);
  if (item.source === "local" && !sourceUrl) {
    stopAllMainSources(null);
    state.nowPlaying = item;
    state.nowStatus = "Error";
    state.nowError = "Archivo local no disponible. Vuelva a seleccionar el archivo.";
    item.status = "Archivo no vinculado";
    addHistory(item, "Error");
    updateLatestHistory("Error", state.nowError);
    renderAll();
    toast(state.nowError);
    if (state.autoMode) {
      window.clearTimeout(state.pendingErrorSkip);
      state.pendingErrorSkip = window.setTimeout(() => advance(false), 3200);
    }
    return;
  }

  const isStream = item.source === "stream";
  const oldSource = activeMainSource;
  const oldDeck = state.activeDeck;
  const hadLocalAudio =
    state.nowPlaying?.source === "local" &&
    (oldSource === "playerA" || oldSource === "playerB") &&
    !decks[oldDeck].paused;
  const newDeck = isStream ? state.activeDeck : hadLocalAudio ? 1 - state.activeDeck : state.activeDeck;
  const nextSource = isStream ? "streaming" : sourceForDeck(newDeck);
  const nextAudio = isStream ? streamingPlayer : decks[newDeck];
  const currentAudio = decks[oldDeck];
  const shouldCrossfade =
    Boolean(!isStream && useCrossfade && hadLocalAudio && state.settings.crossfadeSeconds > 0) &&
    currentAudio !== nextAudio;

  if (shouldCrossfade) {
    stopAllMainSources(oldSource, { clearSource: true });
  } else {
    stopAllMainSources(nextSource, { clearSource: true });
  }

  ensureAudibleLocalOutput(nextAudio);
  const targetVolume =
    state.auxiliaryPlayback.ducking && isInternalAudioSource(item)
      ? outputVolume() * PAD_DUCKING_RATIO
      : outputVolume();

  nextAudio._mainStopping = false;
  nextAudio.pause();
  nextAudio.src = sourceUrl;
  try {
    nextAudio.currentTime = 0;
  } catch {
    // Live streams can refuse seeking before metadata exists.
  }
  nextAudio.volume = shouldCrossfade ? 0 : targetVolume;
  nextAudio.load();
  if (isStream) state.streamConnectedAt = 0;

  state.isFading = shouldCrossfade;
  state.nowPlaying = item;
  if (!isStream) state.activeDeck = newDeck;
  setActiveMainSource(nextSource);
  state.nowStatus = item.source === "stream" ? "Conectando" : "Preparando archivo";
  addHistory(item, item.source === "stream" ? "Conectando" : "Preparando");
  renderAll();
  if (state.auxiliaryPlayback.ducking) applyMainDucking();

  if (item.source === "local") {
    console.log("Archivo local:", item);
    console.log("Object URL:", sourceUrl);
    console.log("Player src:", nextAudio.src);
    console.log({
      muted: nextAudio.muted,
      volume: nextAudio.volume,
      paused: nextAudio.paused,
      readyState: nextAudio.readyState,
      networkState: nextAudio.networkState,
      currentSrc: nextAudio.currentSrc,
    });
  }

  try {
    if (item.source === "local") {
      nextAudio._localPreparing = true;
      const readyPromise = waitForLocalMediaReady(nextAudio);
      const playingPromise = waitForMediaPlaying(nextAudio);
      const playPromise = nextAudio.play();
      await Promise.all([readyPromise, playPromise, playingPromise]);
    } else {
      nextAudio._streamPreparing = true;
      const playingPromise = waitForMediaPlaying(nextAudio, 10000);
      await nextAudio.play();
      await playingPromise;
    }
    nextAudio._localPreparing = false;
    nextAudio._streamPreparing = false;
    if (token !== state.playbackToken || state.nowPlaying !== item || activeMainSource !== nextSource) return;
    setNowError("");
    setNowStatus("Reproduciendo");
    updateLatestHistory("Reproduciendo");
    startPlaybackTimer();
    if (item.source === "local") {
      console.log("audio.play() resuelto para archivo local:", {
        name: item.name,
        currentTime: nextAudio.currentTime,
        volume: nextAudio.volume,
        muted: nextAudio.muted,
        currentSrc: nextAudio.currentSrc,
      });
      confirmLocalAudioProgress(item, nextAudio, newDeck);
    }
    console.log("Nueva fuente realmente reproduciendo");
    logMainSourceState();
  } catch (error) {
    nextAudio._localPreparing = false;
    nextAudio._streamPreparing = false;
    state.isFading = false;
    if (item.source === "stream") {
      handleStreamPlaybackFailure(item, nextAudio, error);
    } else {
      handleLocalPlaybackFailure(item, nextAudio, error);
    }
    return;
  }

  if (shouldCrossfade) {
    await fadeBetween(currentAudio, nextAudio, state.settings.crossfadeSeconds);
  } else if (currentAudio !== nextAudio) {
    stopMainAudioElement(currentAudio, { clearSource: true });
  }

  if (item.type === "Musica") state.songsSinceCommercial += 1;
  if (item.type === "ID") state.lastIdAt = Date.now();
}

async function playYoutubeItem(item, token) {
  if (activeMainSource === "youtube") stopYoutubePlayback(false);
  stopAllMainSources("youtube");
  stopStreamPreview(false);

  state.nowPlaying = item;
  state.nowStatus = "Preparando";
  state.nowError = "";
  state.youtube.currentItem = item;
  state.youtube.lastEndedKey = "";
  addHistory(item, "Conectando");
  showYoutubePanel();
  renderAll();

  if (!isSecureYoutubeOrigin()) {
    handleYoutubePlaybackError(
      "YouTube no recibio una identificacion valida del sitio. Abra la aplicacion desde localhost o HTTPS.",
      true,
    );
    return;
  }

  try {
    const player = await ensureYoutubePlayer();
    if (token !== state.playbackToken || state.nowPlaying !== item || activeMainSource !== "youtube") return;
    window.clearTimeout(state.youtube.watchdogTimer);

    if (item.playlistId && !item.videoId) {
      player.loadPlaylist({
        list: item.playlistId,
        listType: "playlist",
      });
    } else {
      if (!item.videoId) {
        handleYoutubePlaybackError("Identificador de YouTube incorrecto.", true);
        return;
      }
      player.loadVideoById({
        videoId: item.videoId,
        startSeconds: 0,
      });
    }

    state.youtube.watchdogTimer = window.setTimeout(() => {
      if (state.nowPlaying !== item) return;
      const playerState = safeYoutubeState();
      console.log("Estado YouTube:", playerState);
      if (playerState === 3) {
        setNowStatus("Conectando");
        setYoutubeStatus(item.name, "Conectando...");
      } else if (playerState === 5) {
        setNowStatus("Preparado");
        setYoutubeStatus(item.name, "Preparado.");
      } else if (playerState !== 1) {
        setNowStatus("Conectando");
      }
    }, 12000);
  } catch (error) {
    console.log("YouTube play error:", error);
    handleYoutubePlaybackError("YouTube no pudo inicializar el reproductor oficial.", true);
  }
}

function fadeBetween(fromAudio, toAudio, seconds) {
  cancelCrossfade();
  state.isFading = true;
  const token = ++crossfadeToken;
  const duration = Math.max(300, seconds * 1000);
  const start = performance.now();
  const targetVolume =
    state.auxiliaryPlayback.ducking && isInternalAudioSource(state.nowPlaying)
      ? outputVolume() * PAD_DUCKING_RATIO
      : outputVolume();

  return new Promise((resolve) => {
    function finish() {
      crossfadeFrame = 0;
      fromAudio.volume = 0;
      stopMainAudioElement(fromAudio, { clearSource: true });
      toAudio.volume = targetVolume;
      state.isFading = false;
      renderTransport();
      renderAudioDiagnostics();
      resolve();
    }

    function frame(now) {
      if (token !== crossfadeToken) {
        resolve();
        return;
      }
      const progress = Math.min(1, (now - start) / duration);
      fromAudio.volume = Math.max(0, targetVolume * (1 - progress));
      toAudio.volume = Math.min(targetVolume, targetVolume * progress);

      if (progress < 1) {
        crossfadeFrame = requestAnimationFrame(frame);
      } else {
        finish();
      }
    }

    crossfadeFrame = requestAnimationFrame(frame);
  });
}

function maybeCrossfade() {
  if (!state.autoMode || state.isFading || !state.nowPlaying) return;
  if (state.nowPlaying.source !== "local") return;
  if (state.settings.crossfadeSeconds <= 0) return;
  if (!state.queue.length && !state.library.some((item) => item.type === "Musica")) return;
  if (activeMainSource !== sourceForDeck(state.activeDeck)) return;

  const active = decks[state.activeDeck];
  if (!Number.isFinite(active.duration) || active.duration <= 0) return;

  const remaining = active.duration - active.currentTime;
  if (remaining > 0 && remaining <= state.settings.crossfadeSeconds) {
    advance(true);
  }
}

function fadeOutCurrent() {
  if (!state.nowPlaying) return;

  if (activeMainSource === "youtube") {
    toast("Fade out solo aplica al audio interno. YouTube se controla con su reproductor oficial.");
    return;
  }

  const active = getActiveMainPlayer();
  if (!active || !isInternalAudioSource(state.nowPlaying)) return;

  cancelCrossfade();
  state.isFading = true;
  const token = ++crossfadeToken;
  const duration = Math.max(600, state.settings.crossfadeSeconds * 1000);
  const start = performance.now();
  const originalVolume = active.volume || 1;

  function frame(now) {
    if (token !== crossfadeToken) return;
    const progress = Math.min(1, (now - start) / duration);
    active.volume = Math.max(0, originalVolume * (1 - progress));
    if (progress < 1) {
      crossfadeFrame = requestAnimationFrame(frame);
    } else {
      stopMainAudioElement(active, { clearSource: true });
      active.volume = outputVolume();
      state.isFading = false;
      setActiveMainSource(null);
      clearPlaybackTimer();
      if (state.autoMode) {
        advance(false);
      } else {
        setNowStatus("Detenido");
      }
    }
  }

  crossfadeFrame = requestAnimationFrame(frame);
}

function stopAll(showMessage = true) {
  window.clearTimeout(state.pendingErrorSkip);
  stopAuxiliaryPlayback({ restoreMain: true, showMessage: false });
  stopAllMainSources(null, { clearSource: true, resetYoutubeStatus: true });
  stopStreamPreview(false);
  state.nowPlaying = null;
  state.nowStatus = "Detenido";
  state.nowError = "";
  state.isFading = false;
  hideYoutube(false);
  renderAll();
  if (showMessage) toast("Reproduccion detenida.");
}

function stopLocalDecks() {
  stopMainAudioElement(playerA, { clearSource: true });
  stopMainAudioElement(playerB, { clearSource: true });
  if (activeMainSource === "playerA" || activeMainSource === "playerB") setActiveMainSource(null);
  syncPlayingClass();
}

function handlePadAction(item) {
  if (!state.audioActivated) {
    showActivationRequired();
    return;
  }

  if (state.padMode === "next") {
    state.queue.unshift(cloneQueueItem(item));
    renderQueue();
    toast("Pad agregado como siguiente.");
    return;
  }

  if (state.padMode === "now") {
    playPadAsMain(item);
    return;
  }

  if (state.padMode === "queue") {
    state.queue.push(cloneQueueItem(item));
    renderQueue();
    toast("Pad agregado a la cola.");
    return;
  }

  playAuxiliaryPad(item);
}

function playPadAsMain(item) {
  const mainItem = cloneQueueItem(item);
  stopAuxiliaryPlayback({ restoreMain: true, showMessage: false });

  if (state.nowPlaying?.source === "youtube" && state.youtube.player?.setVolume) {
    const token = ++state.auxiliaryPlayback.duckToken;
    fadeYoutubeVolumeTo(0, PAD_DUCK_DOWN_MS, token);
    window.setTimeout(() => {
      if (state.auxiliaryPlayback.duckToken !== token) return;
      playItem(mainItem, false);
      setMasterVolume(state.masterVolume);
    }, PAD_DUCK_DOWN_MS + 40);
    return;
  }

  playItem(mainItem, true);
}

function playAuxiliaryPad(item) {
  if (!item || item.source !== "local") {
    toast("No se pudo reproducir la cuna.");
    return;
  }

  const sourceUrl = localAudioSource(item);
  if (!sourceUrl) {
    toast("Archivo local no disponible. Vuelva a seleccionar el archivo.");
    return;
  }

  const padItem = cloneQueueItem(item);
  stopAuxiliaryPlayback({ restoreMain: false, showMessage: false });
  const playToken = ++state.auxiliaryPlayback.playToken;

  state.auxiliaryPlayback.item = padItem;
  state.auxiliaryPlayback.status = "Preparando";
  auxiliaryPlayer.pause();
  auxiliaryPlayer.src = sourceUrl;
  auxiliaryPlayer.currentTime = 0;
  ensureAudibleLocalOutput(auxiliaryPlayer);
  auxiliaryPlayer.volume = outputVolume();
  auxiliaryPlayer.load();

  applyMainDucking();
  renderAuxiliaryPlayback();

  auxiliaryPlayer
    .play()
    .then(() => {
      if (state.auxiliaryPlayback.playToken !== playToken) return;
      state.auxiliaryPlayback.status = "Cuna al aire";
      addHistory(padItem, "Pad superpuesto");
      renderHistory();
      renderHeader();
      renderAuxiliaryPlayback();
      toast(`${padItem.type} al aire sobre la programacion.`);
    })
    .catch((error) => {
      if (state.auxiliaryPlayback.playToken !== playToken) return;
      const reason = isAutoplayBlock(error)
        ? "Reproduccion bloqueada hasta pulsar Activar audio."
        : "No se pudo reproducir la cuna.";
      if (isAutoplayBlock(error)) showActivationRequired();
      failAuxiliaryPlayback(reason);
    });
}

function finishAuxiliaryPlayback(status) {
  if (!state.auxiliaryPlayback.item) return;
  state.auxiliaryPlayback.status = status;
  stopAuxiliaryPlayback({ restoreMain: true, showMessage: false });
}

function failAuxiliaryPlayback(reason) {
  const item = state.auxiliaryPlayback.item;
  if (item) {
    addHistory(item, "Error");
    state.history[0].error = reason;
    renderHistory();
    renderHeader();
  }
  toast(reason);
  stopAuxiliaryPlayback({ restoreMain: true, showMessage: false });
}

function stopAuxiliaryPlayback({ restoreMain = true, showMessage = false } = {}) {
  const hadItem = Boolean(state.auxiliaryPlayback.item);
  state.auxiliaryPlayback.playToken += 1;
  auxiliaryPlayer.pause();
  auxiliaryPlayer.removeAttribute("src");
  auxiliaryPlayer.load();
  state.auxiliaryPlayback.item = null;
  state.auxiliaryPlayback.status = "Detenido";

  if (restoreMain) restoreMainVolume();
  renderAuxiliaryPlayback();
  if (showMessage && hadItem) toast("Cuna detenida.");
}

function applyMainDucking() {
  if (!state.nowPlaying) return;

  const hadStoredVolume =
    state.auxiliaryPlayback.previousInternalVolumes.length > 0 ||
    state.auxiliaryPlayback.previousYoutubeVolume !== null;

  if (!state.auxiliaryPlayback.ducking && !hadStoredVolume) {
    state.auxiliaryPlayback.previousInternalVolumes = [];
    state.auxiliaryPlayback.previousYoutubeVolume = null;
  }

  if (state.nowPlaying.source === "youtube" && state.auxiliaryPlayback.previousYoutubeVolume === null) {
    state.auxiliaryPlayback.previousYoutubeVolume = readYoutubeVolume();
  } else if (
    isInternalAudioSource(state.nowPlaying) &&
    !state.auxiliaryPlayback.previousInternalVolumes.length
  ) {
    state.auxiliaryPlayback.previousInternalVolumes = getMainInternalDecks().map(({ audio, source, index }) => ({
      source,
      index,
      volume: audio.volume || outputVolume(),
    }));
  }

  state.auxiliaryPlayback.ducking = true;
  const token = ++state.auxiliaryPlayback.duckToken;
  const targetAudioVolume = outputVolume() * PAD_DUCKING_RATIO;

  if (state.nowPlaying.source === "youtube") {
    fadeYoutubeVolumeTo(Math.round(readYoutubeVolume() * PAD_DUCKING_RATIO), PAD_DUCK_DOWN_MS, token);
    return;
  }

  if (isInternalAudioSource(state.nowPlaying)) {
    getMainInternalDecks().forEach(({ audio }) => {
      fadeAudioVolumeTo(audio, targetAudioVolume, PAD_DUCK_DOWN_MS, token);
    });
  }
}

function restoreMainDucking() {
  if (
    !state.auxiliaryPlayback.ducking &&
    !state.auxiliaryPlayback.previousInternalVolumes.length &&
    state.auxiliaryPlayback.previousYoutubeVolume === null
  ) {
    return;
  }

  const token = ++state.auxiliaryPlayback.duckToken;
  state.auxiliaryPlayback.ducking = false;

  state.auxiliaryPlayback.previousInternalVolumes.forEach(({ source, index, volume }) => {
    const audio = audioForMainSource(source) || decks[index];
    if (!audio) return;
    const target = state.muted ? 0 : Math.min(volume, outputVolume());
    fadeAudioVolumeTo(audio, target, PAD_RESTORE_MS, token);
  });

  if (state.auxiliaryPlayback.previousYoutubeVolume !== null) {
    const target = state.muted
      ? 0
      : Math.min(state.auxiliaryPlayback.previousYoutubeVolume, Math.round(outputVolume() * 100));
    fadeYoutubeVolumeTo(target, PAD_RESTORE_MS, token);
  }

  window.setTimeout(() => {
    if (state.auxiliaryPlayback.duckToken !== token || state.auxiliaryPlayback.ducking) return;
    state.auxiliaryPlayback.previousInternalVolumes = [];
    state.auxiliaryPlayback.previousYoutubeVolume = null;
  }, PAD_RESTORE_MS + 90);
}

function restoreMainVolume() {
  restoreMainDucking();
  window.setTimeout(() => {
    if (state.auxiliaryPlayback.ducking) return;
    decks.forEach((audio) => {
      audio.muted = false;
      if (!state.isFading) audio.volume = outputVolume();
    });
    streamingPlayer.muted = false;
    if (!state.isFading) streamingPlayer.volume = outputVolume();
    auxiliaryPlayer.volume = outputVolume();
  }, PAD_RESTORE_MS + 100);
}

function getMainInternalDecks() {
  if (!state.nowPlaying || !isInternalAudioSource(state.nowPlaying)) return [];

  if (activeMainSource === "streaming") {
    return streamingPlayer.currentSrc ? [{ audio: streamingPlayer, source: "streaming", index: -1 }] : [];
  }

  const indexes = new Set([state.activeDeck]);
  decks.forEach((audio, index) => {
    if (audio.currentSrc && !audio.paused && !audio.ended) indexes.add(index);
  });

  return Array.from(indexes)
    .map((index) => ({ audio: decks[index], source: sourceForDeck(index), index }))
    .filter(({ audio }) => audio.currentSrc);
}

function fadeAudioVolumeTo(audio, target, duration, token) {
  const startVolume = audio.volume;
  const safeTarget = clamp(target, 0, 1);
  const startedAt = performance.now();

  function frame(now) {
    if (state.auxiliaryPlayback.duckToken !== token) return;
    const progress = Math.min(1, (now - startedAt) / duration);
    audio.volume = startVolume + (safeTarget - startVolume) * progress;
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function fadeYoutubeVolumeTo(target, duration, token) {
  const player = state.youtube.player;
  if (!player?.setVolume) return;

  const startVolume = readYoutubeVolume();
  const safeTarget = Math.round(clamp(target, 0, 100));
  const startedAt = performance.now();

  function frame(now) {
    if (state.auxiliaryPlayback.duckToken !== token) return;
    const progress = Math.min(1, (now - startedAt) / duration);
    const volume = Math.round(startVolume + (safeTarget - startVolume) * progress);
    try {
      player.setVolume(volume);
    } catch {
      return;
    }
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function readYoutubeVolume() {
  try {
    return state.youtube.player?.getVolume?.() ?? Math.round(outputVolume() * 100);
  } catch {
    return Math.round(outputVolume() * 100);
  }
}

function localAudioSource(item) {
  if (!item) return "";
  if (item.source === "local") {
    if (item.available === false) return "";
    return item.objectUrl || item.url || "";
  }
  return item.url || "";
}

function revokeLocalObjectUrl(item) {
  const objectUrl = item.objectUrl || item.url;
  if (objectUrl?.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
  item.available = false;
  item.objectUrl = "";
  item.url = "";
}

function ensureAudibleLocalOutput(audio) {
  audio.muted = false;
  if (!Number.isFinite(state.masterVolume) || state.masterVolume <= 0 || state.muted) {
    state.muted = false;
    state.masterVolume = 1;
    if (dom.volumeSlider) dom.volumeSlider.value = "100";
  }
  const volume = outputVolume();
  audio.volume = Number.isFinite(volume) && volume > 0 ? volume : 1;
}

function waitForLocalMediaReady(audio) {
  if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("El archivo local no preparo audio a tiempo."));
    }, 8000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(mediaErrorMessage(audio)));
    };

    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
  });
}

function confirmLocalAudioProgress(item, audio, deckIndex) {
  const startedAt = audio.currentTime || 0;
  window.setTimeout(() => {
    if (state.nowPlaying !== item || state.activeDeck !== deckIndex || activeMainSource !== sourceForDeck(deckIndex)) return;
    console.log("Verificacion archivo local:", {
      name: item.name,
      currentTimeAdvanced: audio.currentTime > startedAt,
      currentTime: audio.currentTime,
      volume: audio.volume,
      muted: audio.muted,
      paused: audio.paused,
      currentSrc: audio.currentSrc,
    });
  }, 1400);
}

function syncPlayingClass() {
  const anyPlaying =
    decks.some((audio) => !audio.paused && !audio.ended) ||
    (!streamingPlayer.paused && !streamingPlayer.ended) ||
    safeYoutubeState() === 1;
  document.body.classList.toggle("is-playing", anyPlaying);
  renderTransport();
  renderAudioDiagnostics();
}

function addHistory(item, status = "Reproduciendo") {
  state.history.unshift({
    ...item,
    status,
    error: "",
    playedAt: Date.now(),
  });
  state.history = state.history.slice(0, 80);
}

function updateLatestHistory(status, error = "") {
  if (!state.history.length) return;
  const current = state.history.find((item) => {
    if (!state.nowPlaying) return false;
    if (item.queueId || state.nowPlaying.queueId) return item.queueId === state.nowPlaying.queueId;
    return item.id === state.nowPlaying.id;
  });
  if (!current) return;
  current.status = status;
  current.error = error;
}

function handlePlayRejection(error) {
  if (isAutoplayBlock(error)) {
    showActivationRequired();
    setNowError("Reproduccion bloqueada hasta pulsar Activar audio.");
    updateLatestHistory("Error", "Reproduccion bloqueada hasta pulsar Activar audio.");
    return;
  }
  const reason = playbackErrorDetails("No se pudo reanudar el audio.", error);
  handlePlaybackError(reason, true);
}

function handleLocalPlaybackFailure(item, audio, error) {
  const reason = isAutoplayBlock(error)
    ? "Reproduccion bloqueada hasta pulsar Activar audio."
    : playbackErrorDetails("No se pudo reproducir el archivo local.", error);

  console.error("No se pudo reproducir el archivo local:", error);
  console.log({
    muted: audio.muted,
    volume: audio.volume,
    paused: audio.paused,
    readyState: audio.readyState,
    networkState: audio.networkState,
    currentSrc: audio.currentSrc,
  });

  if (isAutoplayBlock(error)) showActivationRequired();

  if (state.nowPlaying === item) {
    setNowError(reason);
    setNowStatus("Error");
  } else {
    state.nowError = reason;
    state.nowStatus = "Error";
  }

  updateHistoryForItem(item, "Error", reason);
  item.status = "Error";
  toast(reason);
  renderNowPlaying();
  renderHistory();
  renderTransport();

  stopMainAudioElement(audio, { clearSource: true });
  if (getActiveMainPlayer() === audio) setActiveMainSource(null);
  clearPlaybackTimer();

  if (state.autoMode) {
    window.clearTimeout(state.pendingErrorSkip);
    state.pendingErrorSkip = window.setTimeout(() => advance(false), 3200);
  }
}

function handleStreamPlaybackFailure(item, audio, error) {
  const mediaReason = audio.error ? mediaErrorMessage(audio) : "";
  const reason = isAutoplayBlock(error)
    ? "Reproduccion bloqueada hasta pulsar Activar audio."
    : mediaReason || playbackErrorDetails("No se pudo reproducir la senal.", error);

  console.error("No se pudo reproducir la senal:", error);
  console.log({
    url: item?.url,
    muted: audio.muted,
    volume: audio.volume,
    paused: audio.paused,
    readyState: audio.readyState,
    networkState: audio.networkState,
    currentSrc: audio.currentSrc,
  });

  if (isAutoplayBlock(error)) showActivationRequired();

  if (state.nowPlaying === item) {
    setNowError(reason);
    setNowStatus("Error");
  } else {
    state.nowError = reason;
    state.nowStatus = "Error";
  }

  updateHistoryForItem(item, "Error", reason);
  item.status = "Error";
  setStreamStatus(reason);
  toast(reason);
  renderNowPlaying();
  renderHistory();
  renderTransport();

  stopMainAudioElement(audio, { clearSource: true });
  if (getActiveMainPlayer() === audio) setActiveMainSource(null);
  clearPlaybackTimer();

  if (state.autoMode) {
    window.clearTimeout(state.pendingErrorSkip);
    state.pendingErrorSkip = window.setTimeout(() => advance(false), 3200);
  }
}

function updateHistoryForItem(item, status, error = "") {
  const current = state.history.find((entry) => {
    if (item.queueId || entry.queueId) return entry.queueId === item.queueId;
    return entry.id === item.id;
  });
  if (!current) return;
  current.status = status;
  current.error = error;
}

function playbackErrorDetails(prefix, error) {
  const name = error?.name || "Error";
  const message = error?.message || "";
  return message ? `${prefix} ${name} - ${message}` : `${prefix} ${name}`;
}

function handlePlaybackError(reason, skipWhenAuto) {
  setNowError(reason);
  setNowStatus("Error");
  updateLatestHistory("Error", reason);
  toast(reason);
  renderHistory();

  if (state.nowPlaying?.source === "youtube") {
    stopYoutubePlayback(false);
  }

  if (isInternalAudioSource(state.nowPlaying)) {
    const active = getActiveMainPlayer();
    if (active instanceof HTMLMediaElement) {
      stopMainAudioElement(active, { clearSource: true });
    }
  }
  clearPlaybackTimer();
  setActiveMainSource(null);

  if (state.autoMode && skipWhenAuto) {
    window.clearTimeout(state.pendingErrorSkip);
    state.pendingErrorSkip = window.setTimeout(() => {
      advance(false);
    }, 3200);
  }
}

function handleYoutubePlaybackError(reason, skipWhenAuto) {
  if (!state.nowPlaying || state.nowPlaying.source !== "youtube") return;

  window.clearTimeout(state.youtube.watchdogTimer);
  stopYoutubePlayback(false);
  stopYoutubeProgress();
  setActiveMainSource(null);
  setNowError(reason);
  setNowStatus("Error");
  updateLatestHistory("Error", reason);
  toast(reason);
  renderHistory();

  if (state.autoMode && skipWhenAuto) {
    window.clearTimeout(state.pendingErrorSkip);
    state.pendingErrorSkip = window.setTimeout(() => {
      advance(false);
    }, 2000);
  }
}

async function addYoutubeToQueue() {
  const item = createYoutubeItemFromInput();
  if (!item) return;

  state.queue.push(item);
  dom.youtubeUrl.value = "";
  setYoutubeStatus(item.name, "Agregado a la cola como contenido YouTube.");
  renderQueue();
  toast("YouTube agregado a la cola.");
}

function addYoutubeAsNext() {
  const item = createYoutubeItemFromInput();
  if (!item) return;
  state.queue.unshift(item);
  setYoutubeStatus(item.name, "Agregado como siguiente contenido.");
  renderQueue();
  toast("YouTube agregado como siguiente.");
}

function playYoutubeFromInput() {
  const item = createYoutubeItemFromInput();
  if (!item) return;
  playItem(item, true);
}

function createYoutubeItemFromInput() {
  const url = dom.youtubeUrl.value.trim();
  const videoId = parseYoutubeId(url);
  const playlistId = parseYoutubePlaylist(url);

  if (!videoId && !playlistId) {
    setYoutubeStatus("YouTube sin cargar", "Pega un enlace valido de YouTube.");
    toast("Pega un enlace valido de YouTube.");
    return null;
  }

  return {
    id: makeId(),
    source: "youtube",
    type: "YouTube",
    status: "Pendiente",
    name: playlistId && !videoId ? "Playlist de YouTube" : "Video de YouTube",
    artist: "Fuente externa",
    duration: 0,
    category: playlistId ? "Playlist" : "Video",
    url,
    videoId,
    playlistId,
  };
}

async function previewStream() {
  const url = dom.streamUrl.value.trim();
  if (!url) {
    setStreamStatus("Pega una URL de streaming.");
    return;
  }

  if (!state.audioActivated) {
    showActivationRequired();
    return;
  }

  if (state.streamPreview.audio && state.streamPreview.url === url) {
    if (state.streamPreview.audio.paused) {
      state.streamPreview.audio
        .play()
        .then(() => setStreamStatus("Reproduciendo."))
        .catch((error) => handlePreviewStreamError(error));
      dom.previewStreamBtn.textContent = "Pausa";
    } else {
      state.streamPreview.audio.pause();
      setStreamStatus("Pausado.");
      dom.previewStreamBtn.textContent = "Escuchar";
    }
    return;
  }

  stopStreamPreview(false);
  setStreamStatus("Conectando...");

  const validation = await validateDirectAudioUrl(url);
  if (!validation.ok) {
    setStreamStatus(validation.reason);
    toast(validation.reason);
    return;
  }

  const audio = streamPreviewPlayer;
  audio.pause();
  audio.src = url;
  try {
    audio.currentTime = 0;
  } catch {
    // Live streams can refuse seeking before they connect.
  }
  audio.volume = outputVolume();
  state.streamPreview.audio = audio;
  state.streamPreview.url = url;

  audio.onplaying = () => {
    state.streamConnectedAt = Date.now();
    setStreamStatus("Reproduciendo.");
    dom.previewStreamBtn.textContent = "Pausa";
  };
  audio.onwaiting = () => setStreamStatus("Conectando...");
  audio.onpause = () => {
    if (state.streamPreview.audio === audio) {
      dom.previewStreamBtn.textContent = "Escuchar";
    }
  };
  audio.onerror = () => {
    setStreamStatus(mediaErrorMessage(audio));
    dom.previewStreamBtn.textContent = "Escuchar";
  };

  audio.play().catch((error) => handlePreviewStreamError(error));
}

function handlePreviewStreamError(error) {
  if (isAutoplayBlock(error)) {
    showActivationRequired();
    setStreamStatus("Reproduccion bloqueada hasta pulsar Activar audio.");
  } else {
    setStreamStatus("Servidor de streaming sin conexion o URL no compatible.");
  }
  dom.previewStreamBtn.textContent = "Escuchar";
}

async function addStreamToQueue() {
  const item = await createStreamItemFromInput();
  if (!item) return;

  state.queue.push(item);
  dom.streamUrl.value = "";
  setStreamStatus("Senal agregada a la cola.");
  renderQueue();
  toast("Streaming agregado a la cola.");
}

async function addStreamAsNext() {
  const item = await createStreamItemFromInput();
  if (!item) return;

  state.queue.unshift(item);
  setStreamStatus("Senal agregada como siguiente.");
  renderQueue();
  toast("Streaming agregado como siguiente.");
}

async function createStreamItemFromInput() {
  const url = dom.streamUrl.value.trim();
  if (!url) {
    setStreamStatus("Pega una URL de streaming.");
    return null;
  }

  setStreamStatus("Comprobando enlace...");
  const validation = await validateDirectAudioUrl(url);
  if (!validation.ok) {
    setStreamStatus(validation.reason);
    toast(validation.reason);
    return null;
  }

  return {
    id: makeId(),
    source: "stream",
    type: "Stream",
    status: "Pendiente",
    name: streamNameFromUrl(url),
    artist: "URL directa",
    duration: 0,
    category: "Streaming",
    url,
  };
}

function stopStreamPreview(showMessage) {
  if (!state.streamPreview.audio) return;
  state.streamPreview.audio.pause();
  state.streamPreview.audio.removeAttribute("src");
  state.streamPreview.audio.load();
  state.streamPreview.audio.onplaying = null;
  state.streamPreview.audio.onwaiting = null;
  state.streamPreview.audio.onpause = null;
  state.streamPreview.audio.onerror = null;
  state.streamPreview.audio = null;
  state.streamPreview.url = "";
  state.streamConnectedAt = 0;
  dom.previewStreamBtn.textContent = "Escuchar";
  setStreamStatus("Sin conectar.");
  if (showMessage) toast("Streaming detenido.");
}

async function validateDirectAudioUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "URL no valida." };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, reason: "La URL debe empezar con http:// o https://." };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    if ([403, 405].includes(response.status)) {
      return { ok: true, warning: "El servidor no permite comprobar antes; se probara al reproducir." };
    }

    if (contentType.includes("text/html")) {
      return {
        ok: false,
        reason: "Este enlace es una pagina, no una senal directa de audio.",
      };
    }

    if (contentType && !isAudioContentType(contentType)) {
      return {
        ok: false,
        reason: "URL no es audio directo.",
      };
    }

    if (!response.ok && response.status >= 400) {
      return {
        ok: false,
        reason: "Servidor de streaming sin conexion.",
      };
    }
  } catch {
    // Some audio servers block HEAD/CORS checks but still allow media playback.
    return { ok: true, warning: "Comprobacion limitada; se probara con el reproductor interno." };
  } finally {
    window.clearTimeout(timeout);
  }

  return { ok: true };
}

function ensureYoutubePlayer() {
  if (state.youtube.player && state.youtube.ready) {
    return Promise.resolve(state.youtube.player);
  }
  if (state.youtube.readyPromise) return state.youtube.readyPromise;

  state.youtube.readyPromise = loadYoutubeApi()
    .then(
      () =>
        new Promise((resolve) => {
        if (state.youtube.player && state.youtube.ready) {
          resolve(state.youtube.player);
          return;
        }
        if (state.youtube.player) return;

        state.youtube.player = new YT.Player("youtubePlayer", {
          width: "100%",
          height: "180",
          playerVars: {
            enablejsapi: 1,
            playsinline: 1,
            origin: window.location.origin,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              state.youtube.ready = true;
              dom.youtubeFrame.classList.add("is-ready");
              resolve(state.youtube.player);
            },
            onStateChange: onYoutubeStateChange,
            onError: onYoutubeError,
            onAutoplayBlocked: () => {
              handleYoutubePlaybackError("Reproduccion bloqueada hasta pulsar Activar audio.", false);
            },
          },
        });
        }),
    )
    .catch((error) => {
      state.youtube.readyPromise = null;
      throw error;
    });

  return state.youtube.readyPromise;
}

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (state.youtube.apiPromise) return state.youtube.apiPromise;

  state.youtube.apiPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") previousCallback();
      resolve();
    };

    const script = document.createElement("script");
    script.src = YOUTUBE_API_SRC;
    script.async = true;
    script.onerror = () => reject(new Error("YouTube API failed"));
    document.head.appendChild(script);
  });

  return state.youtube.apiPromise;
}

function onYoutubeStateChange(event) {
  if (!state.nowPlaying || state.nowPlaying.source !== "youtube") return;
  if (state.youtube.currentItem !== state.nowPlaying) return;
  const playerState = event.data;
  console.log("Estado YouTube:", playerState);

  if (playerState === YT.PlayerState.PLAYING) {
    window.clearTimeout(state.youtube.watchdogTimer);
    const item = state.nowPlaying;
    const data = state.youtube.player.getVideoData?.() || {};
    const duration = state.youtube.player.getDuration?.() || 0;
    setActiveMainSource("youtube");
    if (data.title) item.name = data.title;
    if (duration) item.duration = duration;
    setYoutubeStatus(item.name, "Reproduciendo.");
    setNowError("");
    setNowStatus("Reproduciendo");
    updateLatestHistory("Reproduciendo");
    startYoutubeProgress();
    if (state.auxiliaryPlayback.item) applyMainDucking();
    renderAll();
  }

  if (playerState === YT.PlayerState.UNSTARTED) {
    setNowStatus("Preparando");
    setYoutubeStatus(state.nowPlaying.name, "Preparando.");
  }

  if (playerState === YT.PlayerState.PAUSED) {
    stopYoutubeProgress();
    setNowStatus("Pausado");
    setYoutubeStatus(state.nowPlaying.name, "Pausado.");
  }

  if (playerState === YT.PlayerState.BUFFERING) {
    setNowStatus("Conectando");
    setYoutubeStatus(state.nowPlaying.name, "Conectando...");
  }

  if (playerState === YT.PlayerState.CUED) {
    setNowStatus("Preparado");
    setYoutubeStatus(state.nowPlaying.name, "Preparado.");
  }

  if (playerState === YT.PlayerState.ENDED) {
    const item = state.nowPlaying;
    const endedKey = item.queueId || item.id || item.videoId || "";
    if (state.youtube.lastEndedKey === endedKey) return;
    state.youtube.lastEndedKey = endedKey;
    console.log("Elemento terminado:", item);
    stopYoutubeProgress();
    setActiveMainSource(null);
    updateLatestHistory("Reproducido");
    advance(true);
  }
}

function onYoutubeError(event) {
  console.log("YouTube onError:", event.data);
  if (!state.nowPlaying || state.nowPlaying.source !== "youtube") return;
  if (state.youtube.currentItem !== state.nowPlaying) return;

  const messages = {
    2: "Identificador de YouTube incorrecto.",
    5: "No se pudo reproducir este contenido en el reproductor HTML5.",
    100: "El video fue eliminado, es privado o no esta disponible.",
    101: "El propietario de este contenido no permite reproducirlo dentro de otras aplicaciones.",
    150: "El propietario de este contenido no permite reproducirlo dentro de otras aplicaciones.",
    153: "YouTube no recibio una identificacion valida del sitio. Abra la aplicacion desde localhost o HTTPS.",
  };
  const reason = messages[event.data] || `YouTube reporto un error (${event.data}).`;
  handleYoutubePlaybackError(reason, true);
}

function toggleYoutubePlayback() {
  const player = state.youtube.player;
  if (!player || !state.youtube.ready) {
    toast("YouTube aun no esta listo.");
    return;
  }

  const playerState = safeYoutubeState();
  if (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.BUFFERING) {
    player.pauseVideo();
    stopYoutubeProgress();
    setNowStatus("Pausado");
  } else {
    setNowError("");
    setActiveMainSource("youtube");
    player.playVideo();
    setNowStatus("Preparando");
  }
  renderTransport();
}

function stopYoutubePlayback(resetStatus) {
  stopYoutubeProgress();
  window.clearTimeout(state.youtube.watchdogTimer);
  if (state.youtube.player && state.youtube.ready) {
    try {
      state.youtube.player.stopVideo();
    } catch {
      // The iframe can be unavailable while the API is still loading.
    }
  }
  state.youtube.currentItem = null;
  if (resetStatus) setYoutubeStatus("YouTube sin cargar", "Pegue un video o playlist publica.");
}

function startYoutubeProgress() {
  startPlaybackTimer();
}

function stopYoutubeProgress() {
  clearPlaybackTimer();
}

function safeYoutubeState() {
  try {
    return state.youtube.player?.getPlayerState?.();
  } catch {
    return -1;
  }
}

function showYoutubePanel() {
  dom.youtubeFrame.classList.add("is-ready");
}

function hideYoutube(resetText = true) {
  if (resetText) setYoutubeStatus("YouTube sin cargar", "Pegue un video o playlist publica.");
}

function renderAll() {
  renderHeader();
  renderAudioGate();
  renderNowPlaying();
  renderQueue();
  renderLibrary();
  renderPads();
  renderAuxiliaryPlayback();
  renderHistory();
  renderTransport();
  renderStreamStatus();
  renderWorkbench();
  renderAudioDiagnostics();
  setSourceView(state.sourceView);
}

function renderHeader() {
  dom.autoToggle.textContent = state.autoMode ? "Automatico" : "Manual";
  dom.autoToggle.classList.toggle("is-auto", state.autoMode);
  dom.audioStatus.textContent = state.audioActivated ? "Activado" : "Inactivo";
  dom.libraryCount.textContent = state.library.length;
  dom.queueCount.textContent = state.queue.length;
  dom.historyCount.textContent = state.history.length;
}

function renderAudioGate(
  activated = state.audioActivated,
  title = state.audioActivated ? "Audio activado" : "Audio pendiente de activacion",
  message = state.audioActivated
    ? "La cola puede continuar automaticamente durante esta sesion."
    : "Pulse Activar audio una vez para que la cola pueda continuar automaticamente dentro de la app.",
  disableButton = state.audioActivated,
) {
  const fileMode = isFileProtocolMode();
  if (fileMode) {
    title = activated ? "Audio activado, pero falta localhost" : "Abra la app desde localhost";
    message = `Esta pestana esta abierta como archivo. Cierre esta pestana y abra "${LOCAL_STARTER_NAME}" para que YouTube y los enlaces funcionen correctamente.`;
  }
  dom.audioGate.classList.toggle("is-active", activated);
  dom.audioGate.classList.toggle("is-error", fileMode || (!activated && title !== "Audio pendiente de activacion"));
  dom.activateAudioBtn.disabled = disableButton;
  dom.activateAudioBtn.textContent = activated ? "AUDIO ACTIVADO" : "ACTIVAR AUDIO";
  dom.audioGateTitle.textContent = title;
  dom.audioGateMessage.textContent = message;
  renderHeader();
}

function renderNowPlaying() {
  const item = state.nowPlaying;
  dom.activeDeck.textContent = activeMainSourceLabel();
  dom.nowStatus.textContent = state.nowStatus;
  dom.nowError.textContent = state.nowError;

  if (!item) {
    dom.onAirTitle.textContent = "Sin audio cargado";
    dom.coverType.textContent = "RADIO";
    dom.nowTitle.textContent = "Carga audios para comenzar";
    dom.nowArtist.textContent = "El navegador reproducira los archivos que selecciones.";
    dom.progressFill.style.width = "0%";
    dom.elapsedTime.textContent = "00:00";
    dom.remainingTime.textContent = "-00:00";
    if (dom.headerRemainingTime) dom.headerRemainingTime.textContent = "-00:00";
    return;
  }

  dom.onAirTitle.textContent = item.type;
  dom.coverType.textContent = item.type.toUpperCase().slice(0, 7);
  dom.nowTitle.textContent = item.name;
  dom.nowArtist.textContent = item.artist || item.category || "Sin artista";
  updateProgress();
}

function updateProgress() {
  const item = state.nowPlaying;
  if (!item) {
    dom.progressFill.style.width = "0%";
    dom.elapsedTime.textContent = "00:00";
    dom.remainingTime.textContent = "-00:00";
    if (dom.headerRemainingTime) dom.headerRemainingTime.textContent = "-00:00";
    return;
  }

  if (item.source === "youtube") {
    updateYoutubeProgress(item);
    return;
  }

  if (item.source === "stream") {
    const elapsed = state.streamConnectedAt
      ? (Date.now() - state.streamConnectedAt) / 1000
      : streamingPlayer.currentTime || 0;
    dom.progressFill.style.width = "100%";
    dom.elapsedTime.textContent = formatTime(elapsed);
    dom.remainingTime.textContent = "EN VIVO";
    if (dom.headerRemainingTime) dom.headerRemainingTime.textContent = "EN VIVO";
    return;
  }

  const active = getActiveMainPlayer() || decks[state.activeDeck];
  const duration = Number.isFinite(active.duration) ? active.duration : item.duration || 0;
  const elapsed = active.currentTime || 0;

  if (!Number.isFinite(duration) || duration <= 0) {
    dom.progressFill.style.width = "0%";
    dom.elapsedTime.textContent = formatTime(elapsed);
    dom.remainingTime.textContent = item.source === "stream" ? "EN VIVO" : "-00:00";
    if (dom.headerRemainingTime) dom.headerRemainingTime.textContent = dom.remainingTime.textContent;
    return;
  }

  const progress = Math.min(100, (elapsed / duration) * 100);
  dom.progressFill.style.width = `${progress}%`;
  dom.elapsedTime.textContent = formatTime(elapsed);
  dom.remainingTime.textContent = `-${formatTime(Math.max(0, duration - elapsed))}`;
  if (dom.headerRemainingTime) dom.headerRemainingTime.textContent = dom.remainingTime.textContent;
}

function updateYoutubeProgress(item) {
  const player = state.youtube.player;
  let elapsed = 0;
  let duration = item.duration || 0;

  try {
    elapsed = player?.getCurrentTime?.() || 0;
    duration = player?.getDuration?.() || duration || 0;
  } catch {
    elapsed = 0;
  }

  if (duration) item.duration = duration;
  const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  dom.progressFill.style.width = `${progress}%`;
  dom.elapsedTime.textContent = formatTime(elapsed);
  dom.remainingTime.textContent = duration ? `-${formatTime(Math.max(0, duration - elapsed))}` : "-00:00";
  if (dom.headerRemainingTime) dom.headerRemainingTime.textContent = dom.remainingTime.textContent;
}

function renderTransport() {
  const playing = isActiveMainPlaying();

  dom.playPauseBtn.textContent = playing ? "Pause" : "Play";
  if (dom.pauseBtn) dom.pauseBtn.disabled = !state.nowPlaying || !playing;
  dom.fadeBtn.disabled = !state.nowPlaying || state.nowPlaying.source === "youtube";
  dom.nextBtn.disabled = isChangingTrack || (!state.queue.length && !state.autoMode);
  dom.stopBtn.disabled = !state.nowPlaying && !state.auxiliaryPlayback.item;
  if (dom.restartBtn) dom.restartBtn.disabled = !state.nowPlaying;
  if (dom.bottomAutoBtn) dom.bottomAutoBtn.classList.toggle("is-active", state.autoMode);
  if (dom.bottomManualBtn) dom.bottomManualBtn.classList.toggle("is-active", !state.autoMode);
  if (dom.cueBtn) dom.cueBtn.disabled = !state.queue.length && !state.autoMode;
  if (dom.muteBtn) dom.muteBtn.textContent = state.muted ? "Unmute" : "Mute";
}

function renderAuxiliaryPlayback() {
  if (!dom.padOverlayStatus) return;

  const item = state.auxiliaryPlayback.item;
  const hasItem = Boolean(item);
  dom.padOverlayStatus.hidden = !hasItem;
  dom.padOverlayStatus.classList.toggle("is-active", hasItem && !auxiliaryPlayer.paused);

  if (!hasItem) {
    dom.padOverlayTitle.textContent = "Pads listos";
    dom.padOverlayMeta.textContent = "Superposicion independiente";
    return;
  }

  const duration = Number.isFinite(auxiliaryPlayer.duration)
    ? auxiliaryPlayer.duration
    : item.duration || 0;
  const elapsed = auxiliaryPlayer.currentTime || 0;
  const remaining = duration ? Math.max(0, duration - elapsed) : 0;
  dom.padOverlayTitle.textContent = `Cuna al aire: ${item.name}`;
  dom.padOverlayMeta.textContent = duration
    ? `${state.auxiliaryPlayback.status} - resta ${formatTime(remaining)}`
    : state.auxiliaryPlayback.status;
}

function renderQueue() {
  renderHeader();
  const next = state.queue[0];
  dom.nextType.textContent = next ? next.type : "Pendiente";
  dom.nextName.textContent = next ? next.name : "Agrega canciones o cunas";
  dom.nextTime.textContent = next ? `Hora estimada: ${estimateNextTime()}` : "Hora estimada: --:--";

  if (!state.queue.length) {
    dom.queueList.innerHTML = '<div class="empty-cell">No hay elementos en cola.</div>';
    renderTransport();
    return;
  }

  dom.queueList.innerHTML = state.queue
    .map(
      (item, index) => `
        <div class="queue-item ${typeClass(item)} ${index === 0 ? "is-next" : ""}">
          <div class="queue-number">${String(index + 1).padStart(2, "0")}</div>
          <div class="queue-type">${escapeHtml(item.type)}</div>
          <div class="queue-main">
            <strong class="queue-title">${escapeHtml(item.name)}</strong>
            <span class="queue-meta">${escapeHtml(item.artist || item.category || "Sin dato")} - ${formatTime(item.duration)}</span>
          </div>
          <div class="queue-time">
            <span>${estimatedClockForQueue(index)}</span>
            <span>${formatTime(item.duration)}</span>
          </div>
          <div class="queue-status">
            <span>${escapeHtml(item.status || "Pendiente")}</span>
            <div class="queue-actions">
              <button type="button" data-queue-play="${index}" aria-label="Reproducir ahora">Play</button>
              <button type="button" data-queue-up="${index}" aria-label="Subir">Subir</button>
              <button type="button" data-queue-down="${index}" aria-label="Bajar">Bajar</button>
              <button type="button" data-queue-remove="${index}" aria-label="Eliminar">X</button>
            </div>
          </div>
        </div>
      `,
    )
    .join("");

  dom.queueList.querySelectorAll("[data-queue-play]").forEach((button) => {
    button.addEventListener("click", () => playQueuedItemAt(Number(button.dataset.queuePlay)));
  });
  dom.queueList.querySelectorAll("[data-queue-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.queue.splice(Number(button.dataset.queueRemove), 1);
      renderQueue();
    });
  });
  dom.queueList.querySelectorAll("[data-queue-up]").forEach((button) => {
    button.addEventListener("click", () => moveQueueItem(Number(button.dataset.queueUp), -1));
  });
  dom.queueList.querySelectorAll("[data-queue-down]").forEach((button) => {
    button.addEventListener("click", () => moveQueueItem(Number(button.dataset.queueDown), 1));
  });
  renderTransport();
}

function renderLibrary() {
  const search = normalize(dom.librarySearch?.value || "");
  const typeFilter = dom.libraryTypeFilter?.value || "Todos";
  const categoryFilter = normalize(dom.libraryCategoryFilter?.value || "");
  const visibleLibrary = state.library.filter((item) => {
    const matchesSearch =
      !search ||
      normalize(item.name).includes(search) ||
      normalize(item.artist).includes(search) ||
      normalize(item.category).includes(search);
    const matchesType = typeFilter === "Todos" || item.type === typeFilter;
    const matchesCategory = !categoryFilter || normalize(item.category).includes(categoryFilter);
    return matchesSearch && matchesType && matchesCategory;
  });

  if (!state.library.length) {
    dom.libraryTable.innerHTML =
      '<tr><td colspan="7" class="empty-cell">Todavia no hay audios importados.</td></tr>';
    return;
  }

  if (!visibleLibrary.length) {
    dom.libraryTable.innerHTML =
      '<tr><td colspan="7" class="empty-cell">No hay resultados con esos filtros.</td></tr>';
    return;
  }

  dom.libraryTable.innerHTML = visibleLibrary
    .map(
      (item) => `
        <tr>
          <td>
            <select data-field="type" data-id="${item.id}" aria-label="Tipo">
              ${["Musica", "Cuna", "ID", "Cortina", "Programa", "Efecto"]
                .map((type) => `<option ${item.type === type ? "selected" : ""}>${type}</option>`)
                .join("")}
            </select>
          </td>
          <td>${escapeHtml(item.name)}</td>
          <td><input data-field="artist" data-id="${item.id}" value="${escapeAttribute(item.artist)}" aria-label="Artista o cliente" /></td>
          <td>${formatTime(item.duration)}</td>
          <td><input data-field="category" data-id="${item.id}" value="${escapeAttribute(item.category)}" aria-label="Categoria" /></td>
          <td>${escapeHtml(item.status || "Disponible")}</td>
          <td>
            <div class="table-actions">
              <button class="table-action" type="button" data-add="${item.id}">Cola</button>
              <button class="table-action" type="button" data-add-next="${item.id}">Siguiente</button>
              <button class="table-action" type="button" data-preview="${item.id}">Preescuchar</button>
              <button class="table-action" type="button" data-remove-library="${item.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  dom.libraryTable.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("change", () => {
      const item = state.library.find((entry) => entry.id === field.dataset.id);
      if (!item) return;
      item[field.dataset.field] = field.value;
      saveLibraryMetadataForItem(item);
      renderPads();
    });
  });

  dom.libraryTable.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.library.find((entry) => entry.id === button.dataset.add);
      if (!item) return;
      state.queue.push(cloneQueueItem(item));
      renderQueue();
      toast("Agregado a la cola.");
    });
  });

  dom.libraryTable.querySelectorAll("[data-add-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.library.find((entry) => entry.id === button.dataset.addNext);
      if (!item) return;
      state.queue.unshift(cloneQueueItem(item));
      renderQueue();
      toast("Agregado como siguiente.");
    });
  });

  dom.libraryTable.querySelectorAll("[data-preview]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.library.find((entry) => entry.id === button.dataset.preview);
      if (!item) return;
      playItem(cloneQueueItem(item), false);
    });
  });

  dom.libraryTable.querySelectorAll("[data-remove-library]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = state.library.findIndex((entry) => entry.id === button.dataset.removeLibrary);
      if (index < 0) return;
      const [item] = state.library.splice(index, 1);
      if (item?.source === "local") revokeLocalObjectUrl(item);
      removeLibraryMetadataForItem(item);
      renderAll();
      toast("Elemento eliminado de biblioteca.");
    });
  });
}

function renderPads() {
  const padTypes = ["ID", "Cuna", "Cortina", "Efecto", "Programa"];
  const padItems = state.library
    .filter((item) => padTypes.includes(item.type))
    .filter((item) => state.padFilter === "Todos" || item.type === state.padFilter)
    .slice(0, 24);
  const placeholders = Math.max(0, 24 - padItems.length);

  dom.padFilterButtons.forEach((button) => {
    button.classList.toggle("is-active", (button.dataset.padFilter || "Todos") === state.padFilter);
  });
  if (dom.padModeSelect) dom.padModeSelect.value = state.padMode;

  dom.padGrid.innerHTML =
    padItems
      .map(
        (item) => `
          <button class="pad-action ${typeClass(item)}" type="button" data-pad="${item.id}">
            <strong>${escapeHtml(shortPadName(item.name))}</strong>
            <span>${escapeHtml(item.name)}</span>
            <span class="pad-duration">${escapeHtml(item.type)} - ${formatTime(item.duration)}</span>
          </button>
        `,
      )
      .join("") +
    Array.from({ length: placeholders })
      .map(
        (_, index) => `
          <button class="pad-action is-empty" type="button" disabled>
            <strong>Pad ${padItems.length + index + 1}</strong>
            <span>${state.padFilter === "Todos" ? "Importa cunas, IDs o efectos" : `Sin ${state.padFilter}`}</span>
            <span class="pad-duration">--:--</span>
          </button>
        `,
      )
      .join("");

  dom.padGrid.querySelectorAll("[data-pad]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.library.find((entry) => entry.id === button.dataset.pad);
      if (!item) return;
      handlePadAction(item);
    });
  });

  renderAuxiliaryPlayback();
}

function renderHistory() {
  renderHeader();
  if (!state.history.length) {
    dom.historyList.innerHTML = '<div class="empty-cell">Aun no se ha reproducido contenido.</div>';
    return;
  }

  const search = normalize(dom.historySearch?.value || "");
  const dateFilter = dom.historyDateFilter?.value || "";
  const typeFilter = dom.historyTypeFilter?.value || "Todos";
  const visibleHistory = state.history.filter((item) => {
    const date = new Date(item.playedAt).toISOString().slice(0, 10);
    const matchesDate = !dateFilter || date === dateFilter;
    const matchesType = typeFilter === "Todos" || item.type === typeFilter;
    const matchesSearch =
      !search ||
      normalize(item.name).includes(search) ||
      normalize(item.artist).includes(search) ||
      normalize(item.type).includes(search) ||
      normalize(item.error).includes(search);
    return matchesDate && matchesType && matchesSearch;
  });

  if (!visibleHistory.length) {
    dom.historyList.innerHTML = '<div class="empty-cell">No hay resultados con esos filtros.</div>';
    return;
  }

  dom.historyList.innerHTML = `
    <div class="data-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Titulo</th>
            <th>Fuente</th>
            <th>Tipo</th>
            <th>Duracion</th>
            <th>Estado</th>
            <th>Motivo de error</th>
          </tr>
        </thead>
        <tbody>
          ${visibleHistory
            .map((item) => {
              const played = new Date(item.playedAt);
              return `
                <tr>
                  <td>${played.toLocaleDateString("es")}</td>
                  <td>${formatClock(item.playedAt)}</td>
                  <td>${escapeHtml(item.name)}</td>
                  <td>${escapeHtml(item.artist || item.source || "")}</td>
                  <td>${escapeHtml(item.type)}</td>
                  <td>${formatTime(item.duration)}</td>
                  <td>${escapeHtml(item.status || "Reproducido")}</td>
                  <td>${escapeHtml(item.error || "")}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStreamStatus() {
  dom.streamStatus.textContent = state.streamPreview.status;
  if (dom.streamConnectedTime) {
    if (state.streamConnectedAt) {
      dom.streamConnectedTime.textContent = `Tiempo conectado: ${formatTime((Date.now() - state.streamConnectedAt) / 1000)}`;
    } else {
      dom.streamConnectedTime.textContent = "Tiempo conectado: 00:00";
    }
  }
}

function renderAudioDiagnostics() {
  if (!dom.audioDiagnostics) return;
  const diagnostic = {
    activeMainSource,
    activeDeck: activeMainSourceLabel(),
    tituloActual: state.nowPlaying?.name || "",
    playerASrc: playerA.currentSrc || "",
    playerBSrc: playerB.currentSrc || "",
    streamingSrc: streamingPlayer.currentSrc || "",
    youtubeState: safeYoutubeState(),
    playerAPaused: playerA.paused,
    playerBPaused: playerB.paused,
    streamingPaused: streamingPlayer.paused,
    playerACurrentTime: Number(playerA.currentTime || 0).toFixed(2),
    playerBCurrentTime: Number(playerB.currentTime || 0).toFixed(2),
    streamingCurrentTime: Number(streamingPlayer.currentTime || 0).toFixed(2),
    timersActivos: playbackTimer ? 1 : 0,
    isChangingTrack,
    isCrossfading: state.isFading,
  };
  dom.audioDiagnostics.textContent = JSON.stringify(diagnostic, null, 2);
}

function updateImportStatus(title, text) {
  if (dom.importStatusTitle) dom.importStatusTitle.textContent = title;
  if (dom.importStatusText) dom.importStatusText.textContent = text;
}

function renderSelectedFiles(items) {
  if (!dom.selectedFilesList) return;
  if (!items.length) {
    dom.selectedFilesList.innerHTML = '<div class="empty-cell">No se importaron archivos nuevos.</div>';
    return;
  }

  dom.selectedFilesList.innerHTML = items
    .map(
      (item) => `
        <div class="selected-file-row">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.type)} - ${escapeHtml(item.category)} - ${formatTime(item.duration)}</span>
        </div>
      `,
    )
    .join("");
}

function playQueuedItemAt(index) {
  if (index < 0 || index >= state.queue.length) return;
  const [item] = state.queue.splice(index, 1);
  renderQueue();
  playQueueItem(item, true);
}

function moveQueueItem(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= state.queue.length) return;
  const [item] = state.queue.splice(index, 1);
  state.queue.splice(target, 0, item);
  renderQueue();
}

function saveSettingsFromInputs() {
  state.settings = {
    commercialEvery: clamp(Number(dom.commercialEvery.value), 1, 12),
    idEvery: clamp(Number(dom.idEvery.value), 5, 120),
    crossfadeSeconds: clamp(Number(dom.crossfadeSeconds.value), 0, 12),
    artistRepeatMinutes: clamp(Number(dom.artistRepeatMinutes.value), 0, 240),
  };
  localStorage.setItem("venevo-radio-settings", JSON.stringify(state.settings));
  toast("Configuracion guardada en este navegador.");
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("venevo-radio-settings") || "null");
    if (saved) {
      state.settings = { ...state.settings, ...saved };
    }
  } catch {
    // If local storage contains older invalid data, the defaults are safer.
  }

  dom.commercialEvery.value = state.settings.commercialEvery;
  dom.idEvery.value = state.settings.idEvery;
  dom.crossfadeSeconds.value = state.settings.crossfadeSeconds;
  dom.artistRepeatMinutes.value = state.settings.artistRepeatMinutes;
}

function exportHistory() {
  if (!state.history.length) {
    toast("No hay historial para exportar.");
    return;
  }

  const rows = [["Hora", "Tipo", "Nombre", "Artista/cliente", "Duracion", "Categoria", "Estado", "Error"]];
  state.history.forEach((item) => {
    rows.push([
      formatClock(item.playedAt),
      item.type,
      item.name,
      item.artist || "",
      formatTime(item.duration),
      item.category || "",
      item.status || "",
      item.error || "",
    ]);
  });

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `historial-venevo-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function tickVu() {
  const playing = isActiveMainPlaying();

  dom.vuBars.forEach((bar, index) => {
    const base = playing ? 16 + Math.random() * 70 : 8 + index * 2;
    bar.style.height = `${Math.min(96, base)}%`;
    bar.style.opacity = playing ? "0.88" : "0.35";
  });

  vuTimer = window.setTimeout(tickVu, playing ? 90 : 600);
}

function estimateNextTime() {
  if (state.nowPlaying?.source === "stream") return "En vivo";

  let remaining = 0;
  if (state.nowPlaying?.source === "youtube") {
    try {
      const duration = state.youtube.player?.getDuration?.() || state.nowPlaying.duration || 0;
      const elapsed = state.youtube.player?.getCurrentTime?.() || 0;
      remaining = Math.max(0, duration - elapsed);
    } catch {
      remaining = 0;
    }
  } else if (state.nowPlaying) {
    const current = getActiveMainPlayer();
    remaining =
      current instanceof HTMLMediaElement && Number.isFinite(current.duration)
        ? Math.max(0, current.duration - current.currentTime)
        : 0;
  }

  const target = new Date(Date.now() + remaining * 1000);
  return target.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

function estimatedClockForQueue(index) {
  let seconds = 0;

  if (state.nowPlaying?.source !== "stream") {
    if (state.nowPlaying?.source === "youtube") {
      try {
        const duration = state.youtube.player?.getDuration?.() || state.nowPlaying.duration || 0;
        const elapsed = state.youtube.player?.getCurrentTime?.() || 0;
        seconds += Math.max(0, duration - elapsed);
      } catch {
        seconds += 0;
      }
    } else if (state.nowPlaying) {
      const current = getActiveMainPlayer();
      if (current instanceof HTMLMediaElement && Number.isFinite(current.duration)) {
        seconds += Math.max(0, current.duration - current.currentTime);
      }
    }
  }

  for (let i = 0; i < index; i += 1) {
    seconds += state.queue[i]?.duration || 0;
  }

  const target = new Date(Date.now() + seconds * 1000);
  return target.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

function typeClass(item) {
  const type = normalize(item?.type || item?.source || "");
  if (type.includes("musica")) return "type-musica";
  if (type.includes("cuna")) return "type-cuna";
  if (type === "id") return "type-id";
  if (type.includes("programa")) return "type-programa";
  if (type.includes("youtube")) return "type-youtube";
  if (type.includes("stream")) return "type-stream";
  if (type.includes("cortina")) return "type-cortina";
  if (type.includes("efecto")) return "type-efecto";
  return "type-stream";
}

function shortPadName(name) {
  const clean = String(name || "Pad").trim();
  if (clean.length <= 18) return clean;
  return clean.slice(0, 18);
}

function logLocalDeckEvent(index, eventName, audio) {
  if (!audio.currentSrc && !["pause", "loadstart"].includes(eventName)) return;
  const deckName = index === 0 ? "Player A" : "Player B";
  if (eventName === "playing") {
    console.log("Audio local realmente reproduciendose", deckName);
  }
  console.log(`Audio local ${eventName}:`, {
    deck: deckName,
    muted: audio.muted,
    volume: audio.volume,
    paused: audio.paused,
    readyState: audio.readyState,
    networkState: audio.networkState,
    currentTime: audio.currentTime,
    currentSrc: audio.currentSrc,
  });
}

function logStreamEvent(eventName) {
  if (!streamingPlayer.currentSrc && !["pause", "loadstart"].includes(eventName)) return;
  console.log(`Streaming ${eventName}:`, {
    muted: streamingPlayer.muted,
    volume: streamingPlayer.volume,
    paused: streamingPlayer.paused,
    readyState: streamingPlayer.readyState,
    networkState: streamingPlayer.networkState,
    currentTime: streamingPlayer.currentTime,
    currentSrc: streamingPlayer.currentSrc,
  });
}

function tickClock() {
  if (dom.currentClock) {
    dom.currentClock.textContent = new Date().toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  renderStreamStatus();
  window.setTimeout(tickClock, 1000);
}

function outputVolume() {
  return state.muted ? 0 : state.masterVolume;
}

function setMasterVolume(value) {
  state.masterVolume = clamp(value, 0, 1);
  decks.forEach((audio) => {
    if (!state.isFading) audio.volume = outputVolume();
  });
  if (!state.isFading) streamingPlayer.volume = outputVolume();
  if (state.auxiliaryPlayback.ducking && isInternalAudioSource(state.nowPlaying)) {
    getMainInternalDecks().forEach(({ audio }) => {
      if (!state.isFading) audio.volume = outputVolume() * PAD_DUCKING_RATIO;
    });
  }
  auxiliaryPlayer.volume = outputVolume();
  streamPreviewPlayer.volume = outputVolume();
  if (state.streamPreview.audio) state.streamPreview.audio.volume = outputVolume();
  if (state.youtube.player?.setVolume) {
    try {
      const youtubeVolume =
        state.auxiliaryPlayback.ducking && state.nowPlaying?.source === "youtube"
          ? outputVolume() * PAD_DUCKING_RATIO
          : outputVolume();
      state.youtube.player.setVolume(Math.round(youtubeVolume * 100));
    } catch {
      // YouTube volume control can be unavailable before the iframe is ready.
    }
  }
}

function toggleMute() {
  state.muted = !state.muted;
  setMasterVolume(state.masterVolume);
  renderTransport();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {
      toast("Pantalla completa no disponible en este navegador.");
    });
  } else {
    document.exitFullscreen?.();
  }
}

function cloneQueueItem(item) {
  return {
    ...item,
    status: "Pendiente",
    queueId: makeId(),
  };
}

function cleanFileName(name) {
  return name.replace(/\.[^/.]+$/, "").replaceAll("_", " ").trim();
}

function guessArtist(name) {
  const clean = cleanFileName(name);
  if (!clean.includes("-")) return "";
  return clean.split("-")[0].trim();
}

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseYoutubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "").split("/")[0];
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
    const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
    return embedMatch ? embedMatch[1] : "";
  } catch {
    return "";
  }
}

function parseYoutubePlaylist(url) {
  try {
    return new URL(url).searchParams.get("list") || "";
  } catch {
    return "";
  }
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatClock(value) {
  return new Date(value).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function toast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 2800);
}

function setNowStatus(status) {
  state.nowStatus = status;
  dom.nowStatus.textContent = status;
  renderTransport();
}

function setNowError(error) {
  state.nowError = error;
  dom.nowError.textContent = error;
}

function setYoutubeStatus(title, status) {
  dom.youtubePreviewTitle.textContent = title;
  dom.youtubeStatus.textContent = status;
}

function setStreamStatus(status) {
  state.streamPreview.status = status;
  dom.streamStatus.textContent = status;
}

function isActiveDeck(index) {
  return (
    activeMainSource === sourceForDeck(index) &&
    index === state.activeDeck &&
    state.nowPlaying?.source === "local"
  );
}

function isInternalAudioSource(item) {
  return item && (item.source === "local" || item.source === "stream");
}

function isSupportedAudioFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (file.type) {
    const normalizedType = file.type.toLowerCase().split(";")[0].trim();
    const browserCanPlay = decks[0].canPlayType(normalizedType) !== "";
    if (browserCanPlay && normalizedType.startsWith("audio/")) return true;
    if (SUPPORTED_AUDIO_MIME_TYPES.has(normalizedType) && browserCanPlay) return true;
  }
  return SUPPORTED_AUDIO_EXTENSIONS.has(extension);
}

function isAudioContentType(contentType) {
  if (contentType.startsWith("audio/")) return true;
  if (contentType.includes("mpegurl")) return true;
  if (contentType.includes("ogg")) return true;
  if (contentType.includes("octet-stream")) return true;
  return false;
}

function mediaErrorMessage(audio) {
  const code = audio.error?.code;
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return "Formato no compatible.";
  if (code === MediaError.MEDIA_ERR_NETWORK) return "Servidor de streaming sin conexion.";
  if (code === MediaError.MEDIA_ERR_DECODE) return "Formato no compatible.";
  if (code === MediaError.MEDIA_ERR_ABORTED) return "Archivo local no disponible.";
  return "URL no es audio directo.";
}

function isAutoplayBlock(error) {
  return ["NotAllowedError", "AbortError"].includes(error?.name);
}

function streamNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") || "Senal en vivo";
  } catch {
    return "Senal en vivo";
  }
}

function isSecureYoutubeOrigin() {
  return location.protocol === "http:" || location.protocol === "https:";
}

function isFileProtocolMode() {
  return location.protocol === "file:";
}

function supportsPersistentFolder() {
  return Boolean(window.isSecureContext && window.showDirectoryPicker && window.indexedDB);
}

function setSavedFolderStatus(status) {
  if (dom.savedFolderStatus) dom.savedFolderStatus.textContent = status;
  if (dom.reloadSavedFolderBtn && supportsPersistentFolder()) {
    dom.reloadSavedFolderBtn.disabled = !state.localFolder.handle;
  }
}

function fileLibraryKey(file) {
  return `${file.name}|${file.size}|${file.lastModified || 0}`;
}

function readLibraryMetadata() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_LIBRARY_META_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLibraryMetadata(metadata) {
  try {
    localStorage.setItem(LOCAL_LIBRARY_META_KEY, JSON.stringify(metadata));
  } catch {
    // Local storage can be unavailable in private browsing.
  }
}

function saveLibraryMetadataForItem(item) {
  if (!item?.localKey) return;
  const metadata = readLibraryMetadata();
  metadata[item.localKey] = {
    type: item.type,
    name: item.name,
    artist: item.artist,
    category: item.category,
  };
  writeLibraryMetadata(metadata);
}

function removeLibraryMetadataForItem(item) {
  if (!item?.localKey) return;
  const metadata = readLibraryMetadata();
  delete metadata[item.localKey];
  writeLibraryMetadata(metadata);
}

function openFolderDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_FOLDER_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(LOCAL_FOLDER_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDirectoryHandle(handle) {
  const db = await openFolderDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOCAL_FOLDER_STORE_NAME, "readwrite");
    transaction.objectStore(LOCAL_FOLDER_STORE_NAME).put(handle, LOCAL_FOLDER_HANDLE_KEY);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function loadDirectoryHandle() {
  const db = await openFolderDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LOCAL_FOLDER_STORE_NAME, "readonly");
    const request = transaction.objectStore(LOCAL_FOLDER_STORE_NAME).get(LOCAL_FOLDER_HANDLE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function ensureDirectoryPermission(handle, requestWhenNeeded = false) {
  if (!handle?.queryPermission) return true;
  const options = { mode: "read" };
  let permission = await handle.queryPermission(options);
  if (permission === "granted") return true;
  if (!requestWhenNeeded || !handle.requestPermission) return false;
  permission = await handle.requestPermission(options);
  return permission === "granted";
}

function readSessionFlag(key) {
  try {
    return sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeSessionFlag(key, value) {
  try {
    if (value) sessionStorage.setItem(key, "true");
    else sessionStorage.removeItem(key);
  } catch {
    // Session storage may be unavailable in strict privacy modes.
  }
}

window.addEventListener("beforeunload", () => {
  window.clearTimeout(vuTimer);
  stopYoutubeProgress();
  state.library.forEach((item) => {
    if (item.source === "local") revokeLocalObjectUrl(item);
  });
});
