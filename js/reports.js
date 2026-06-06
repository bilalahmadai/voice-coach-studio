window.VCReports = (() => {
  function round(value) {
    return Number.isFinite(value) ? Math.round(value) : "--";
  }

  function avg(values) {
    const clean = values.filter(Number.isFinite);
    if (!clean.length) return null;
    return clean.reduce((a, b) => a + b, 0) / clean.length;
  }

  function pct(count, total) {
    return total ? Math.round((count / total) * 100) : 0;
  }

  function normalizeWord(word) {
    return String(word || "").toLowerCase().replace(/^'+|'+$/g, "");
  }

  function extractWords(text) {
    return (String(text || "").match(/[\p{L}\p{N}']+/gu) || []).map((word) => word.trim()).filter(Boolean);
  }

  function getWordStats(words) {
    const map = {};
    words.forEach((entry) => {
      const key = normalizeWord(entry.word);
      if (!key) return;
      if (!map[key]) map[key] = { word: key, count: 0, pitches: [], dbs: [] };
      map[key].count += 1;
      if (Number.isFinite(entry.pitch)) map[key].pitches.push(entry.pitch);
      if (Number.isFinite(entry.db)) map[key].dbs.push(entry.db);
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        avgPitch: avg(item.pitches),
        avgDb: avg(item.dbs)
      }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
  }

  function summarizeWords(words) {
    const softest = words.filter((w) => Number.isFinite(w.db)).sort((a, b) => a.db - b.db).slice(0, 8);
    const loudest = words.filter((w) => Number.isFinite(w.db)).sort((a, b) => b.db - a.db).slice(0, 8);
    const highestPitch = words.filter((w) => Number.isFinite(w.pitch)).sort((a, b) => b.pitch - a.pitch).slice(0, 8);
    const lowestPitch = words.filter((w) => Number.isFinite(w.pitch)).sort((a, b) => a.pitch - b.pitch).slice(0, 8);

    const formatWords = (items, metric) => {
      if (!items.length) return "No data captured.";
      return items.map((item) => `${item.word} (${round(item[metric])}${metric === "pitch" ? " Hz" : " dB"})`).join(", ");
    };

    return {
      softest: formatWords(softest, "db"),
      loudest: formatWords(loudest, "db"),
      highestPitch: formatWords(highestPitch, "pitch"),
      lowestPitch: formatWords(lowestPitch, "pitch")
    };
  }

  function calculateSessionScore({ avgPitch, avgDb, avgBrightness, avgStability, pitchStd, agent }) {
    const parts = [];

    if (Number.isFinite(avgPitch)) {
      parts.push(avgPitch >= agent.pitch[0] && avgPitch <= agent.pitch[1] ? 95 : 65);
    }
    if (Number.isFinite(avgDb)) {
      parts.push(avgDb >= agent.volume[0] && avgDb <= agent.volume[1] ? 95 : avgDb < agent.volume[0] ? 55 : 65);
    }
    if (Number.isFinite(avgStability)) parts.push(avgStability);
    if (Number.isFinite(avgBrightness)) {
      parts.push(avgBrightness >= agent.brightness[0] && avgBrightness <= agent.brightness[1] ? 90 : 70);
    }
    if (Number.isFinite(pitchStd)) {
      parts.push(pitchStd >= agent.variation[0] && pitchStd <= agent.variation[1] ? 90 : 68);
    }

    return parts.length ? Math.round(avg(parts)) : null;
  }

  function generateReport({ session, words, agent, template }) {
    const stats = getWordStats(words);
    const wordSummary = summarizeWords(words);

    const topWords = stats.slice(0, 10)
      .map((item) => `${item.word} (${item.count}x, ${round(item.avgPitch)} Hz, ${round(item.avgDb)} dB)`)
      .join(", ") || "No word stats captured.";

    const nextPitchTarget = agent.id === "masculine" ? "130–145 Hz without forcing" : `${agent.pitch[0]}–${agent.pitch[1]} Hz`;

    return `# Voice Movement Report

Analyze this voice recording as a professional voice coach.

## Coaching Goal

My goal is to sound:

* Natural
* Clear
* Confident
* Steady
* Warm
* Masculine/present

Important rules:

* Be honest and practical.
* Do not sugarcoat.
* Do not explain every metric.
* Focus only on the biggest issues in THIS recording.
* Ignore minor problems.
* Do not give long technical explanations.
* Do not repeat raw numbers unless they matter.
* Give clear next steps for the next recording.

## 1. App Context

App: Voice Coach Studio Final

The app uses browser microphone analysis, live transcript, word-level estimated pitch/Hz, loudness/dB, steadiness, brightness/warmth, and a selected coach agent/template.

Word-level Hz is approximate. Look for patterns, not one-word perfection.

Browser transcript may mishear words. Compare transcript with intended text before judging clarity.

## 2. Coach Agent Page

Agent: ${agent.name}
Agent focus: ${agent.focus.join(", ")}
Agent cue: ${agent.cue}
Avoid: ${agent.avoid}

Template: ${template.title}
Difficulty: ${window.VCData.labelDifficulty(template.difficulty)}
Template goal: ${template.goal}

Target pitch: ${agent.pitch[0]}–${agent.pitch[1]} Hz
Target volume: ${agent.volume[0]} to ${agent.volume[1]} dB
Target pitch variation: ${agent.variation[0]}–${agent.variation[1]} Hz
Target warmth/brightness: ${agent.brightness[0]}–${agent.brightness[1]} Hz

## 3. Session Numbers

Started: ${new Date(session.startedAt).toLocaleString()}
Duration: ${session.durationSec} seconds
Words captured: ${session.wordCount}
Transcript source: ${session.transcriptSource}

Average pitch: ${round(session.avgPitch)} Hz
Average volume: ${round(session.avgDb)} dB
Average steadiness: ${round(session.avgStability)} / 100
Average warmth/brightness: ${round(session.avgBrightness)} Hz
Pitch movement/std dev: ${round(session.pitchStd)} Hz
Voice score: ${session.score ?? "--"}

Pitch in target: ${session.pitchInTargetPct}%
Volume in target: ${session.volumeInTargetPct}%
Too soft: ${session.tooSoftPct}%
Too loud: ${session.tooLoudPct}%

## 4. Word-Level Patterns

Most repeated words:
${topWords}

Softest words:
${wordSummary.softest}

Loudest words:
${wordSummary.loudest}

Highest-pitch words:
${wordSummary.highestPitch}

Lowest-pitch words:
${wordSummary.lowestPitch}

## 5. Intended Practice Text

${session.practiceText || "No intended text saved."}

## 6. Transcript

Transcript source: ${session.transcriptSource}

${session.transcript || "No transcript captured."}

## 7. Response Format

Return ONLY the following sections:

### Overall

Write 2-3 sentences describing how the voice currently sounds.

### What's Working

List up to 3 strengths.

### Biggest Problems

List up to 3 issues hurting the voice the most.

### Next Recording Focus

Rank exactly 3 actions:

1. Most important
2. Second most important
3. Third most important

### What To Ignore

List things the speaker should stop worrying about right now.

### Next Recording Target

Pitch: [Too High / Good / Too Low]

Volume: [Too Soft / Good / Too Loud]

Pace: [Slower / Same / Faster]

Focus: [Single most important focus]

Avoid: [Single biggest mistake]

### One Sentence Reminder

Give one short sentence the speaker should remember before pressing Record.

Keep the entire response under 250 words.
`;

  }

  return {
    avg,
    pct,
    round,
    normalizeWord,
    extractWords,
    getWordStats,
    summarizeWords,
    calculateSessionScore,
    generateReport
  };
})();
