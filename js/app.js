(() => {
  const { agents, templates, getAgent, getTemplate } = window.VCData;
  const { CONSTANTS, getRms, detectPitchBest, getSpectralCentroid } = window.VCAudio;
  const UI = window.VCUI;
  const Reports = window.VCReports;

  const stateFromStorage = window.VCStorage.loadState();

  const state = {
    selectedAgent: stateFromStorage.selectedAgent,
    selectedTemplate: stateFromStorage.selectedTemplate,
    editableText: false,
    difficultyFilter: "all",
    sessions: stateFromStorage.sessions || [],
    words: stateFromStorage.words || [],
    report: stateFromStorage.report || "",
    finalTranscript: "",
    interimTranscript: "",
    transcriptSource: "none",
    metricHistory: [],
    pitchHistory: [],
    trend: [],
    activeSession: null,
    stream: null,
    audioContext: null,
    analyser: null,
    sourceNode: null,
    timeBuffer: null,
    freqBuffer: null,
    raf: null,
    mediaRecorder: null,
    audioChunks: [],
    lastAveragePitch: stateFromStorage.sessions?.[0]?.avgPitch ?? null,
    sessionStartTime: null,
    sessionStartWallMs: null,
    confirmedWordProgress: 0,
    spokenProgressMax: 0,
    lastKnownPitch: null,
    currentSession: stateFromStorage.report && stateFromStorage.sessions?.[0]
      ? stateFromStorage.sessions[0]
      : null
  };

  function init() {
    bindEvents();
    window.VCPractice.init({
      onRecordingChange: syncNavRecordingState
    });
    renderAll();
    UI.renderPrompt(state.report);
    UI.renderSummaryContent(state.currentSession);
    UI.renderHistory(state.sessions);
    drawPitch();
    window.VCLiveChart?.init();
    window.VCLiveChart?.refreshAgent(getAgent(state.selectedAgent));
  }

  function syncNavRecordingState(isRecording) {
    if (!window.VCPractice.isVisible()) return;
    document.getElementById("startBtn").disabled = isRecording;
    document.getElementById("stopBtn").disabled = !isRecording;
    UI.setRecordingState(isRecording, isRecording ? "Drill recording" : "Session off");
  }

  function bindEvents() {
    document.getElementById("trainingModeBtn").addEventListener("click", () => {
      if (window.VCPractice.isVisible()) {
        window.VCPractice.hide();
        UI.setRecordingState(false, "Session off");
      } else {
        window.VCPractice.show();
      }
    });

    document.getElementById("libraryBtn").addEventListener("click", () => {
      renderLibrary();
      UI.openLibrary();
    });

    document.getElementById("closeLibraryBtn").addEventListener("click", UI.closeLibrary);
    UI.els.libraryModal.addEventListener("click", (event) => {
      if (event.target === UI.els.libraryModal) UI.closeLibrary();
    });

    document.getElementById("promptBtn").addEventListener("click", () => {
      UI.renderPrompt(state.report);
      UI.openPromptModal();
    });

    document.getElementById("closePromptBtn").addEventListener("click", UI.closePromptModal);
    document.getElementById("copyPromptBtn").addEventListener("click", copyPrompt);
    UI.els.promptModal.addEventListener("click", (event) => {
      if (event.target === UI.els.promptModal) UI.closePromptModal();
    });

    document.getElementById("summaryBtn").addEventListener("click", () => {
      UI.renderSummaryContent(state.currentSession || null);
      UI.openSummaryModal();
    });

    document.getElementById("closeSummaryBtn").addEventListener("click", UI.closeSummaryModal);
    UI.els.summaryModal.addEventListener("click", (event) => {
      if (event.target === UI.els.summaryModal) UI.closeSummaryModal();
    });

    document.getElementById("startBtn").addEventListener("click", () => {
      if (window.VCPractice.isVisible()) {
        window.VCPractice.startDrill();
        return;
      }
      startRecording();
    });
    document.getElementById("stopBtn").addEventListener("click", () => {
      if (window.VCPractice.isVisible()) {
        window.VCPractice.stopDrill();
        return;
      }
      stopRecording();
    });
    document.getElementById("resetBtn").addEventListener("click", resetWorkspace);
    document.getElementById("downloadCsvBtn").addEventListener("click", downloadCurrentSessionCsv);

    UI.els.historyBody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-download-session]");
      if (!button) return;
      const session = state.sessions.find((item) => String(item.id) === String(button.dataset.downloadSession));
      if (session) downloadSessionCsv(session);
    });
    document.getElementById("clearTranscriptBtn").addEventListener("click", () => {
      state.finalTranscript = "";
      state.interimTranscript = "";
      state.transcriptSource = "none";
      refreshSpeakAlong();
    });

    document.getElementById("copyIntentBtn").addEventListener("click", () => {
      UI.copyText(UI.els.practiceText.value, "Intent script copied", "No intent script yet");
    });

    document.getElementById("copyTranscriptBtn").addEventListener("click", () => {
      UI.copyText(state.finalTranscript, "Transcript copied", "No spoken transcript yet");
    });

    document.getElementById("clearHistoryBtn").addEventListener("click", () => {
      if (!confirm("Clear saved sessions, reports, and word history?")) return;
      state.sessions = [];
      state.words = [];
      state.report = "";
      state.currentSession = null;
      state.lastAveragePitch = null;
      window.VCStorage.clearAll();
      UI.renderPrompt("");
      UI.renderSummaryContent(null);
      UI.renderAudio(null);
      UI.renderHistory([]);
      drawPitch();
      UI.showToast("History cleared");
    });

    UI.els.editTextBtn.addEventListener("click", () => {
      state.editableText = !state.editableText;
      refreshSpeakAlong(true);
      if (state.editableText) UI.els.practiceText.focus();
    });

    UI.els.practiceText.addEventListener("input", () => {
      if (state.editableText) refreshSpeakAlong();
    });

    UI.els.showAvgLineToggle.addEventListener("change", drawPitch);
  }

  function renderAll() {
    const agent = getAgent(state.selectedAgent);
    const template = getTemplate(state.selectedTemplate);
    const { progress: spokenCount, confirmedProgress, hasPartial } = UI.computeSpokenProgress(
      template.text,
      state.finalTranscript,
      state.interimTranscript,
      state.confirmedWordProgress
    );
    state.confirmedWordProgress = confirmedProgress;
    state.spokenProgressMax = Math.max(state.spokenProgressMax, spokenCount);
    UI.renderSelection({
      agent,
      template,
      editable: state.editableText,
      spokenCount: state.spokenProgressMax,
      interimPartial: hasPartial
    });
    renderLibrary();
    saveState();
    window.VCLiveChart?.refreshAgent(agent);
  }

  function refreshSpeakAlong(updateSelection = false) {
    const agent = getAgent(state.selectedAgent);
    const template = getTemplate(state.selectedTemplate);
    const intentText = UI.els.practiceText.value || template.text;

    if (updateSelection) {
      const { progress: spokenCount, confirmedProgress, hasPartial } = UI.computeSpokenProgress(
        intentText,
        state.finalTranscript,
        state.interimTranscript,
        state.confirmedWordProgress
      );
      state.confirmedWordProgress = confirmedProgress;
      state.spokenProgressMax = Math.max(state.spokenProgressMax, spokenCount);
      UI.renderSelection({
        agent,
        template,
        editable: state.editableText,
        spokenCount: state.spokenProgressMax,
        interimPartial: hasPartial
      });
      UI.renderTranscript(state.finalTranscript, state.interimTranscript);
      return;
    }

    if (state.editableText) {
      UI.renderIntentHighlight({
        text: intentText,
        spokenCount: 0,
        interimPartial: false,
        editable: true
      });
      UI.els.editTextBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Lock`;
    } else {
      const result = UI.updateSpeakAlong({
        intentText,
        finalText: state.finalTranscript,
        interimText: state.interimTranscript,
        editable: false,
        confirmedProgress: state.confirmedWordProgress,
        maxProgress: state.spokenProgressMax
      });
      state.confirmedWordProgress = result.confirmedProgress;
      state.spokenProgressMax = result.spokenCount;
    }
  }

  function renderLibrary() {
    const filtered = templates.filter((template) => state.difficultyFilter === "all" || template.difficulty === state.difficultyFilter);
    UI.renderLibrary({ templates: filtered, selectedTemplateId: state.selectedTemplate, filter: state.difficultyFilter });

    UI.els.difficultyFilters.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.difficultyFilter = button.dataset.filter;
        renderLibrary();
      });
    });

    UI.els.libraryGrid.querySelectorAll("[data-template]").forEach((item) => {
      item.addEventListener("click", () => {
        const template = getTemplate(item.dataset.template);
        state.selectedTemplate = template.id;
        state.selectedAgent = template.agent;
        state.editableText = false;
        renderAll();
        UI.closeLibrary();
        resetLive();
        UI.showToast("Template selected");
      });
    });
  }

  function saveState() {
    window.VCStorage.saveState({
      sessions: state.sessions,
      words: state.words,
      report: state.report,
      selectedAgent: state.selectedAgent,
      selectedTemplate: state.selectedTemplate
    });
  }

  async function startRecording() {
    try {
      resetLive({ clearAvgLine: true });
      state.sessionStartTime = performance.now();
      state.sessionStartWallMs = Date.now();
      window.VCLiveChart?.reset({
        agent: getAgent(state.selectedAgent),
        sessionStartWallMs: state.sessionStartWallMs
      });

      state.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });

      state.activeSession = {
        id: Date.now(),
        startedAt: new Date().toISOString(),
        agentId: state.selectedAgent,
        templateId: state.selectedTemplate,
        practiceText: UI.els.practiceText.value.trim(),
        transcript: "",
        transcriptSource: "none",
        words: [],
        metrics: []
      };

      state.audioChunks = [];
      try {
        state.mediaRecorder = new MediaRecorder(state.stream);
        state.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) state.audioChunks.push(event.data);
        };
        state.mediaRecorder.start();
      } catch {
        state.mediaRecorder = null;
      }

      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 4096;
      state.analyser.smoothingTimeConstant = 0.08;

      state.sourceNode = state.audioContext.createMediaStreamSource(state.stream);
      state.sourceNode.connect(state.analyser);

      state.timeBuffer = new Float32Array(state.analyser.fftSize);
      state.freqBuffer = new Uint8Array(state.analyser.frequencyBinCount);

      document.getElementById("startBtn").disabled = true;
      document.getElementById("stopBtn").disabled = false;
      UI.setRecordingState(true, "Recording");

      if (document.getElementById("enableTranscript")?.checked !== false) {
        window.VCSpeech.start({
          onFinal: processTranscript,
          onInterim: (text) => {
            state.interimTranscript = text;
            refreshSpeakAlong();
          },
          onError: (message) => {
            console.warn("Speech recognition:", message);
          }
        });
      }

      loop();
    } catch (error) {
      UI.setRecordingState(false, "Microphone unavailable");
      UI.showToast("Microphone permission failed");
      console.error(error);
    }
  }

  function stopRecording() {
    document.getElementById("stopBtn").disabled = true;
    UI.setRecordingState(true, "Stopping...");

    if (state.interimTranscript && state.interimTranscript.trim()) {
      processTranscript(state.interimTranscript.trim(), "browser-interim-fallback");
      state.interimTranscript = "";
      refreshSpeakAlong();
    }

    window.VCSpeech.stop();

    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;

    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      try { state.mediaRecorder.stop(); } catch {}
    }

    if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
    if (state.audioContext && state.audioContext.state !== "closed") state.audioContext.close();

    state.stream = null;
    state.audioContext = null;
    state.analyser = null;
    state.sourceNode = null;
    state.mediaRecorder = null;

    setTimeout(() => {
      finalizeSession();
      document.getElementById("startBtn").disabled = false;
      UI.setRecordingState(false, "Report generated");
      UI.showToast("Report generated");
    }, 1400);
  }

  function resetLive({ clearAvgLine = false } = {}) {
    state.metricHistory = [];
    state.pitchHistory = [];
    state.trend = [];
    state.finalTranscript = "";
    state.interimTranscript = "";
    state.transcriptSource = "none";
    state.confirmedWordProgress = 0;
    state.spokenProgressMax = 0;
    state.lastKnownPitch = null;
    state.lastAveragePitch = clearAvgLine ? null : (state.currentSession?.avgPitch ?? null);
    state.sessionStartTime = null;
    state.sessionStartWallMs = null;

    refreshSpeakAlong();

    UI.updateMetricCards({
      sample: { speaking: false, pitch: null, db: null, brightness: null, stability: null },
      agent: getAgent(state.selectedAgent),
      score: null,
      analysis: getSilenceAnalysis()
    });
    drawPitch();
    window.VCLiveChart?.reset({ agent: getAgent(state.selectedAgent) });
    window.VCLiveChart?.setIdleState();
  }

  function resetWorkspace() {
    resetLive();
    state.report = "";
    state.currentSession = null;
    state.lastAveragePitch = null;
    state.audioChunks = [];
    UI.renderPrompt("");
    UI.renderSummaryContent(null);
    UI.renderAudio(null);
    saveState();
    UI.showToast("Session cleared");
  }

  function loop() {
    if (!state.analyser) return;

    state.analyser.getFloatTimeDomainData(state.timeBuffer);
    state.analyser.getByteFrequencyData(state.freqBuffer);

    const rms = getRms(state.timeBuffer);
    const db = rms > 0 ? 20 * Math.log10(rms) : CONSTANTS.volumeMin;
    const pitch = detectPitchBest(
      state.timeBuffer,
      state.freqBuffer,
      state.audioContext.sampleRate,
      state.analyser.fftSize,
      db
    );
    const brightness = getSpectralCentroid(state.freqBuffer, state.audioContext.sampleRate, state.analyser.fftSize);
    updateMetrics({ db, pitch, brightness });

    state.raf = requestAnimationFrame(loop);
  }

  function updateMetrics({ db, pitch, brightness }) {
    const agent = getAgent(state.selectedAgent);
    const speaking = db > CONSTANTS.speechThresholdDb;

    const elapsed = state.sessionStartTime
      ? (performance.now() - state.sessionStartTime) / 1000
      : 0;

    if (speaking && pitch) {
      state.lastKnownPitch = pitch;
      state.pitchHistory.push(pitch);
      if (state.pitchHistory.length > 180) state.pitchHistory.shift();
      state.trend.push({ t: performance.now(), elapsed, pitch, db });
    } else if (speaking) {
      const carryPitch = state.lastKnownPitch;
      state.trend.push({ t: performance.now(), elapsed, pitch: carryPitch, db });
    }

    if (state.trend.length > 2000) state.trend.shift();

    const pitchStd = stdDev(state.pitchHistory.slice(-60));
    const stability = state.pitchHistory.length < 8 ? null : clamp(Math.round(100 - mapRange(pitchStd, 4, 45, 0, 100)), 0, 100);

    const sample = {
      t: performance.now(),
      at: new Date().toISOString(),
      speaking,
      pitch: speaking && pitch ? pitch : (speaking ? state.lastKnownPitch : null),
      db: Number.isFinite(db) ? db : null,
      brightness: speaking && brightness ? brightness : null,
      stability: speaking && stability !== null ? stability : null
    };

    state.metricHistory.push(sample);
    if (state.metricHistory.length > 5000) state.metricHistory.shift();
    if (state.activeSession) state.activeSession.metrics.push(sample);

    const analysis = analyzeLive(agent, sample, pitchStd);
    UI.updateMetricCards({ sample, agent, score: analysis.score, analysis });
    drawPitch();
    window.VCLiveChart?.pushPoint({
      sample,
      agent,
      elapsed,
      sessionStartWallMs: state.sessionStartWallMs
    });
  }

  function analyzeLive(agent, sample, pitchStd) {
    if (!sample.speaking) return getSilenceAnalysis();

    const parts = [];
    const pills = [];
    const tips = [];
    let pitchType = "good";
    let volumeType = "good";
    let stabilityType = "good";
    let brightnessType = "good";
    let pitchStatus = "Pitch in target.";
    let volumeStatus = "Volume in target.";
    let stabilityStatus = "Steady.";
    let brightnessStatus = "Warm/clear.";

    if (!sample.pitch) {
      pitchType = "warn";
      pitchStatus = "Pitch unclear.";
      parts.push(50);
      pills.push({ text: "Pitch unclear", type: "warn" });
      tips.push("speak a little louder with longer vowel sounds");
    } else if (sample.pitch < agent.pitch[0]) {
      pitchType = "warn";
      pitchStatus = "Below target.";
      parts.push(70);
      pills.push({ text: "Pitch low", type: "warn" });
    } else if (sample.pitch > agent.pitch[1]) {
      pitchType = "warn";
      pitchStatus = "Above target.";
      parts.push(62);
      pills.push({ text: "Pitch high", type: "warn" });
      tips.push("slow down and let sentence endings fall");
    } else {
      parts.push(95);
      pills.push({ text: "Pitch good", type: "good" });
    }

    if (sample.db < agent.volume[0]) {
      volumeType = "bad";
      volumeStatus = "Too soft.";
      parts.push(52);
      pills.push({ text: "Too soft", type: "bad" });
      tips.push("add 10–15% more breath-supported volume");
    } else if (sample.db > agent.volume[1]) {
      volumeType = "bad";
      volumeStatus = "Too loud.";
      parts.push(60);
      pills.push({ text: "Too loud", type: "bad" });
      tips.push("reduce pressure");
    } else {
      parts.push(95);
      pills.push({ text: "Volume good", type: "good" });
    }

    if (sample.stability === null) {
      stabilityType = "warn";
      stabilityStatus = "Need more speech.";
      parts.push(60);
      pills.push({ text: "Keep speaking", type: "warn" });
    } else if (pitchStd < agent.variation[0]) {
      stabilityType = "warn";
      stabilityStatus = "Too flat.";
      parts.push(78);
      pills.push({ text: "Too flat", type: "warn" });
    } else if (pitchStd > agent.variation[1]) {
      stabilityType = "warn";
      stabilityStatus = "Too much movement.";
      parts.push(68);
      pills.push({ text: "Unsteady", type: "warn" });
      tips.push("pause and speak one smooth line");
    } else {
      parts.push(92);
      pills.push({ text: "Steady", type: "good" });
    }

    if (!sample.brightness) {
      brightnessType = "warn";
      brightnessStatus = "No warmth reading.";
      parts.push(70);
    } else if (sample.brightness < agent.brightness[0]) {
      brightnessType = "warn";
      brightnessStatus = "Muffled/dark.";
      parts.push(72);
      pills.push({ text: "Muffled", type: "warn" });
    } else if (sample.brightness > agent.brightness[1]) {
      brightnessType = "warn";
      brightnessStatus = "Bright/thin.";
      parts.push(68);
      pills.push({ text: "Too bright", type: "warn" });
      tips.push("relax jaw and round vowels");
    } else {
      parts.push(90);
      pills.push({ text: "Warmth good", type: "good" });
    }

    const score = Math.round(avg(parts));
    return {
      score,
      pitchStatus,
      volumeStatus,
      stabilityStatus,
      brightnessStatus,
      pitchType,
      volumeType,
      stabilityType,
      brightnessType,
      pills,
      tip: `<strong>Live cue:</strong> ${tips.length ? tips.slice(0, 2).join("; ") : agent.cue}`
    };
  }

  function getSilenceAnalysis() {
    return {
      score: null,
      pitchStatus: "Waiting for speech.",
      volumeStatus: "Too quiet / silence.",
      stabilityStatus: "Speak for a few seconds.",
      brightnessStatus: "No speech detected.",
      pitchType: "warn",
      volumeType: "bad",
      stabilityType: "warn",
      brightnessType: "warn",
      pills: [{ text: "Waiting for voice", type: "" }],
      tip: "<strong>Ready:</strong> speak one sentence smoothly. Aim for medium volume first."
    };
  }

  function processTranscript(text, source = "browser-final") {
    if (!text || !text.trim()) return;

    state.finalTranscript = `${state.finalTranscript} ${text}`.trim();
    state.transcriptSource = source;

    if (state.activeSession) {
      state.activeSession.transcript = `${state.activeSession.transcript} ${text}`.trim();
      state.activeSession.transcriptSource = source;
    }

    const words = Reports.extractWords(text);
    const entries = estimateWordMetrics(words);
    state.words.push(...entries);
    state.words = state.words.slice(-4000);

    if (state.activeSession) state.activeSession.words.push(...entries);

    refreshSpeakAlong();
  }

  function estimateWordMetrics(words) {
    if (!words.length) return [];

    const speakingSamples = state.metricHistory.filter((sample) => sample.speaking);
    const now = performance.now();
    const recognitionDelayMs = 3200;
    const perWordMs = 550;
    const windowMs = clamp(words.length * perWordMs + recognitionDelayMs, 3500, 28000);
    const windowStart = now - windowMs;
    let samples = speakingSamples.filter((sample) => sample.t >= windowStart);

    if (samples.length < words.length) {
      samples = speakingSamples.slice(-Math.max(words.length * 12, 80));
    }

    return estimateWordsFromSamples(words, samples, state.selectedAgent, state.selectedTemplate);
  }

  function estimateWordsAcrossSession(words, metrics, agentId, templateId) {
    const samples = metrics.filter((sample) => sample.speaking);
    if (!samples.length) {
      return words.map((word) => buildWordEntry(word, [], metrics, agentId, templateId));
    }

    return words.map((word, index) => {
      const chunkSize = Math.max(4, Math.floor(samples.length / words.length));
      const center = Math.min(samples.length - 1, Math.floor((index + 0.5) * samples.length / words.length));
      const start = Math.max(0, center - Math.floor(chunkSize / 2));
      const end = Math.min(samples.length, start + chunkSize);
      const chunk = samples.slice(start, end);
      return buildWordEntry(word, chunk, samples, agentId, templateId);
    });
  }

  function estimateWordsFromSamples(words, samples, agentId, templateId) {
    if (!samples.length) {
      return words.map((word) => buildWordEntry(word, [], state.metricHistory, agentId, templateId));
    }

    const sliceStart = Math.max(0, samples.length - words.length * 14);
    const slice = samples.slice(sliceStart);

    return words.map((word, index) => {
      const chunkSize = Math.max(3, Math.floor(slice.length / words.length));
      const center = Math.min(slice.length - 1, Math.floor((index + 0.5) * slice.length / words.length));
      const start = Math.max(0, center - Math.floor(chunkSize / 2));
      const end = Math.min(slice.length, start + chunkSize);
      const chunk = slice.slice(start, end);
      return buildWordEntry(word, chunk, samples, agentId, templateId);
    });
  }

  function nearestMetric(samples, key) {
    const values = samples.map((sample) => sample[key]).filter((value) => Number.isFinite(value) && value !== null);
    if (values.length) return avg(values);
    const fallback = state.metricHistory.filter((sample) => sample.speaking).slice(-100);
    const fallbackValues = fallback.map((sample) => sample[key]).filter((value) => Number.isFinite(value) && value !== null);
    return fallbackValues.length ? avg(fallbackValues) : null;
  }

  function buildWordEntry(word, chunk, fallbackSamples, agentId, templateId) {
    const pitch = avg(chunk.map((s) => s.pitch).filter(Boolean))
      ?? nearestMetric(fallbackSamples, "pitch")
      ?? state.lastKnownPitch;

    const db = avg(chunk.map((s) => s.db).filter(Number.isFinite))
      ?? nearestMetric(fallbackSamples, "db");

    const brightness = avg(chunk.map((s) => s.brightness).filter(Boolean))
      ?? nearestMetric(fallbackSamples, "brightness");

    return {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
      word,
      normalized: Reports.normalizeWord(word),
      pitch,
      db,
      brightness,
      agentId,
      templateId
    };
  }

  function finalizeSession() {
    if (!state.activeSession) return;

    const agent = getAgent(state.activeSession.agentId);
    const template = getTemplate(state.activeSession.templateId);
    const endedAt = new Date().toISOString();
    const startedAt = state.activeSession.startedAt;
    const durationSec = Math.max(1, Math.round((new Date(endedAt) - new Date(startedAt)) / 1000));
    const speechMetrics = state.activeSession.metrics.filter((sample) => sample.speaking);
    const pitchSamples = speechMetrics.map((sample) => sample.pitch).filter(Boolean);
    const dbSamples = speechMetrics.map((sample) => sample.db).filter(Number.isFinite);

    const avgPitch = avg(pitchSamples);
    const avgDb = avg(dbSamples);
    const avgBrightness = avg(speechMetrics.map((sample) => sample.brightness).filter(Boolean));
    const avgStability = avg(speechMetrics.map((sample) => sample.stability).filter(Number.isFinite));
    const pitchStd = stdDev(pitchSamples);

    let transcript = (state.activeSession.transcript || state.finalTranscript || "").trim();
    let transcriptSource = state.activeSession.transcriptSource || state.transcriptSource || (transcript ? "browser-final" : "none");
    let sessionWords = state.activeSession.words.slice();

    if (!transcript && state.activeSession.practiceText) {
      transcript = state.activeSession.practiceText.trim();
      transcriptSource = "practice-text-fallback";
    }

    if (transcript && sessionWords.length === 0) {
      sessionWords = estimateWordsAcrossSession(
        Reports.extractWords(transcript),
        state.activeSession.metrics,
        agent.id,
        template.id
      );
      state.words.push(...sessionWords);
      state.words = state.words.slice(-4000);
    } else if (sessionWords.length) {
      const liveWordCount = state.activeSession.words.length;
      sessionWords = estimateWordsAcrossSession(
        sessionWords.map((entry) => entry.word),
        state.activeSession.metrics,
        agent.id,
        template.id
      );
      if (liveWordCount > 0 && state.words.length >= liveWordCount) {
        state.words = state.words.slice(0, -liveWordCount).concat(sessionWords);
        state.words = state.words.slice(-4000);
      }
    }

    const session = {
      id: state.activeSession.id,
      startedAt,
      endedAt,
      durationSec,
      agentId: agent.id,
      agentName: agent.name,
      templateId: template.id,
      templateTitle: template.title,
      difficulty: template.difficulty,
      practiceText: state.activeSession.practiceText,
      transcript,
      transcriptSource,
      wordCount: sessionWords.length,
      avgPitch,
      avgDb,
      avgBrightness,
      avgStability,
      pitchStd,
      pitchInTargetPct: Reports.pct(pitchSamples.filter((value) => value >= agent.pitch[0] && value <= agent.pitch[1]).length, pitchSamples.length),
      volumeInTargetPct: Reports.pct(dbSamples.filter((value) => value >= agent.volume[0] && value <= agent.volume[1]).length, dbSamples.length),
      tooSoftPct: Reports.pct(dbSamples.filter((value) => value < agent.volume[0]).length, dbSamples.length),
      tooLoudPct: Reports.pct(dbSamples.filter((value) => value > agent.volume[1]).length, dbSamples.length)
    };

    session.score = Reports.calculateSessionScore({ avgPitch, avgDb, avgBrightness, avgStability, pitchStd, agent });
    session.report = Reports.generateReport({ session, words: sessionWords, agent, template });
    session.wordEntries = sessionWords;

    state.sessions.unshift(session);
    state.sessions = state.sessions.slice(0, 100);
    state.report = session.report;
    state.currentSession = session;
    state.lastAveragePitch = avgPitch;
    state.activeSession = null;

    UI.showSessionAverages(session);
    UI.renderPrompt(state.report);
    UI.renderSummaryContent(session);
    UI.renderHistory(state.sessions);

    if (state.audioChunks.length) {
      const audioBlob = new Blob(state.audioChunks, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      UI.renderAudio(audioUrl);
    }

    drawPitch();
    saveState();
  }

  function drawPitch() {
    UI.drawPitchGraph({
      trend: state.trend,
      agent: getAgent(state.selectedAgent),
      avgPitch: state.lastAveragePitch,
      showAvgLine: UI.els.showAvgLineToggle.checked
    });
  }

  async function copyPrompt() {
    if (!state.report) {
      UI.showToast("No report yet");
      return;
    }

    try {
      await navigator.clipboard.writeText(state.report);
      UI.showToast("Prompt copied");
    } catch {
      UI.showToast("Could not copy");
    }
  }

  function buildSessionCsvRows(session) {
    const rows = [["type", "date", "coach", "template", "difficulty", "word", "pitch_hz", "db", "duration_sec", "score", "transcript_source", "transcript"]];
    const words = session.wordEntries || [];

    words.forEach((word) => {
      rows.push([
        "word",
        word.at,
        session.agentName,
        session.templateTitle,
        session.difficulty,
        word.word,
        csvRound(word.pitch),
        csvRound(word.db),
        "",
        "",
        "",
        ""
      ]);
    });

    rows.push([
      "session",
      session.startedAt,
      session.agentName,
      session.templateTitle,
      session.difficulty,
      "",
      csvRound(session.avgPitch),
      csvRound(session.avgDb),
      session.durationSec,
      session.score ?? "",
      session.transcriptSource,
      session.transcript || ""
    ]);

    return rows;
  }

  function downloadSessionCsv(session) {
    if (!session) {
      UI.showToast("Session not found");
      return;
    }

    const rows = buildSessionCsvRows(session);
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const stamp = new Date(session.startedAt).toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `voice_coach_session_${stamp}.csv`);
    UI.showToast("Session CSV downloaded");
  }

  function downloadCurrentSessionCsv() {
    const session = state.currentSession;
    if (!session) {
      UI.showToast("No session to download");
      return;
    }
    downloadSessionCsv(session);
  }

  function csvRound(value) {
    return Number.isFinite(value) ? Math.round(value) : "";
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function avg(values) {
    const clean = values.filter(Number.isFinite);
    if (!clean.length) return null;
    return clean.reduce((a, b) => a + b, 0) / clean.length;
  }

  function stdDev(values) {
    const clean = values.filter(Number.isFinite);
    if (clean.length < 2) return 0;
    const mean = avg(clean);
    return Math.sqrt(clean.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / clean.length);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mapRange(value, inMin, inMax, outMin = 0, outMax = 100) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  init();
})();
