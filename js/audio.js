window.VCAudio = (() => {
  const CONSTANTS = {
    pitchMin: 60,
    pitchMax: 300,
    volumeMin: -70,
    volumeMax: -5,
    brightnessMin: 300,
    brightnessMax: 4200,
    speechThresholdDb: -54
  };

  function getRms(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    return Math.sqrt(sum / buffer.length);
  }

  function detectPitch(buffer, sampleRate, db) {
    if (db < CONSTANTS.speechThresholdDb) return null;
    return detectPitchFromBuffer(buffer, sampleRate);
  }

  function detectPitchLenient(buffer, sampleRate, db) {
    if (db < CONSTANTS.speechThresholdDb - 6) return null;
    return detectPitchFromBuffer(buffer, sampleRate, { lenient: true });
  }

  function detectPitchBest(buffer, freqData, sampleRate, fftSize, db) {
    if (db < CONSTANTS.speechThresholdDb - 10) return null;

    const candidates = [];

    if (db >= CONSTANTS.speechThresholdDb) {
      const standard = detectPitchFromBuffer(buffer, sampleRate);
      if (standard) candidates.push(standard);
    }

    const lenient = detectPitchFromBuffer(buffer, sampleRate, { lenient: true });
    if (lenient) candidates.push(lenient);

    const ultra = detectPitchFromBuffer(buffer, sampleRate, { ultra: true });
    if (ultra) candidates.push(ultra);

    if (freqData && fftSize) {
      const harmonic = detectPitchHarmonic(freqData, sampleRate, fftSize);
      if (harmonic) candidates.push(harmonic);
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => a - b);
    return candidates[Math.floor(candidates.length / 2)];
  }

  function detectPitchFromBuffer(buffer, sampleRate, { lenient = false, ultra = false } = {}) {
    const yinThreshold = ultra ? 0.34 : (lenient ? 0.24 : 0.13);
    const minCorrelation = ultra ? 0.002 : (lenient ? 0.004 : 0.008);
    const minRms = ultra ? 0.002 : (lenient ? 0.003 : 0.006);

    const yin = yinPitch(buffer, sampleRate, yinThreshold);
    if (yin && yin >= 50 && yin <= 380) return yin;

    const ac = autoCorrelate(buffer, sampleRate, minCorrelation, minRms);
    if (ac && ac >= 50 && ac <= 380) return ac;

    return null;
  }

  function detectPitchHarmonic(freqData, sampleRate, fftSize) {
    const binHz = sampleRate / fftSize;
    const minF = 72;
    const maxF = 360;
    let bestF = null;
    let bestScore = 0;

    for (let f = minF; f <= maxF; f += 1) {
      const b1 = Math.round(f / binHz);
      const b2 = Math.round((2 * f) / binHz);
      const b3 = Math.round((3 * f) / binHz);
      if (b1 < 1 || b3 >= freqData.length) continue;

      const score = (freqData[b1] || 0) + 0.55 * (freqData[b2] || 0) + 0.3 * (freqData[b3] || 0);
      if (score > bestScore) {
        bestScore = score;
        bestF = f;
      }
    }

    if (bestScore < 14) return null;
    return bestF;
  }

  function yinPitch(buffer, sampleRate, threshold = 0.13) {
    const minFreq = 50;
    const maxFreq = 380;
    const minTau = Math.floor(sampleRate / maxFreq);
    const maxTau = Math.floor(sampleRate / minFreq);
    const yin = new Float32Array(maxTau + 1);

    for (let tau = minTau; tau <= maxTau; tau++) {
      let sum = 0;
      for (let i = 0; i < buffer.length - tau; i++) {
        const d = buffer[i] - buffer[i + tau];
        sum += d * d;
      }
      yin[tau] = sum;
    }

    let runningSum = 0;
    for (let tau = minTau; tau <= maxTau; tau++) {
      runningSum += yin[tau];
      yin[tau] = yin[tau] * tau / (runningSum || 1);
    }

    let tauEstimate = -1;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (yin[tau] < threshold) {
        while (tau + 1 <= maxTau && yin[tau + 1] < yin[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return null;
    return sampleRate / tauEstimate;
  }

  function autoCorrelate(buffer, sampleRate, minCorrelation = 0.008, minRms = 0.006) {
    const size = buffer.length;
    const rms = getRms(buffer);
    if (rms < minRms) return null;

    let bestOffset = -1;
    let bestCorrelation = 0;
    const minOffset = Math.floor(sampleRate / 380);
    const maxOffset = Math.floor(sampleRate / 50);

    for (let offset = minOffset; offset <= maxOffset; offset++) {
      let correlation = 0;
      for (let i = 0; i < size - offset; i++) {
        correlation += buffer[i] * buffer[i + offset];
      }
      correlation = correlation / (size - offset);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }

    if (bestCorrelation < minCorrelation || bestOffset <= 0) return null;
    return sampleRate / bestOffset;
  }

  function analyzePitchSeries(channelData, sampleRate) {
    const windowSize = 4096;
    const hop = 2048;
    const pitches = [];

    for (let start = 0; start + windowSize <= channelData.length; start += hop) {
      const slice = channelData.subarray(start, start + windowSize);
      const rms = getRms(slice);
      const db = rms > 0 ? 20 * Math.log10(rms) : CONSTANTS.volumeMin;
      if (db < CONSTANTS.speechThresholdDb - 8) continue;

      const pitch = detectPitchBest(slice, null, sampleRate, windowSize, db);
      if (pitch) pitches.push(pitch);
    }

    return pitches;
  }

  async function analyzePitchFromBlob(chunks) {
    if (!chunks?.length) return [];

    try {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      const pitches = analyzePitchSeries(audioBuffer.getChannelData(0), audioBuffer.sampleRate);
      if (ctx.state !== "closed") await ctx.close();
      return pitches;
    } catch (error) {
      console.warn("Offline pitch analysis failed:", error);
      return [];
    }
  }

  function getSpectralCentroid(freqData, sampleRate, fftSize) {
    let weighted = 0;
    let total = 0;
    const binHz = sampleRate / fftSize;

    for (let i = 1; i < freqData.length; i++) {
      const magnitude = freqData[i];
      const freq = i * binHz;
      weighted += freq * magnitude;
      total += magnitude;
    }

    return total <= 0 ? null : weighted / total;
  }

  return {
    CONSTANTS,
    getRms,
    detectPitch,
    detectPitchLenient,
    detectPitchBest,
    analyzePitchFromBlob,
    getSpectralCentroid
  };
})();
