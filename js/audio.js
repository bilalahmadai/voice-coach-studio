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
    const yin = yinPitch(buffer, sampleRate);
    if (yin && yin >= 50 && yin <= 380) return yin;
    const ac = autoCorrelate(buffer, sampleRate);
    if (ac && ac >= 50 && ac <= 380) return ac;
    return null;
  }

  function yinPitch(buffer, sampleRate) {
    const threshold = 0.13;
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

  function autoCorrelate(buffer, sampleRate) {
    const size = buffer.length;
    const rms = getRms(buffer);
    if (rms < 0.006) return null;

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

    if (bestCorrelation < 0.008 || bestOffset <= 0) return null;
    return sampleRate / bestOffset;
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

  return { CONSTANTS, getRms, detectPitch, getSpectralCentroid };
})();
