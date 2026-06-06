window.VCUI = (() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    liveDot: $("liveDot"),
    liveLabel: $("liveLabel"),
    selectedCoachName: $("selectedCoachName"),
    selectedCoachTarget: $("selectedCoachTarget"),
    selectedTemplateMeta: $("selectedTemplateMeta"),
    selectedTemplateTitle: $("selectedTemplateTitle"),
    practiceText: $("practiceText"),
    editTextBtn: $("editTextBtn"),
    agentGuidance: $("agentGuidance"),
    intentTextBox: $("intentTextBox"),
    pitchTargetLabel: $("pitchTargetLabel"),
    volumeTargetLabel: $("volumeTargetLabel"),
    stabilityTargetLabel: $("stabilityTargetLabel"),
    brightnessTargetLabel: $("brightnessTargetLabel"),
    pitchValue: $("pitchValue"),
    pitchStatus: $("pitchStatus"),
    pitchFill: $("pitchFill"),
    pitchTarget: $("pitchTarget"),
    volumeValue: $("volumeValue"),
    volumeStatus: $("volumeStatus"),
    volumeFill: $("volumeFill"),
    volumeTarget: $("volumeTarget"),
    stabilityValue: $("stabilityValue"),
    stabilityStatus: $("stabilityStatus"),
    stabilityFill: $("stabilityFill"),
    brightnessValue: $("brightnessValue"),
    brightnessStatus: $("brightnessStatus"),
    brightnessFill: $("brightnessFill"),
    scoreValue: $("scoreValue"),
    scorePills: $("scorePills"),
    tipsBox: $("tipsBox"),
    transcriptBox: $("transcriptBox"),
    promptModalContent: $("promptModalContent"),
    promptModal: $("promptModal"),
    summaryModal: $("summaryModal"),
    sessionSummary: $("sessionSummary"),
    wordStatsBody: $("wordStatsBody"),
    historyBody: $("historyBody"),
    audioPlaybackBox: $("audioPlaybackBox"),
    pitchCanvas: $("pitchCanvas"),
    pitchDuration: $("pitchDuration"),
    showAvgLineToggle: $("showAvgLineToggle"),
    pitchScroll: $("pitchScroll"),
    libraryModal: $("libraryModal"),
    libraryGrid: $("libraryGrid"),
    difficultyFilters: $("difficultyFilters"),
    toast: $("toast")
  };

  const ctx = els.pitchCanvas.getContext("2d");
  let toastTimer = null;
  let savedScrollY = 0;

  const modalElements = () => [els.libraryModal, els.promptModal, els.summaryModal].filter(Boolean);

  function updateBodyScrollLock() {
    const anyOpen = modalElements().some((modal) => modal.classList.contains("open"));

    if (anyOpen) {
      if (!document.body.classList.contains("modal-open")) {
        savedScrollY = window.scrollY;
        document.documentElement.classList.add("modal-open");
        document.body.classList.add("modal-open");
        document.body.style.top = `-${savedScrollY}px`;
      }
      return;
    }

    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, savedScrollY);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mapRange(value, inMin, inMax, outMin = 0, outMax = 100) {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  function normalizeWord(word) {
    return String(word ?? "")
      .toLowerCase()
      .replace(/[^\w']/g, "")
      .replace(/^'+|'+$/g, "");
  }

  function tokenizeText(text) {
    const matches = String(text ?? "").match(/\S+/g) || [];
    return matches.map((raw) => ({ raw, normalized: normalizeWord(raw) })).filter((token) => token.normalized);
  }

  function computeSpokenProgress(intentText, finalText, interimText, confirmedProgress = 0) {
    const intentWords = tokenizeText(intentText);
    const finalWords = tokenizeText(finalText);

    let progress = 0;
    let idx = 0;
    while (progress < intentWords.length && idx < finalWords.length) {
      if (intentWords[progress].normalized === finalWords[idx].normalized) {
        progress += 1;
        idx += 1;
      } else {
        idx += 1;
      }
    }

    const confirmed = Math.max(confirmedProgress, progress);
    let liveProgress = confirmed;
    let hasPartial = false;

    if (interimText && confirmed < intentWords.length) {
      const interimWords = tokenizeText(interimText);
      let temp = confirmed;
      let iIdx = 0;

      while (temp < intentWords.length && iIdx < interimWords.length) {
        const intent = intentWords[temp].normalized;
        const spoken = interimWords[iIdx].normalized;

        if (intent === spoken) {
          temp += 1;
          iIdx += 1;
        } else if (iIdx === interimWords.length - 1 && spoken.length >= 1 && intent.startsWith(spoken)) {
          hasPartial = true;
          break;
        } else {
          iIdx += 1;
        }
      }

      liveProgress = temp;
    }

    return {
      progress: liveProgress,
      confirmedProgress: confirmed,
      hasPartial
    };
  }

  function setBand(el, min, max, globalMin, globalMax) {
    const left = clamp(mapRange(min, globalMin, globalMax), 0, 100);
    const right = clamp(mapRange(max, globalMin, globalMax), 0, 100);
    el.style.left = `${left}%`;
    el.style.width = `${Math.max(0, right - left)}%`;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1600);
  }

  function setRecordingState(isRecording, label = "") {
    els.liveDot.classList.toggle("live", isRecording);
    els.liveLabel.textContent = label || (isRecording ? "Recording" : "Session off");
  }

  function renderIntentHighlight({ text, spokenCount, interimPartial, editable }) {
    els.practiceText.classList.toggle("hidden-edit", !editable);
    els.intentTextBox.style.display = editable ? "none" : "block";

    if (editable) {
      els.practiceText.value = text;
      return;
    }

    if (!text || !text.trim()) {
      els.intentTextBox.innerHTML = `<span class="placeholder">Select a template from Library to load the practice script.</span>`;
      return;
    }

    const tokens = String(text).match(/\S+/g) || [];
    let wordIndex = 0;

    els.intentTextBox.innerHTML = tokens.map((raw) => {
      const normalized = normalizeWord(raw);
      if (!normalized) {
        return `${escapeHtml(raw)} `;
      }

      let cls = "intent-word";
      if (wordIndex < spokenCount) cls += " spoken";
      else if (wordIndex === spokenCount && interimPartial) cls += " current";
      const html = `<span class="${cls}">${escapeHtml(raw)}</span> `;
      wordIndex += 1;
      return html;
    }).join("");

    const currentEl = els.intentTextBox.querySelector(".intent-word.current");
    const lastSpokenEl = els.intentTextBox.querySelector(".intent-word.spoken:last-of-type");
    const scrollTarget = currentEl || lastSpokenEl;
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function renderSelection({ agent, template, editable, spokenCount = 0, interimPartial = false }) {
    els.selectedCoachName.textContent = agent.name;
    els.selectedCoachTarget.textContent = `Pitch ${agent.pitch[0]}–${agent.pitch[1]} Hz · Volume ${agent.volume[0]} to ${agent.volume[1]} dB`;
    els.selectedTemplateMeta.textContent = `${template.title} · ${window.VCData.labelDifficulty(template.difficulty)}`;
    els.selectedTemplateTitle.textContent = template.title;
    els.practiceText.value = template.text;
    els.practiceText.readOnly = !editable;
    els.editTextBtn.innerHTML = editable
      ? `<i class="fa-solid fa-lock"></i> Lock`
      : `<i class="fa-solid fa-pen"></i> Edit`;

    els.pitchTargetLabel.textContent = `Target ${agent.pitch[0]}–${agent.pitch[1]} Hz`;
    els.volumeTargetLabel.textContent = `Target ${agent.volume[0]} to ${agent.volume[1]} dB`;
    els.stabilityTargetLabel.textContent = `Var ${agent.variation[0]}–${agent.variation[1]} Hz`;
    els.brightnessTargetLabel.textContent = `Target ${agent.brightness[0]}–${agent.brightness[1]} Hz`;

    els.agentGuidance.innerHTML = `
      <span class="guidance-chip">Coach: ${escapeHtml(agent.name)}</span>
      <span class="guidance-chip">Cue: ${escapeHtml(agent.cue)}</span>
      <span class="guidance-chip">Avoid: ${escapeHtml(agent.avoid)}</span>
    `;

    const c = window.VCAudio.CONSTANTS;
    setBand(els.pitchTarget, agent.pitch[0], agent.pitch[1], c.pitchMin, c.pitchMax);
    setBand(els.volumeTarget, agent.volume[0], agent.volume[1], c.volumeMin, c.volumeMax);

    renderIntentHighlight({
      text: template.text,
      spokenCount,
      interimPartial,
      editable
    });
  }

  function updateMetricCards({ sample, agent, score, analysis }) {
    const c = window.VCAudio.CONSTANTS;

    els.pitchValue.textContent = sample.pitch ? Math.round(sample.pitch) : "--";
    els.volumeValue.textContent = Number.isFinite(sample.db) ? Math.round(sample.db) : "--";
    els.stabilityValue.textContent = sample.stability !== null ? Math.round(sample.stability) : "--";
    els.brightnessValue.textContent = sample.brightness ? Math.round(sample.brightness) : "--";

    els.pitchStatus.textContent = analysis.pitchStatus;
    els.volumeStatus.textContent = analysis.volumeStatus;
    els.stabilityStatus.textContent = analysis.stabilityStatus;
    els.brightnessStatus.textContent = analysis.brightnessStatus;

    els.pitchFill.style.width = sample.pitch ? `${clamp(mapRange(sample.pitch, c.pitchMin, c.pitchMax), 0, 100)}%` : "0%";
    els.volumeFill.style.width = Number.isFinite(sample.db) ? `${clamp(mapRange(sample.db, c.volumeMin, c.volumeMax), 0, 100)}%` : "0%";
    els.stabilityFill.style.width = sample.stability !== null ? `${clamp(sample.stability, 0, 100)}%` : "0%";
    els.brightnessFill.style.width = sample.brightness ? `${clamp(mapRange(sample.brightness, c.brightnessMin, c.brightnessMax), 0, 100)}%` : "0%";

    colorFill(els.pitchFill, analysis.pitchType);
    colorFill(els.volumeFill, analysis.volumeType);
    colorFill(els.stabilityFill, analysis.stabilityType);
    colorFill(els.brightnessFill, analysis.brightnessType);

    els.scoreValue.textContent = score ?? "--";
    els.scorePills.innerHTML = analysis.pills.map((pill) => `<span class="pill ${pill.type}">${escapeHtml(pill.text)}</span>`).join("");
    els.tipsBox.innerHTML = analysis.tip;
  }

  function showSessionAverages(session) {
    const c = window.VCAudio.CONSTANTS;
    const round = window.VCReports.round;

    els.pitchValue.textContent = round(session.avgPitch);
    els.pitchStatus.textContent = Number.isFinite(session.avgPitch) ? `Session average pitch: ${Math.round(session.avgPitch)} Hz` : "No average pitch captured.";
    els.pitchFill.style.width = Number.isFinite(session.avgPitch) ? `${clamp(mapRange(session.avgPitch, c.pitchMin, c.pitchMax), 0, 100)}%` : "0%";

    els.volumeValue.textContent = round(session.avgDb);
    els.volumeStatus.textContent = Number.isFinite(session.avgDb) ? `Session average volume: ${Math.round(session.avgDb)} dB` : "No average volume captured.";
    els.volumeFill.style.width = Number.isFinite(session.avgDb) ? `${clamp(mapRange(session.avgDb, c.volumeMin, c.volumeMax), 0, 100)}%` : "0%";

    els.stabilityValue.textContent = round(session.avgStability);
    els.stabilityStatus.textContent = Number.isFinite(session.avgStability) ? `Session average steadiness: ${Math.round(session.avgStability)} / 100` : "No steadiness captured.";
    els.stabilityFill.style.width = Number.isFinite(session.avgStability) ? `${clamp(session.avgStability, 0, 100)}%` : "0%";

    els.brightnessValue.textContent = round(session.avgBrightness);
    els.brightnessStatus.textContent = Number.isFinite(session.avgBrightness) ? `Session average warmth/brightness: ${Math.round(session.avgBrightness)} Hz` : "No warmth captured.";
    els.brightnessFill.style.width = Number.isFinite(session.avgBrightness) ? `${clamp(mapRange(session.avgBrightness, c.brightnessMin, c.brightnessMax), 0, 100)}%` : "0%";

    els.scoreValue.textContent = session.score ?? "--";
  }

  function colorFill(el, type) {
    if (type === "good") {
      el.style.background = "linear-gradient(90deg, var(--info), var(--good))";
    } else if (type === "bad") {
      el.style.background = "linear-gradient(90deg, var(--bad), var(--warn))";
    } else {
      el.style.background = "linear-gradient(90deg, var(--warn), var(--info))";
    }
  }

  function renderTranscript(finalText, interimText) {
    if (!finalText && !interimText) {
      els.transcriptBox.innerHTML = `<span class="placeholder">Start recording and speak. Browser words will appear here.</span>`;
      return;
    }

    els.transcriptBox.innerHTML = `
      <span class="final-transcript">${escapeHtml(finalText)}</span>
      ${interimText ? `<span class="interim-transcript"> ${escapeHtml(interimText)}</span>` : ""}
    `;
    els.transcriptBox.scrollTop = els.transcriptBox.scrollHeight;
  }

  function updateSpeakAlong({ intentText, finalText, interimText, editable, confirmedProgress = 0, maxProgress = 0 }) {
    const { progress: liveProgress, hasPartial, confirmedProgress: confirmed } = computeSpokenProgress(
      intentText,
      finalText,
      interimText,
      confirmedProgress
    );
    const spokenCount = Math.max(maxProgress, liveProgress);

    renderIntentHighlight({
      text: intentText,
      spokenCount,
      interimPartial: hasPartial && spokenCount === liveProgress,
      editable
    });
    renderTranscript(finalText, interimText);

    return { spokenCount, confirmedProgress: confirmed };
  }

  function pitchToY(pitch, plotTop, plotHeight) {
    const c = window.VCAudio.CONSTANTS;
    const pct = clamp(mapRange(pitch, c.pitchMin, c.pitchMax), 0, 100) / 100;
    return plotTop + plotHeight - pct * plotHeight;
  }

  function drawPitchGraph({ trend, agent, avgPitch, showAvgLine }) {
    const canvas = els.pitchCanvas;
    const visiblePoints = trend.filter((point) => point.pitch);
    const width = Math.max(900, 520 + visiblePoints.length * 9);
    if (canvas.width !== width) canvas.width = width;

    const w = canvas.width;
    const h = canvas.height;
    const leftPad = 54;
    const rightPad = 108;
    const topPad = 14;
    const bottomPad = 34;
    const plotW = w - leftPad - rightPad;
    const plotH = h - topPad - bottomPad;
    const plotTop = topPad;
    const plotBottom = topPad + plotH;

    ctx.clearRect(0, 0, w, h);

    const maxElapsed = visiblePoints.length
      ? Math.max(...visiblePoints.map((point) => point.elapsed || 0))
      : 0;

    els.pitchDuration.textContent = `Total: ${formatDuration(maxElapsed)}`;

    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(238,244,255,0.55)";
    ctx.font = "11px system-ui";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
      const y = plotTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(leftPad, y);
      ctx.lineTo(w - rightPad, y);
      ctx.stroke();

      const pitchValue = Math.round(window.VCAudio.CONSTANTS.pitchMax - ((window.VCAudio.CONSTANTS.pitchMax - window.VCAudio.CONSTANTS.pitchMin) / 4) * i);
      ctx.fillText(`${pitchValue}`, leftPad - 8, y + 4);
    }

    const targetY1 = pitchToY(agent.pitch[0], plotTop, plotH);
    const targetY2 = pitchToY(agent.pitch[1], plotTop, plotH);
    ctx.fillStyle = "rgba(54,211,153,0.14)";
    ctx.fillRect(leftPad, targetY2, plotW, Math.max(1, targetY1 - targetY2));

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(54,211,153,0.95)";
    ctx.font = "11px system-ui";
    const targetMidY = (targetY1 + targetY2) / 2;
    ctx.fillText(`Target: ${agent.pitch[0]}–${agent.pitch[1]} Hz`, w - rightPad + 8, targetMidY + 4);

    if (showAvgLine && Number.isFinite(avgPitch)) {
      const avgY = pitchToY(avgPitch, plotTop, plotH);
      ctx.save();
      ctx.strokeStyle = "rgba(251,191,36,0.95)";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(leftPad, avgY);
      ctx.lineTo(w - rightPad, avgY);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(251,191,36,0.95)";
      ctx.fillText(`Avg: ${Math.round(avgPitch)} Hz`, w - rightPad + 8, avgY + 4);
    }

    if (!visiblePoints.length) {
      ctx.fillStyle = "rgba(238,244,255,0.55)";
      ctx.font = "14px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("Start speaking to build a pitch trend.", leftPad, plotTop + plotH / 2);
      return;
    }

    const timeSpan = Math.max(1, maxElapsed);
    const tickCount = Math.min(8, Math.max(3, Math.ceil(timeSpan / 15)));
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(238,244,255,0.50)";
    ctx.font = "10px system-ui";

    for (let i = 0; i <= tickCount; i++) {
      const ratio = i / tickCount;
      const x = leftPad + ratio * plotW;
      const seconds = ratio * timeSpan;
      ctx.beginPath();
      ctx.moveTo(x, plotBottom);
      ctx.lineTo(x, plotBottom + 4);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.stroke();
      ctx.fillText(formatDuration(seconds), x, h - 8);
    }

    ctx.strokeStyle = "rgba(96,165,250,0.96)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    visiblePoints.forEach((point, index) => {
      const x = leftPad + (point.elapsed / timeSpan) * plotW;
      const y = pitchToY(point.pitch, plotTop, plotH);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (els.pitchScroll && visiblePoints.length > 3) {
      els.pitchScroll.scrollLeft = els.pitchScroll.scrollWidth;
    }
  }

  function renderPrompt(report) {
    els.promptModalContent.textContent = report || "No report yet. Finish a recording to generate a self-contained report.";
  }

  function renderReport(report) {
    renderPrompt(report);
  }

  function renderSessionSummary(session) {
    if (!session) {
      els.sessionSummary.innerHTML = `<div class="summary-row"><span>No saved session yet</span><b>--</b></div>`;
      return;
    }

    els.sessionSummary.innerHTML = `
      <div class="summary-row"><span>Coach</span><b>${escapeHtml(session.agentName)}</b></div>
      <div class="summary-row"><span>Template</span><b>${escapeHtml(session.templateTitle)}</b></div>
      <div class="summary-row"><span>Duration</span><b>${session.durationSec}s</b></div>
      <div class="summary-row"><span>Transcript source</span><b>${escapeHtml(session.transcriptSource)}</b></div>
      <div class="summary-row"><span>Words</span><b>${session.wordCount}</b></div>
      <div class="summary-row"><span>Average pitch</span><b>${window.VCReports.round(session.avgPitch)} Hz</b></div>
      <div class="summary-row"><span>Average volume</span><b>${window.VCReports.round(session.avgDb)} dB</b></div>
      <div class="summary-row"><span>Score</span><b>${session.score ?? "--"}</b></div>
    `;
  }

  function renderAudio(url) {
    if (!url) {
      els.audioPlaybackBox.innerHTML = "";
      return;
    }
    els.audioPlaybackBox.innerHTML = `
      <p class="muted" style="margin-top:10px;">Latest audio playback is available until page refresh.</p>
      <audio controls src="${url}"></audio>
    `;
  }

  function renderSummaryContent(session) {
    renderSessionSummary(session);
    renderWordStats(session?.wordEntries || []);
  }

  function renderWordStats(words) {
    const stats = window.VCReports.getWordStats(words).slice(0, 40);

    if (!stats.length) {
      els.wordStatsBody.innerHTML = `<tr><td colspan="4">No words yet.</td></tr>`;
      return;
    }

    els.wordStatsBody.innerHTML = stats.map((item) => `
      <tr>
        <td><b>${escapeHtml(item.word)}</b></td>
        <td>${item.count}</td>
        <td>${window.VCReports.round(item.avgPitch)}</td>
        <td>${window.VCReports.round(item.avgDb)}</td>
      </tr>
    `).join("");
  }

  function renderHistory(sessions) {
    if (!sessions.length) {
      els.historyBody.innerHTML = `<tr><td colspan="10">No history yet.</td></tr>`;
      return;
    }

    els.historyBody.innerHTML = sessions.map((session) => `
      <tr>
        <td>${new Date(session.startedAt).toLocaleString()}</td>
        <td>${escapeHtml(session.agentName)}</td>
        <td>${escapeHtml(session.templateTitle)}</td>
        <td>${escapeHtml(window.VCData.labelDifficulty(session.difficulty))}</td>
        <td>${session.durationSec}s</td>
        <td>${session.wordCount}</td>
        <td>${window.VCReports.round(session.avgPitch)}</td>
        <td>${window.VCReports.round(session.avgDb)}</td>
        <td>${session.score ?? "--"}</td>
        <td>
          <button class="history-download-btn" type="button" data-download-session="${session.id}" title="Download this session CSV">
            <i class="fa-solid fa-download"></i> CSV
          </button>
        </td>
      </tr>
    `).join("");
  }

  function renderLibrary({ templates, selectedTemplateId, filter }) {
    const filters = [
      ["all", "All"],
      ["basic", "Basic"],
      ["mid", "Mid"],
      ["mid-high", "Mid-high"],
      ["challenging", "Challenging"]
    ];

    els.difficultyFilters.innerHTML = filters.map(([key, label]) => `
      <button class="filter-chip ${filter === key ? "active" : ""}" type="button" data-filter="${key}">${label}</button>
    `).join("");

    els.libraryGrid.innerHTML = templates.map((template) => {
      const agent = window.VCData.getAgent(template.agent);
      return `
        <article class="library-item ${template.id === selectedTemplateId ? "active" : ""}" data-template="${template.id}">
          <div class="difficulty ${template.difficulty}">${window.VCData.labelDifficulty(template.difficulty)}</div>
          <h3>${escapeHtml(template.title)}</h3>
          <p class="muted" style="margin-top:6px;">${escapeHtml(template.goal)}</p>
          <div class="pill-wrap" style="margin-top:8px;">
            <span class="pill">${escapeHtml(agent.name)}</span>
            <span class="pill">${agent.pitch[0]}–${agent.pitch[1]} Hz</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function openLibrary() {
    els.libraryModal.classList.add("open");
    els.libraryModal.setAttribute("aria-hidden", "false");
    updateBodyScrollLock();
  }

  function closeLibrary() {
    els.libraryModal.classList.remove("open");
    els.libraryModal.setAttribute("aria-hidden", "true");
    updateBodyScrollLock();
  }

  function openPromptModal() {
    els.promptModal.classList.add("open");
    els.promptModal.setAttribute("aria-hidden", "false");
    updateBodyScrollLock();
  }

  function closePromptModal() {
    els.promptModal.classList.remove("open");
    els.promptModal.setAttribute("aria-hidden", "true");
    updateBodyScrollLock();
  }

  function openSummaryModal() {
    els.summaryModal.classList.add("open");
    els.summaryModal.setAttribute("aria-hidden", "false");
    updateBodyScrollLock();
  }

  function closeSummaryModal() {
    els.summaryModal.classList.remove("open");
    els.summaryModal.setAttribute("aria-hidden", "true");
    updateBodyScrollLock();
  }

  async function copyText(text, successMessage, emptyMessage) {
    if (!text || !text.trim()) {
      showToast(emptyMessage);
      return false;
    }

    try {
      await navigator.clipboard.writeText(text.trim());
      showToast(successMessage);
      return true;
    } catch {
      showToast("Could not copy");
      return false;
    }
  }

  return {
    els,
    escapeHtml,
    clamp,
    mapRange,
    normalizeWord,
    tokenizeText,
    computeSpokenProgress,
    formatDuration,
    showToast,
    setRecordingState,
    renderSelection,
    updateMetricCards,
    showSessionAverages,
    renderTranscript,
    renderIntentHighlight,
    updateSpeakAlong,
    drawPitchGraph,
    renderPrompt,
    renderReport,
    renderSummaryContent,
    renderSessionSummary,
    renderAudio,
    renderWordStats,
    renderHistory,
    renderLibrary,
    openLibrary,
    closeLibrary,
    openPromptModal,
    closePromptModal,
    openSummaryModal,
    closeSummaryModal,
    copyText
  };
})();
