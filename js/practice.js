window.VCPractice = (() => {
  const { practiceLevels, practiceDrills, getPracticeDrill, getDrillsForLevel, labelDrillDifficulty } = window.VCData;
  const { CONSTANTS, getRms, detectPitchBest, analyzePitchFromBlob, getSpectralCentroid } = window.VCAudio;
  const UI = window.VCUI;

  const $ = (id) => document.getElementById(id);

  const els = {
    view: $("practiceView"),
    levelTabs: $("practiceLevelTabs"),
    drillGrid: $("practiceDrillGrid"),
    drillName: $("practiceDrillName"),
    drillDifficulty: $("practiceDrillDifficulty"),
    drillGoal: $("practiceDrillGoal"),
    drillInstructions: $("practiceDrillInstructions"),
    drillText: $("practiceDrillText"),
    pitchTarget: $("practicePitchTarget"),
    volumeTarget: $("practiceVolumeTarget"),
    steadinessTarget: $("practiceSteadinessTarget"),
    timer: $("practiceTimer"),
    liveScore: $("practiceLiveScore"),
    liveTip: $("practiceLiveTip"),
    pitchCanvas: $("practicePitchCanvas"),
    volumeCanvas: $("practiceVolumeCanvas"),
    steadinessCanvas: $("practiceSteadinessCanvas"),
    pitchScroll: $("practicePitchScroll"),
    volumeScroll: $("practiceVolumeScroll"),
    steadinessScroll: $("practiceSteadinessScroll"),
    pitchPanel: $("practicePitchPanel"),
    volumePanel: $("practiceVolumePanel"),
    steadinessPanel: $("practiceSteadinessPanel"),
    endingPanel: $("practiceEndingPanel"),
    endingFeedback: $("practiceEndingFeedback"),
    startDrillBtn: $("practiceStartDrillBtn"),
    stopDrillBtn: $("practiceStopDrillBtn"),
    resultPanel: $("practiceResultPanel"),
    resultContent: $("practiceResultContent"),
    retryDrillBtn: $("practiceRetryDrillBtn"),
    nextDrillBtn: $("practiceNextDrillBtn"),
    closeResultBtn: $("practiceCloseResultBtn"),
    progressSummary: $("practiceProgressSummary"),
    guideStrip: $("practiceGuideStrip"),
    backToCoachBtn: $("backToCoachBtn"),
    audioBox: $("practiceAudioBox")
  };

  const pitchCtx = els.pitchCanvas?.getContext("2d");
  const volumeCtx = els.volumeCanvas?.getContext("2d");
  const steadinessCtx = els.steadinessCanvas?.getContext("2d");

  const state = {
    visible: false,
    selectedLevel: 1,
    selectedDrillId: practiceDrills[0]?.id || "l1d1",
    recording: false,
    stream: null,
    audioContext: null,
    analyser: null,
    sourceNode: null,
    timeBuffer: null,
    freqBuffer: null,
    raf: null,
    sessionStartTime: null,
    drillStartTime: null,
    metricHistory: [],
    pitchHistory: [],
    trend: [],
    volumeTrend: [],
    steadinessTrend: [],
    lastKnownPitch: null,
    liveScore: null,
    liveTip: "",
    transcript: "",
    interimTranscript: "",
    mediaRecorder: null,
    audioChunks: [],
    lastAudioUrl: null,
    offlinePitchSamples: [],
    completedDrills: {},
    onRecordingChange: null
  };

  function init(options = {}) {
    state.onRecordingChange = options.onRecordingChange || null;
    state.completedDrills = window.VCStorage.loadPracticeProgress();
    bindEvents();
    window.addEventListener("resize", () => {
      if (state.visible) drawGraphs();
    });
    renderAll();
  }

  function bindEvents() {
    els.backToCoachBtn?.addEventListener("click", () => hide());
    els.startDrillBtn?.addEventListener("click", startDrill);
    els.stopDrillBtn?.addEventListener("click", stopDrill);
    els.retryDrillBtn?.addEventListener("click", () => {
      hideResult();
      startDrill();
    });
    els.nextDrillBtn?.addEventListener("click", selectNextDrill);
    els.closeResultBtn?.addEventListener("click", hideResult);
  }

  function show() {
    state.visible = true;
    els.view?.classList.add("active");
    els.view?.setAttribute("aria-hidden", "false");
    document.getElementById("coachView")?.classList.add("hidden-view");
    document.getElementById("trainingModeBtn")?.classList.add("nav-active");
    renderAll();
    requestAnimationFrame(() => drawGraphs());
  }

  function hide() {
    if (state.recording) stopDrill();
    state.visible = false;
    els.view?.classList.remove("active");
    els.view?.setAttribute("aria-hidden", "true");
    document.getElementById("coachView")?.classList.remove("hidden-view");
    document.getElementById("trainingModeBtn")?.classList.remove("nav-active");
  }

  function isVisible() {
    return state.visible;
  }

  function isRecording() {
    return state.recording;
  }

  function renderAll() {
    renderProgress();
    renderLevelTabs();
    renderDrillGrid();
    renderSelectedDrill();
    drawGraphs();
  }

  function renderProgress() {
    const total = practiceDrills.length;
    const passed = Object.values(state.completedDrills).filter((entry) => entry.passed).length;
    els.progressSummary.textContent = `${passed} / ${total} drills passed`;
    els.guideStrip.innerHTML = `<span class="guidance-chip"><i class="fa-solid fa-route"></i> First fix volume, then pitch, then emotion.</span>`;
  }

  function renderLevelTabs() {
    els.levelTabs.innerHTML = practiceLevels.map((level) => {
      const drills = getDrillsForLevel(level.id);
      const passed = drills.filter((d) => state.completedDrills[d.id]?.passed).length;
      return `
        <button class="level-tab ${state.selectedLevel === level.id ? "active" : ""}" type="button" data-level="${level.id}" title="${level.title}">
          <span class="level-num">${level.id}</span>
          <span class="level-title">${UI.escapeHtml(level.title)}</span>
          <span class="level-progress">${passed}/${drills.length}</span>
        </button>
      `;
    }).join("");

    els.levelTabs.querySelectorAll("[data-level]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedLevel = Number(btn.dataset.level);
        const first = getDrillsForLevel(state.selectedLevel)[0];
        if (first) state.selectedDrillId = first.id;
        hideResult();
        renderAll();
      });
    });
  }

  function renderDrillGrid() {
    const drills = getDrillsForLevel(state.selectedLevel);
    els.drillGrid.innerHTML = drills.map((drill) => {
      const done = state.completedDrills[drill.id];
      const status = done?.passed ? "passed" : done ? "attempted" : "";
      return `
        <article class="drill-card ${drill.id === state.selectedDrillId ? "active" : ""} ${status}" data-drill="${drill.id}">
          <div class="drill-card-head">
            <span class="difficulty ${drill.difficulty}">${labelDrillDifficulty(drill.difficulty)}</span>
            ${done?.passed ? '<span class="drill-pass-badge"><i class="fa-solid fa-check"></i></span>' : ""}
          </div>
          <h3>${UI.escapeHtml(drill.name)}</h3>
          <p class="muted">${UI.escapeHtml(drill.goal)}</p>
          ${done ? `<div class="drill-best">Best: ${done.bestScore ?? "--"}</div>` : ""}
        </article>
      `;
    }).join("");

    els.drillGrid.querySelectorAll("[data-drill]").forEach((card) => {
      card.addEventListener("click", () => {
        if (state.recording) return;
        state.selectedDrillId = card.dataset.drill;
        hideResult();
        renderAll();
      });
    });
  }

  function renderSelectedDrill() {
    const drill = getPracticeDrill(state.selectedDrillId);
    if (!drill) return;

    els.drillName.textContent = drill.name;
    els.drillDifficulty.textContent = labelDrillDifficulty(drill.difficulty);
    els.drillDifficulty.className = `difficulty ${drill.difficulty}`;
    els.drillGoal.textContent = drill.goal;
    els.drillInstructions.textContent = drill.instructions;
    els.drillText.textContent = drill.text;
    els.pitchTarget.textContent = `${drill.pitch[0]}–${drill.pitch[1]} Hz`;
    els.volumeTarget.textContent = `${drill.volume[0]} to ${drill.volume[1]} dB`;
    els.steadinessTarget.textContent = `Var ${drill.variation[0]}–${drill.variation[1]} Hz`;

    const showPitch = ["pitch", "steadiness", "ending", "emotion", "realworld", "presence"].includes(drill.visual);
    const showVolume = ["volume", "ending", "articulation", "emotion", "realworld", "presence"].includes(drill.visual);
    const showSteadiness = ["steadiness", "pitch", "emotion", "realworld", "presence"].includes(drill.visual);

    els.pitchPanel.classList.toggle("hidden-panel", !showPitch);
    els.volumePanel.classList.toggle("hidden-panel", !showVolume);
    els.steadinessPanel.classList.toggle("hidden-panel", !showSteadiness);
    els.endingPanel.classList.toggle("hidden-panel", !drill.endingCheck);

    if (!state.recording) {
      els.timer.textContent = formatTimer(drill.durationSec);
      els.liveScore.textContent = "--";
      els.liveTip.innerHTML = `<strong>Ready:</strong> press Start drill and read the text above.`;
      els.endingFeedback.textContent = "Ending analysis appears after you speak.";
    }

    els.startDrillBtn.disabled = state.recording;
    els.stopDrillBtn.disabled = !state.recording;

    requestAnimationFrame(() => drawGraphs());
  }

  async function startDrill() {
    const drill = getPracticeDrill(state.selectedDrillId);
    if (!drill || state.recording) return;

    try {
      resetLive();
      hideResult();

      state.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }
      });

      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 4096;
      state.analyser.smoothingTimeConstant = 0.08;
      state.sourceNode = state.audioContext.createMediaStreamSource(state.stream);
      state.sourceNode.connect(state.analyser);
      state.timeBuffer = new Float32Array(state.analyser.fftSize);
      state.freqBuffer = new Uint8Array(state.analyser.frequencyBinCount);

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

      state.recording = true;
      state.drillStartTime = performance.now();
      state.sessionStartTime = performance.now();

      els.startDrillBtn.disabled = true;
      els.stopDrillBtn.disabled = false;
      state.onRecordingChange?.(true);

      window.VCSpeech.start({
        onFinal: (text) => {
          state.transcript = `${state.transcript} ${text}`.trim();
        },
        onInterim: (text) => {
          state.interimTranscript = text;
        },
        onError: () => {}
      });

      loop();
    } catch (error) {
      UI.showToast("Microphone permission failed");
      console.error(error);
    }
  }

  function stopDrill() {
    if (!state.recording) return;

    if (state.interimTranscript && state.interimTranscript.trim()) {
      state.transcript = `${state.transcript} ${state.interimTranscript}`.trim();
      state.interimTranscript = "";
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
    state.recording = false;

    els.startDrillBtn.disabled = true;
    els.stopDrillBtn.disabled = true;
    state.onRecordingChange?.(false);

    setTimeout(() => {
      finalizeDrill().catch((error) => {
        console.error(error);
        UI.showToast("Could not finalize drill");
      });
    }, 900);
  }

  async function finalizeDrill() {
    if (!state.pitchHistory.length && state.audioChunks.length) {
      const offlinePitches = await analyzePitchFromBlob(state.audioChunks);
      if (offlinePitches.length) {
        state.offlinePitchSamples = offlinePitches;
        state.pitchHistory.push(...offlinePitches);
        state.lastKnownPitch = offlinePitches[offlinePitches.length - 1];
      }
    }

    const audioUrl = buildDrillAudioUrl();
    const report = buildDrillReport();

    renderPracticeAudio(audioUrl, report.transcript);
    showResult(report);
    saveProgress(report);
    renderDrillGrid();
    renderProgress();

    els.startDrillBtn.disabled = false;
    els.stopDrillBtn.disabled = true;
  }

  function buildDrillAudioUrl() {
    if (!state.audioChunks.length) return null;

    const audioBlob = new Blob(state.audioChunks, { type: "audio/webm" });
    if (state.lastAudioUrl) URL.revokeObjectURL(state.lastAudioUrl);
    state.lastAudioUrl = URL.createObjectURL(audioBlob);
    return state.lastAudioUrl;
  }

  function renderPracticeAudio(url, transcript) {
    if (!els.audioBox) return;

    if (!url) {
      els.audioBox.classList.add("hidden-panel");
      els.audioBox.innerHTML = "";
      return;
    }

    const transcriptHtml = transcript?.trim()
      ? `<p class="practice-recorded-transcript"><span class="muted">You said:</span> ${UI.escapeHtml(transcript.trim())}</p>`
      : `<p class="muted practice-recorded-transcript">No transcript captured — use playback to hear volume and endings.</p>`;

    els.audioBox.classList.remove("hidden-panel");
    els.audioBox.innerHTML = `
      <div class="speak-panel-head">
        <span class="speak-panel-title"><i class="fa-solid fa-headphones"></i> Your recording</span>
      </div>
      <audio controls src="${url}"></audio>
      ${transcriptHtml}
    `;
  }

  function clearPracticeAudio() {
    if (els.audioBox) {
      els.audioBox.classList.add("hidden-panel");
      els.audioBox.innerHTML = "";
    }
    if (state.lastAudioUrl) {
      URL.revokeObjectURL(state.lastAudioUrl);
      state.lastAudioUrl = null;
    }
    state.audioChunks = [];
  }

  function resetLive() {
    clearPracticeAudio();
    state.metricHistory = [];
    state.pitchHistory = [];
    state.trend = [];
    state.volumeTrend = [];
    state.steadinessTrend = [];
    state.lastKnownPitch = null;
    state.liveScore = null;
    state.transcript = "";
    state.interimTranscript = "";
    state.offlinePitchSamples = [];
    state.drillStartTime = null;
    state.sessionStartTime = null;
    drawGraphs();
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

    updateLiveMetrics({ db, pitch, brightness });
    drawGraphs();

    const drill = getPracticeDrill(state.selectedDrillId);
    const elapsed = (performance.now() - state.drillStartTime) / 1000;
    els.timer.textContent = formatTimer(Math.max(0, drill.durationSec - elapsed));

    if (elapsed >= drill.durationSec) {
      stopDrill();
      return;
    }

    state.raf = requestAnimationFrame(loop);
  }

  function updateLiveMetrics({ db, pitch, brightness }) {
    const drill = getPracticeDrill(state.selectedDrillId);
    const speaking = db > CONSTANTS.speechThresholdDb;
    const elapsed = state.sessionStartTime ? (performance.now() - state.sessionStartTime) / 1000 : 0;

    if (speaking && pitch) {
      state.lastKnownPitch = pitch;
      state.pitchHistory.push(pitch);
      if (state.pitchHistory.length > 180) state.pitchHistory.shift();
    }

    const pitchStd = stdDev(state.pitchHistory.slice(-60));
    const stability = state.pitchHistory.length < 8 ? null : clamp(Math.round(100 - mapRange(pitchStd, 4, 45, 0, 100)), 0, 100);

    const sample = {
      t: performance.now(),
      elapsed,
      speaking,
      pitch: speaking && pitch ? pitch : (speaking ? state.lastKnownPitch : null),
      db: Number.isFinite(db) ? db : null,
      brightness: speaking && brightness ? brightness : null,
      pitchStd: speaking ? pitchStd : null,
      stability: speaking && stability !== null ? stability : null
    };

    state.metricHistory.push(sample);
    if (speaking) {
      state.trend.push({ elapsed, pitch: sample.pitch, db: sample.db, pitchStd });
      state.volumeTrend.push({ elapsed, db: sample.db });
      state.steadinessTrend.push({ elapsed, pitchStd, stability: sample.stability });
    }

    const analysis = analyzeDrillLive(drill, sample, pitchStd);
    state.liveScore = analysis.score;
    state.liveTip = analysis.tip;

    els.liveScore.textContent = analysis.score ?? "--";
    els.liveTip.innerHTML = analysis.tip;

    if (state.volumeTrend.length > 8 || (drill.endingCheck && state.trend.length > 8)) {
      els.endingFeedback.textContent = previewEndingFeedback(state.trend, state.volumeTrend);
    }
  }

  function analyzeDrillLive(drill, sample, pitchStd) {
    if (!sample.speaking) {
      return {
        score: state.liveScore,
        tip: "<strong>Waiting:</strong> speak the drill text clearly."
      };
    }

    const parts = [];
    const tips = [];
    let priorityTip = null;

    const volumeOk = Number.isFinite(sample.db) && sample.db >= drill.volume[0] && sample.db <= drill.volume[1];
    const pitchOk = sample.pitch && sample.pitch >= drill.pitch[0] && sample.pitch <= drill.pitch[1];
    const tooSoft = Number.isFinite(sample.db) && sample.db < drill.volume[0];
    const pitchForcedLow = drill.warnLow && sample.pitch && sample.pitch < drill.warnLow;
    const pitchTooHigh = sample.pitch && sample.pitch > drill.pitch[1];
    const pitchTooLow = sample.pitch && sample.pitch < drill.pitch[0];
    const steadinessOk = pitchStd >= drill.variation[0] && pitchStd <= drill.variation[1];

    if (tooSoft) {
      parts.push(50);
      priorityTip = "Increase breath-supported volume before focusing on pitch.";
    } else if (volumeOk) {
      parts.push(95);
    } else {
      parts.push(65);
      if (!priorityTip) priorityTip = "Reduce pressure — stay in the target volume zone.";
    }

    if (pitchForcedLow) {
      parts.push(45);
      priorityTip = "Do not force your throat lower — relax and let pitch settle naturally.";
    } else if (pitchOk) {
      parts.push(95);
    } else if (pitchTooHigh && !tooSoft) {
      parts.push(68);
      tips.push("slow down and let endings fall slightly");
    } else if (pitchTooLow && !pitchForcedLow) {
      parts.push(72);
    } else if (!sample.pitch) {
      parts.push(55);
    }

    if (steadinessOk) parts.push(92);
    else if (pitchStd > drill.variation[1]) {
      parts.push(65);
      if (!priorityTip && !tooSoft) tips.push("pause and speak one smooth line");
    } else if (pitchStd < drill.variation[0]) {
      parts.push(75);
    }

    const score = parts.length ? Math.round(avg(parts)) : null;
    const mainTip = priorityTip || tips[0] || "Keep going — stay in the green zones.";
    return {
      score,
      tip: `<strong>Live cue:</strong> ${mainTip}`
    };
  }

  function buildDrillReport() {
    const drill = getPracticeDrill(state.selectedDrillId);
    const speechMetrics = state.metricHistory.filter((s) => s.speaking);
    const pitchSamples = collectPitchSamples(speechMetrics);
    const dbSamples = speechMetrics.map((s) => s.db).filter(Number.isFinite);
    const durationSec = state.drillStartTime
      ? Math.round((performance.now() - state.drillStartTime) / 1000)
      : drill.durationSec;

    const avgPitch = avg(pitchSamples);
    const avgDb = avg(dbSamples);
    const pitchStd = stdDev(pitchSamples);
    const steadiness = pitchSamples.length >= 8
      ? clamp(Math.round(100 - mapRange(pitchStd, 4, 45, 0, 100)), 0, 100)
      : null;

    const pitchInTargetPct = window.VCReports.pct(
      pitchSamples.filter((v) => v >= drill.pitch[0] && v <= drill.pitch[1]).length,
      pitchSamples.length
    );
    const volumeInTargetPct = window.VCReports.pct(
      dbSamples.filter((v) => v >= drill.volume[0] && v <= drill.volume[1]).length,
      dbSamples.length
    );

    const endingResult = getEndingResult(state.trend, state.volumeTrend, speechMetrics.length);

    const articulationIssue = drill.trackWords?.length
      ? analyzeArticulation(drill.trackWords, state.transcript || state.interimTranscript, dbSamples)
      : null;

    const issues = [];
    if (volumeInTargetPct < 60) issues.push({ key: "volume", text: "Volume too soft or inconsistent", fix: "Add 10–15% more breath-supported volume before adjusting pitch." });
    if (!pitchSamples.length && speechMetrics.length > 0) {
      issues.push({ key: "pitch-detect", text: "Pitch was not detected", fix: "Speak a little louder with longer vowel sounds so pitch can be measured." });
    } else if (pitchInTargetPct < 60 && volumeInTargetPct >= 60) {
      issues.push({ key: "pitch", text: "Pitch outside target", fix: "Pause, relax shoulders, and speak slower without forcing low." });
    }
    if (pitchStd > drill.variation[1]) issues.push({ key: "steadiness", text: "Too much pitch movement", fix: "Speak one smooth line with a slower pace." });
    if (endingResult && endingResult !== "landed") issues.push({ key: "ending", text: endingResult, fix: endingFix(endingResult) });
    if (articulationIssue) issues.push({ key: "articulation", text: articulationIssue, fix: "Open mouth slightly and give small words full volume." });
    if (drill.warnLow && avgPitch && avgPitch < drill.warnLow) {
      issues.unshift({ key: "strain", text: "Pitch may be forced too low", fix: "Stop pushing your throat — return to a comfortable pitch." });
    }

    const topIssue = issues[0]?.text || "Good work — minor polish needed";
    const correction = issues[0]?.fix || "Repeat the drill once more with the same calm focus.";

    let scoreParts = [];
    if (drill.visual === "volume" || volumeInTargetPct) scoreParts.push(volumeInTargetPct);
    if (pitchInTargetPct) scoreParts.push(pitchInTargetPct);
    if (steadiness !== null) scoreParts.push(steadiness);
    if (endingResult === "landed") scoreParts.push(90);
    else if (endingResult) scoreParts.push(55);

    const score = scoreParts.length ? Math.round(avg(scoreParts)) : (state.liveScore ?? 0);
    const passed = score >= drill.passScore;

    return {
      drillId: drill.id,
      drillName: drill.name,
      level: drill.level,
      durationSec,
      avgPitch,
      avgDb,
      steadiness,
      pitchStd,
      pitchInTargetPct,
      volumeInTargetPct,
      endingResult,
      topIssue,
      correction,
      score,
      passed,
      transcript: state.transcript || state.interimTranscript
    };
  }

  function collectPitchSamples(speechMetrics) {
    const fromHistory = speechMetrics.map((s) => s.pitch).filter(Number.isFinite);
    if (fromHistory.length) return fromHistory;

    const fromTrend = state.trend.map((point) => point.pitch).filter(Number.isFinite);
    if (fromTrend.length) return fromTrend;

    if (state.offlinePitchSamples.length) return state.offlinePitchSamples.slice();

    if (state.pitchHistory.length) return state.pitchHistory.slice();
    if (Number.isFinite(state.lastKnownPitch)) return [state.lastKnownPitch];

    return [];
  }

  function getEndingResult(pitchTrend, volumeTrend, speechFrameCount) {
    if (volumeTrend.length < 6 && pitchTrend.length < 6) {
      return speechFrameCount > 0 ? "Not enough speech" : null;
    }
    return analyzeEnding(pitchTrend, volumeTrend);
  }

  function formatPitchAvg(value) {
    return Number.isFinite(value) ? `${window.VCReports.round(value)} Hz` : "Not detected";
  }

  function formatEndingLabel(result) {
    if (!result) return "—";
    if (result === "landed") return "Ending landed clearly";
    if (result === "Not enough speech") return "Not enough speech";
    return result;
  }

  function analyzeEnding(pitchTrend, volumeTrend) {
    if (pitchTrend.length < 6) return "Not enough speech";
    const third = Math.max(1, Math.floor(pitchTrend.length / 3));
    const start = pitchTrend.slice(0, third).map((p) => p.pitch).filter(Boolean);
    const end = pitchTrend.slice(-third).map((p) => p.pitch).filter(Boolean);
    const startDb = volumeTrend.slice(0, third).map((p) => p.db).filter(Number.isFinite);
    const endDb = volumeTrend.slice(-third).map((p) => p.db).filter(Number.isFinite);

    const startPitch = avg(start);
    const endPitch = avg(end);
    const startVol = avg(startDb);
    const endVol = avg(endDb);

    if (Number.isFinite(endVol) && Number.isFinite(startVol) && endVol < startVol - 4) {
      return "Ending faded too soft";
    }
    if (Number.isFinite(endPitch) && Number.isFinite(startPitch) && endPitch > startPitch + 8) {
      return "Ending rose like a question";
    }
    return "landed";
  }

  function previewEndingFeedback(pitchTrend, volumeTrend) {
    const result = analyzeEnding(pitchTrend, volumeTrend);
    if (result === "landed") return "Ending landed clearly";
    if (result === "Ending rose like a question") return "Ending rose like a question — let it fall";
    if (result === "Ending faded too soft") return "Ending faded too soft — keep volume";
    return result;
  }

  function endingFix(result) {
    if (result === "Ending rose like a question") return "Treat statements as statements — let the last words fall slightly downward.";
    if (result === "Ending faded too soft") return "Keep the same volume through the last word.";
    return "Pause before the last phrase and land it with calm control.";
  }

  function analyzeArticulation(trackWords, transcript, dbSamples) {
    if (!transcript.trim()) return "Could not detect words — speak the full text";
    const avgDb = avg(dbSamples);
    if (Number.isFinite(avgDb) && avgDb < -44) return "Small words may be too soft";
    const spoken = transcript.toLowerCase();
    const missing = trackWords.filter((w) => !spoken.includes(w));
    if (missing.length > trackWords.length / 2) return `Missing words: ${missing.slice(0, 4).join(", ")}`;
    return null;
  }

  function showResult(report) {
    const drill = getPracticeDrill(report.drillId);
    const endingLabel = formatEndingLabel(report.endingResult);
    const pitchNote = Number.isFinite(report.avgPitch)
      ? ""
      : `<small class="result-note">Speak louder with longer vowels to capture pitch.</small>`;

    els.resultContent.innerHTML = `
      <div class="result-header ${report.passed ? "pass" : "fail"}">
        <i class="fa-solid ${report.passed ? "fa-circle-check" : "fa-circle-xmark"}"></i>
        <div>
          <h3>${report.passed ? "Drill passed" : "Keep practicing"}</h3>
          <p class="muted">Score ${report.score} · Target ${drill.passScore}+</p>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-stat"><span>Drill</span><b>${UI.escapeHtml(report.drillName)}</b></div>
        <div class="result-stat"><span>Duration</span><b>${report.durationSec}s</b></div>
        <div class="result-stat">
          <span>Avg pitch</span>
          <b>${formatPitchAvg(report.avgPitch)}</b>
          <small class="result-target">Target ${drill.pitch[0]}–${drill.pitch[1]} Hz</small>
          ${pitchNote}
        </div>
        <div class="result-stat">
          <span>Avg volume</span>
          <b>${window.VCReports.round(report.avgDb)} dB</b>
          <small class="result-target">Target ${drill.volume[0]} to ${drill.volume[1]} dB</small>
        </div>
        <div class="result-stat"><span>Steadiness</span><b>${report.steadiness ?? "--"} / 100</b></div>
        <div class="result-stat"><span>Pitch in target</span><b>${report.pitchInTargetPct}%</b></div>
        <div class="result-stat"><span>Volume in target</span><b>${report.volumeInTargetPct}%</b></div>
        <div class="result-stat"><span>Ending</span><b>${UI.escapeHtml(endingLabel)}</b></div>
      </div>
      <div class="result-issue">
        <strong>Top issue:</strong> ${UI.escapeHtml(report.topIssue)}
      </div>
      <div class="coach-tip">
        <strong>Next attempt:</strong> ${UI.escapeHtml(report.correction)}
      </div>
    `;
    els.resultPanel.classList.add("open");
  }

  function hideResult() {
    els.resultPanel.classList.remove("open");
  }

  function saveProgress(report) {
    const prev = state.completedDrills[report.drillId] || {};
    state.completedDrills[report.drillId] = {
      passed: prev.passed || report.passed,
      bestScore: Math.max(prev.bestScore || 0, report.score),
      lastScore: report.score,
      lastAt: new Date().toISOString()
    };
    window.VCStorage.savePracticeProgress(state.completedDrills);
  }

  function selectNextDrill() {
    hideResult();
    const drills = getDrillsForLevel(state.selectedLevel);
    const idx = drills.findIndex((d) => d.id === state.selectedDrillId);
    const next = drills[idx + 1] || drills[0];
    state.selectedDrillId = next.id;
    renderAll();
  }

  function drawGraphs() {
    const drill = getPracticeDrill(state.selectedDrillId);
    if (!drill) return;

    drawPitchGraph(drill);
    drawVolumeGraph(drill);
    drawSteadinessGraph(drill);
  }

  function getGraphCanvasWidth(scrollEl) {
    const width = scrollEl?.clientWidth || scrollEl?.offsetWidth || 0;
    return Math.max(320, width);
  }

  function sizeCanvasToContainer(canvas, scrollEl) {
    const width = getGraphCanvasWidth(scrollEl);
    if (canvas.width !== width) canvas.width = width;
    return width;
  }

  function drawPitchGraph(drill) {
    if (!pitchCtx || els.pitchPanel.classList.contains("hidden-panel")) return;

    const trend = state.trend.filter((p) => p.pitch);
    const canvas = els.pitchCanvas;
    const w = sizeCanvasToContainer(canvas, els.pitchScroll);
    const h = canvas.height;
    const leftPad = 48;
    const rightPad = 90;
    const topPad = 12;
    const bottomPad = 28;
    const plotW = w - leftPad - rightPad;
    const plotH = h - topPad - bottomPad;
    const plotTop = topPad;

    pitchCtx.clearRect(0, 0, w, h);

    const maxElapsed = trend.length ? Math.max(...trend.map((p) => p.elapsed)) : drill.durationSec;

    pitchCtx.strokeStyle = "rgba(255,255,255,0.10)";
    pitchCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = plotTop + (plotH / 4) * i;
      pitchCtx.beginPath();
      pitchCtx.moveTo(leftPad, y);
      pitchCtx.lineTo(w - rightPad, y);
      pitchCtx.stroke();
    }

    const y1 = pitchToY(drill.pitch[0], plotTop, plotH);
    const y2 = pitchToY(drill.pitch[1], plotTop, plotH);
    pitchCtx.fillStyle = "rgba(54,211,153,0.14)";
    pitchCtx.fillRect(leftPad, y2, plotW, Math.max(1, y1 - y2));

    const avgPitch = avg(trend.map((p) => p.pitch).filter(Boolean));
    if (Number.isFinite(avgPitch)) {
      const avgY = pitchToY(avgPitch, plotTop, plotH);
      pitchCtx.strokeStyle = "rgba(251,191,36,0.95)";
      pitchCtx.setLineDash([6, 5]);
      pitchCtx.beginPath();
      pitchCtx.moveTo(leftPad, avgY);
      pitchCtx.lineTo(w - rightPad, avgY);
      pitchCtx.stroke();
      pitchCtx.setLineDash([]);
    }

    if (!trend.length) {
      pitchCtx.fillStyle = "rgba(238,244,255,0.55)";
      pitchCtx.font = "13px system-ui";
      pitchCtx.fillText("Start drill to see pitch movement.", leftPad, plotTop + plotH / 2);
      return;
    }

    const timeSpan = Math.max(1, maxElapsed);
    pitchCtx.strokeStyle = "rgba(96,165,250,0.96)";
    pitchCtx.lineWidth = 2;
    pitchCtx.beginPath();
    trend.forEach((point, i) => {
      const x = leftPad + (point.elapsed / timeSpan) * plotW;
      const y = pitchToY(point.pitch, plotTop, plotH);
      if (i === 0) pitchCtx.moveTo(x, y);
      else pitchCtx.lineTo(x, y);
    });
    pitchCtx.stroke();

  }

  function drawVolumeGraph(drill) {
    if (!volumeCtx || els.volumePanel.classList.contains("hidden-panel")) return;

    const trend = state.volumeTrend.filter((p) => Number.isFinite(p.db));
    const canvas = els.volumeCanvas;
    const w = sizeCanvasToContainer(canvas, els.volumeScroll);
    const h = canvas.height;
    const leftPad = 48;
    const rightPad = 90;
    const topPad = 12;
    const bottomPad = 28;
    const plotW = w - leftPad - rightPad;
    const plotH = h - topPad - bottomPad;
    const plotTop = topPad;

    volumeCtx.clearRect(0, 0, w, h);

    const y1 = dbToY(drill.volume[0], plotTop, plotH);
    const y2 = dbToY(drill.volume[1], plotTop, plotH);
    volumeCtx.fillStyle = "rgba(54,211,153,0.18)";
    volumeCtx.fillRect(leftPad, y2, plotW, Math.max(1, y1 - y2));

    if (!trend.length) {
      volumeCtx.fillStyle = "rgba(238,244,255,0.55)";
      volumeCtx.font = "13px system-ui";
      volumeCtx.fillText("Volume bar — green zone is your target.", leftPad, plotTop + plotH / 2);
      return;
    }

    const timeSpan = Math.max(1, Math.max(...trend.map((p) => p.elapsed)));
    volumeCtx.strokeStyle = "rgba(167,139,250,0.96)";
    volumeCtx.lineWidth = 2.5;
    volumeCtx.beginPath();
    trend.forEach((point, i) => {
      const x = leftPad + (point.elapsed / timeSpan) * plotW;
      const y = dbToY(point.db, plotTop, plotH);
      if (i === 0) volumeCtx.moveTo(x, y);
      else volumeCtx.lineTo(x, y);
    });
    volumeCtx.stroke();

  }

  function drawSteadinessGraph(drill) {
    if (!steadinessCtx || els.steadinessPanel.classList.contains("hidden-panel")) return;

    const trend = state.steadinessTrend.filter((p) => Number.isFinite(p.pitchStd));
    const canvas = els.steadinessCanvas;
    const w = sizeCanvasToContainer(canvas, els.steadinessScroll);
    const h = canvas.height;
    const leftPad = 48;
    const rightPad = 90;
    const topPad = 12;
    const bottomPad = 28;
    const plotW = w - leftPad - rightPad;
    const plotH = h - topPad - bottomPad;
    const plotTop = topPad;
    const stdMax = 40;

    steadinessCtx.clearRect(0, 0, w, h);

    const y1 = stdToY(drill.variation[1], plotTop, plotH, stdMax);
    const y2 = stdToY(drill.variation[0], plotTop, plotH, stdMax);
    steadinessCtx.fillStyle = "rgba(54,211,153,0.14)";
    steadinessCtx.fillRect(leftPad, y1, plotW, Math.max(1, y2 - y1));

    if (!trend.length) {
      steadinessCtx.fillStyle = "rgba(238,244,255,0.55)";
      steadinessCtx.font = "13px system-ui";
      steadinessCtx.fillText("Pitch variation — smoother is better.", leftPad, plotTop + plotH / 2);
      return;
    }

    const timeSpan = Math.max(1, Math.max(...trend.map((p) => p.elapsed)));
    steadinessCtx.strokeStyle = "rgba(52,211,153,0.96)";
    steadinessCtx.lineWidth = 2;
    steadinessCtx.beginPath();
    trend.forEach((point, i) => {
      const x = leftPad + (point.elapsed / timeSpan) * plotW;
      const y = stdToY(point.pitchStd, plotTop, plotH, stdMax);
      if (i === 0) steadinessCtx.moveTo(x, y);
      else steadinessCtx.lineTo(x, y);
    });
    steadinessCtx.stroke();

  }

  function pitchToY(pitch, plotTop, plotH) {
    const pct = clamp(mapRange(pitch, CONSTANTS.pitchMin, CONSTANTS.pitchMax), 0, 100) / 100;
    return plotTop + plotH - pct * plotH;
  }

  function dbToY(db, plotTop, plotH) {
    const pct = clamp(mapRange(db, CONSTANTS.volumeMin, CONSTANTS.volumeMax), 0, 100) / 100;
    return plotTop + plotH - pct * plotH;
  }

  function stdToY(std, plotTop, plotH, max) {
    const pct = clamp(std / max, 0, 1);
    return plotTop + plotH - pct * plotH;
  }

  function formatTimer(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
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
    return Math.sqrt(clean.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / clean.length);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function mapRange(value, inMin, inMax, outMin = 0, outMax = 100) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  return {
    init,
    show,
    hide,
    isVisible,
    isRecording,
    startDrill,
    stopDrill
  };
})();
