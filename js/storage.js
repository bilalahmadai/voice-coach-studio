window.VCStorage = (() => {
  const KEYS = {
    sessions: "voiceCoachFinal_sessions",
    words: "voiceCoachFinal_words",
    report: "voiceCoachFinal_lastReport",
    selectedAgent: "voiceCoachFinal_selectedAgent",
    selectedTemplate: "voiceCoachFinal_selectedTemplate",
    practiceProgress: "voiceCoachFinal_practiceProgress"
  };

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Unable to save to localStorage:", error);
    }
  }

  function loadState() {
    return {
      sessions: loadJson(KEYS.sessions, []),
      words: loadJson(KEYS.words, []),
      report: localStorage.getItem(KEYS.report) || "",
      selectedAgent: localStorage.getItem(KEYS.selectedAgent) || "masculine",
      selectedTemplate: localStorage.getItem(KEYS.selectedTemplate) || "mh1"
    };
  }

  function saveState(state) {
    saveJson(KEYS.sessions, state.sessions || []);
    saveJson(KEYS.words, state.words || []);
    localStorage.setItem(KEYS.report, state.report || "");
    localStorage.setItem(KEYS.selectedAgent, state.selectedAgent || "masculine");
    localStorage.setItem(KEYS.selectedTemplate, state.selectedTemplate || "mh1");
  }

  function clearAll() {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  }

  function loadPracticeProgress() {
    return loadJson(KEYS.practiceProgress, {});
  }

  function savePracticeProgress(progress) {
    saveJson(KEYS.practiceProgress, progress || {});
  }

  return { loadState, saveState, clearAll, loadPracticeProgress, savePracticeProgress };
})();
