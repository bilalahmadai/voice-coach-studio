window.VCLiveChart = (() => {
  const METRICS = {
    pitch: {
      label: "Pitch",
      suffix: " Hz",
      decimals: 0,
      color: "#60a5fa",
      headColor: "#93c5fd"
    },
    volume: {
      label: "Volume",
      suffix: " dB",
      decimals: 0,
      color: "#a78bfa",
      headColor: "#c4b5fd"
    },
    steadiness: {
      label: "Steadiness",
      suffix: " /100",
      decimals: 0,
      color: "#36d399",
      headColor: "#6ee7b7"
    },
    brightness: {
      label: "Warmth",
      suffix: " Hz",
      decimals: 0,
      color: "#fbbf24",
      headColor: "#fde68a"
    }
  };

  const MAX_POINTS = 420;
  const VOLUME_SMOOTH = 0.18;

  let chart = null;
  let selectedMetric = "pitch";
  let sessionStartWallMs = null;
  let smoothedDb = null;
  let lastAgent = null;
  let lastPoints = [];
  let isFullscreen = false;

  const home = {
    intent: null,
    controls: null,
    head: null,
    chart: null
  };

  function formatLocalTimeMs(timestamp) {
    if (!Number.isFinite(timestamp)) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }

  function init() {
    const container = document.getElementById("liveChartContainer");
    if (!container || typeof Highcharts === "undefined") return;

    Highcharts.setOptions({
      time: { useUTC: false },
      global: { useUTC: false }
    });

    cacheHomeParents();
    bindMetricTabs();
    bindFullscreen();

    chart = Highcharts.chart("liveChartContainer", {
      chart: {
        type: "spline",
        height: 380,
        backgroundColor: "transparent",
        animation: false,
        marginTop: 30,
        marginRight: 24,
        spacingTop: 14,
        scrollablePlotArea: {
          minWidth: 720,
          scrollPositionX: 1
        },
        style: { fontFamily: "Inter, system-ui, sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      legend: { enabled: false },
      time: { useUTC: false },
      xAxis: {
        type: "datetime",
        title: { text: "Local time", style: { color: "#aab7d4", fontSize: "11px" } },
        tickPixelInterval: 80,
        dateTimeLabelFormats: {
          millisecond: "%H:%M:%S",
          second: "%H:%M:%S",
          minute: "%H:%M:%S",
          hour: "%H:%M:%S",
          day: "%H:%M:%S",
          week: "%H:%M:%S",
          month: "%H:%M:%S",
          year: "%H:%M:%S"
        },
        labels: {
          style: { color: "#aab7d4", fontSize: "11px" },
          formatter: function formatAxisLocalTime() {
            return formatLocalTimeMs(this.value);
          }
        },
        lineColor: "rgba(255,255,255,0.12)",
        tickColor: "rgba(255,255,255,0.12)",
        gridLineColor: "rgba(255,255,255,0.06)"
      },
      yAxis: buildYAxis("pitch", null),
      tooltip: {
        shared: true,
        backgroundColor: "rgba(15,23,42,0.96)",
        borderColor: "rgba(255,255,255,0.12)",
        style: { color: "#eef4ff" },
        formatter: function formatLiveTooltip() {
          const meta = METRICS[selectedMetric];
          const suffix = meta?.suffix || "";
          const lines = [`<b>${formatLocalTimeMs(this.x)}</b>`];
          this.points?.forEach((point) => {
            if (point.series.name === "Now") return;
            const value = Number.isFinite(point.y) ? Math.round(point.y) : "--";
            lines.push(`<span style="color:${point.color}">●</span> ${meta?.label || point.series.name}: <b>${value}${suffix}</b>`);
          });
          return lines.join("<br/>");
        }
      },
      plotOptions: {
        spline: {
          lineWidth: 3,
          states: { hover: { lineWidth: 3 } },
          marker: { enabled: false },
          connectNulls: false
        },
        scatter: {
          marker: { enabled: true, radius: 6, lineWidth: 2, lineColor: "#071020" },
          dataLabels: {
            enabled: true,
            align: "left",
            verticalAlign: "middle",
            x: 10,
            y: 0,
            overflow: "allow",
            crop: false,
            style: { color: "#eef4ff", fontWeight: "700", fontSize: "12px", textOutline: "none" }
          }
        }
      },
      series: [
        { id: "live-line", name: "Live", data: [], color: METRICS.pitch.color },
        { id: "live-head", type: "scatter", name: "Now", data: [], color: METRICS.pitch.headColor, enableMouseTracking: false }
      ]
    });

    setIdleState();
  }

  function cacheHomeParents() {
    home.intent = document.getElementById("liveIntentPanel")?.parentElement;
    home.controls = document.getElementById("liveChartControlsRow")?.parentElement;
    home.head = document.getElementById("liveChartHeadRow")?.parentElement;
    home.chart = document.getElementById("liveChartContainer")?.parentElement;
  }

  function bindFullscreen() {
    document.getElementById("toggleChartFullscreenBtn")?.addEventListener("click", () => {
      if (isFullscreen) closeFullscreen();
      else openFullscreen();
    });
    document.getElementById("exitChartFullscreenBtn")?.addEventListener("click", closeFullscreen);
    document.getElementById("liveChartFullscreen")?.addEventListener("click", (event) => {
      if (event.target.id === "liveChartFullscreen") closeFullscreen();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isFullscreen) closeFullscreen();
    });
    window.addEventListener("resize", () => {
      if (isFullscreen) resizeChartForLayout();
    });
  }

  function moveToFullscreen() {
    const intent = document.getElementById("liveIntentPanel");
    const controls = document.getElementById("liveChartControlsRow");
    const head = document.getElementById("liveChartHeadRow");
    const chartEl = document.getElementById("liveChartContainer");

    document.getElementById("liveChartFsIntentSlot")?.appendChild(intent);
    document.getElementById("liveChartFsControlsSlot")?.appendChild(controls);
    document.getElementById("liveChartFsHeadSlot")?.appendChild(head);
    document.getElementById("liveChartFsChartSlot")?.appendChild(chartEl);

    const title = document.getElementById("selectedTemplateTitle");
    const fsTitle = document.getElementById("liveChartFsTitle");
    if (title && fsTitle) fsTitle.textContent = title.textContent;
  }

  function moveToHome() {
    const intent = document.getElementById("liveIntentPanel");
    const controls = document.getElementById("liveChartControlsRow");
    const head = document.getElementById("liveChartHeadRow");
    const chartEl = document.getElementById("liveChartContainer");
    const section = document.querySelector(".live-chart-section");

    if (intent && home.intent) {
      home.intent.insertBefore(intent, home.intent.firstElementChild);
    }
    if (controls && home.controls) {
      home.controls.appendChild(controls);
    }
    if (chartEl && section) {
      section.appendChild(chartEl);
    }
    if (head && chartEl && section) {
      section.insertBefore(head, chartEl);
    }
  }

  function openFullscreen() {
    if (isFullscreen || !chart) return;
    isFullscreen = true;

    const overlay = document.getElementById("liveChartFullscreen");
    overlay?.classList.add("open");
    overlay?.setAttribute("aria-hidden", "false");
    document.body.classList.add("live-chart-fullscreen-open");

    moveToFullscreen();

    const btn = document.getElementById("toggleChartFullscreenBtn");
    if (btn) btn.innerHTML = `<i class="fa-solid fa-compress"></i> Exit`;

    requestAnimationFrame(() => {
      resizeChartForLayout();
    });
  }

  function closeFullscreen() {
    if (!isFullscreen) return;
    isFullscreen = false;

    const overlay = document.getElementById("liveChartFullscreen");
    overlay?.classList.remove("open");
    overlay?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("live-chart-fullscreen-open");

    moveToHome();

    const btn = document.getElementById("toggleChartFullscreenBtn");
    if (btn) btn.innerHTML = `<i class="fa-solid fa-expand"></i> Fullscreen`;

    requestAnimationFrame(() => {
      resizeChartForLayout();
    });
  }

  function resizeChartForLayout() {
    if (!chart) return;

    let height = 380;
    if (isFullscreen) {
      const slot = document.getElementById("liveChartFsChartSlot");
      height = Math.max(300, (slot?.clientHeight || window.innerHeight * 0.5) - 4);
    }

    chart.setSize(null, height);
    chart.reflow();
  }

  function bindMetricTabs() {
    document.querySelectorAll("[data-live-metric]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedMetric = button.dataset.liveMetric;
        document.querySelectorAll("[data-live-metric]").forEach((el) => {
          el.classList.toggle("active", el.dataset.liveMetric === selectedMetric);
          el.setAttribute("aria-selected", el.dataset.liveMetric === selectedMetric ? "true" : "false");
        });
        rebuildFromHistory(lastAgent);
        updateHeadDisplay(null);
      });
    });
  }

  function buildYAxis(metric, agent, values = []) {
    const meta = METRICS[metric];
    const clean = values.filter(Number.isFinite);
    const axis = {
      title: { text: meta.label + meta.suffix.trim(), style: { color: "#aab7d4", fontSize: "12px" } },
      labels: { style: { color: "#aab7d4", fontSize: "11px" } },
      gridLineColor: "rgba(255,255,255,0.08)",
      minorGridLineWidth: 0,
      plotBands: [],
      startOnTick: false,
      endOnTick: false
    };

    if (metric === "pitch") {
      const dataMin = clean.length ? Math.min(...clean) : null;
      const dataMax = clean.length ? Math.max(...clean) : null;
      axis.min = Math.max(40, Math.floor((Math.min(60, dataMin ?? 60) - 20) / 20) * 20);
      axis.max = Math.max(
        320,
        Math.ceil(((Math.max(300, dataMax ?? 300) + 35) / 20)) * 20
      );
      if (agent) {
        axis.min = Math.min(axis.min, Math.floor((agent.pitch[0] - 25) / 20) * 20);
        axis.max = Math.max(axis.max, Math.ceil((agent.pitch[1] + 50) / 20) * 20);
      }
      axis.tickInterval = 20;
      if (agent) {
        axis.plotBands.push(targetBand(agent.pitch[0], agent.pitch[1], "Target pitch"));
      }
    } else if (metric === "volume") {
      const dataMin = clean.length ? Math.min(...clean) : null;
      const dataMax = clean.length ? Math.max(...clean) : null;
      axis.min = Math.min(-70, Math.floor((dataMin ?? -70) / 10) * 10 - 10);
      axis.max = Math.max(-10, Math.ceil((dataMax ?? -10) / 10) * 10 + 10);
      if (agent) {
        axis.min = Math.min(axis.min, agent.volume[0] - 8);
        axis.max = Math.max(axis.max, agent.volume[1] + 8);
      }
      axis.tickInterval = 10;
      if (agent) {
        axis.plotBands.push(targetBand(agent.volume[0], agent.volume[1], "Target volume"));
      }
    } else if (metric === "steadiness") {
      axis.min = 0;
      axis.max = 100;
      axis.tickInterval = 20;
      axis.plotBands.push(targetBand(60, 100, "Smooth zone"));
    } else if (metric === "brightness") {
      const dataMin = clean.length ? Math.min(...clean) : null;
      const dataMax = clean.length ? Math.max(...clean) : null;
      axis.min = Math.max(200, Math.floor((Math.min(300, dataMin ?? 300) - 200) / 200) * 200);
      axis.max = Math.max(
        3200,
        Math.ceil((Math.max(2400, dataMax ?? 2400) + 400) / 200) * 200
      );
      axis.tickInterval = 400;
      if (agent) {
        axis.plotBands.push(targetBand(agent.brightness[0], agent.brightness[1], "Target warmth"));
      }
    }

    return axis;
  }

  function currentLineValues() {
    if (!chart) return [];
    return chart.series[0].points.map((point) => point.y).filter(Number.isFinite);
  }

  function fitYAxis() {
    if (!chart) return;
    chart.yAxis[0].update(buildYAxis(selectedMetric, lastAgent, currentLineValues()), false);
  }

  function targetBand(from, to, label) {
    return {
      from,
      to,
      color: "rgba(54, 211, 153, 0.14)",
      borderColor: "rgba(54, 211, 153, 0.35)",
      borderWidth: 1,
      label: {
        text: label,
        style: { color: "rgba(54,211,153,0.85)", fontSize: "10px", fontWeight: "600" }
      }
    };
  }

  function metricValue(metric, sample) {
    if (!sample?.speaking) return null;

    if (metric === "pitch") return Number.isFinite(sample.pitch) ? sample.pitch : null;
    if (metric === "volume") {
      if (!Number.isFinite(sample.db)) return null;
      smoothedDb = smoothedDb === null
        ? sample.db
        : smoothedDb + VOLUME_SMOOTH * (sample.db - smoothedDb);
      return smoothedDb;
    }
    if (metric === "steadiness") return Number.isFinite(sample.stability) ? sample.stability : null;
    if (metric === "brightness") return Number.isFinite(sample.brightness) ? sample.brightness : null;
    return null;
  }

  function formatValue(metric, value) {
    if (!Number.isFinite(value)) return "--";
    const meta = METRICS[metric];
    return meta.decimals ? value.toFixed(meta.decimals) : Math.round(value).toString();
  }

  function updateTargetLabel(agent) {
    const el = document.getElementById("liveChartTargetLabel");
    if (!el || !agent) return;

    if (selectedMetric === "pitch") el.textContent = `Target ${agent.pitch[0]}–${agent.pitch[1]} Hz`;
    else if (selectedMetric === "volume") el.textContent = `Target ${agent.volume[0]} to ${agent.volume[1]} dB · smoothed`;
    else if (selectedMetric === "steadiness") el.textContent = "Higher = smoother pitch control";
    else if (selectedMetric === "brightness") el.textContent = `Target ${agent.brightness[0]}–${agent.brightness[1]} Hz`;
  }

  function updateHeadDisplay(value) {
    const el = document.getElementById("liveChartCurrentValue");
    if (!el) return;
    const meta = METRICS[selectedMetric];
    el.textContent = Number.isFinite(value) ? `${formatValue(selectedMetric, value)}${meta.suffix}` : `--${meta.suffix}`;
    el.style.color = meta.headColor;
  }

  function setIdleState() {
    updateHeadDisplay(null);
    const subtitle = document.getElementById("liveChartSubtitle");
    if (subtitle) subtitle.textContent = "Start recording to build a live line.";
  }

  function setRecordingState() {
    const subtitle = document.getElementById("liveChartSubtitle");
    if (subtitle) subtitle.textContent = "Line grows left to right · green band = target zone";
  }

  function pointX(elapsed) {
    if (!sessionStartWallMs) return Date.now();
    return sessionStartWallMs + elapsed * 1000;
  }

  function reset({ agent, sessionStartWallMs: wallMs } = {}) {
    sessionStartWallMs = wallMs || null;
    smoothedDb = null;
    lastPoints = [];
    lastAgent = agent || lastAgent;
    if (!chart) return;

    chart.series[0].setData([], false);
    chart.series[1].setData([], false);
    chart.yAxis[0].update(buildYAxis(selectedMetric, lastAgent, []), false);
    updateTargetLabel(lastAgent);
    updateHeadDisplay(null);
    chart.redraw(false);
  }

  function rebuildFromHistory(agent) {
    if (!chart) return;
    lastAgent = agent || lastAgent;
    smoothedDb = null;

    const lineData = lastPoints
      .map((point) => {
        const y = metricValue(selectedMetric, point.sample);
        return Number.isFinite(y) ? [point.x, y] : null;
      })
      .filter(Boolean);

    chart.yAxis[0].update(buildYAxis(selectedMetric, lastAgent, lineData.map((point) => point[1])), false);
    chart.series[0].update({ color: METRICS[selectedMetric].color, name: METRICS[selectedMetric].label }, false);
    chart.series[1].update({ color: METRICS[selectedMetric].headColor }, false);
    chart.series[0].setData(lineData, false);

    const last = lineData[lineData.length - 1];
    if (last) {
      chart.series[1].setData([{
        x: last[0],
        y: last[1],
        dataLabels: { format: `${formatValue(selectedMetric, last[1])}${METRICS[selectedMetric].suffix}` }
      }], false);
      updateHeadDisplay(last[1]);
    } else {
      chart.series[1].setData([], false);
      updateHeadDisplay(null);
    }

    updateTargetLabel(lastAgent);
    chart.redraw(false);
  }

  function pushPoint({ sample, agent, elapsed, sessionStartWallMs: wallMs }) {
    if (!chart) return;

    if (wallMs && !sessionStartWallMs) {
      sessionStartWallMs = wallMs;
      setRecordingState();
    }

    lastAgent = agent;
    const x = pointX(elapsed);
    lastPoints.push({ x, sample });
    if (lastPoints.length > MAX_POINTS) lastPoints.shift();

    const y = metricValue(selectedMetric, sample);
    updateTargetLabel(agent);

    if (!Number.isFinite(y)) {
      updateHeadDisplay(null);
      return;
    }

    const line = chart.series[0];
    line.addPoint([x, y], false, line.data.length >= MAX_POINTS);

    chart.series[1].setData([{
      x,
      y,
      dataLabels: { format: `${formatValue(selectedMetric, y)}${METRICS[selectedMetric].suffix}` }
    }], false);

    updateHeadDisplay(y);
    fitYAxis();
    chart.redraw(false);
  }

  function refreshAgent(agent) {
    lastAgent = agent;
    if (!chart) return;
    chart.yAxis[0].update(buildYAxis(selectedMetric, agent, currentLineValues()), false);
    updateTargetLabel(agent);
    chart.redraw(false);
  }

  return { init, reset, pushPoint, refreshAgent, rebuildFromHistory, setIdleState, openFullscreen, closeFullscreen };
})();
