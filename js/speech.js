window.VCSpeech = (() => {
  let recognition = null;
  let wanted = false;

  function isSupported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function start({ onFinal, onInterim, onError }) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError && onError("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      return false;
    }

    wanted = true;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.trim();
        if (!text) continue;
        if (event.results[i].isFinal) {
          onFinal && onFinal(text, "browser-final");
        }
      }

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) continue;
        const text = event.results[i][0].transcript.trim();
        if (text) interim += (interim ? " " : "") + text;
      }

      onInterim && onInterim(interim.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") wanted = false;
      onError && onError(event.error || "Speech recognition error");
    };

    recognition.onend = () => {
      if (wanted) {
        setTimeout(() => {
          try { recognition.start(); } catch {}
        }, 300);
      }
    };

    try {
      recognition.start();
      return true;
    } catch (error) {
      onError && onError(error.message || String(error));
      return false;
    }
  }

  function stop() {
    wanted = false;
    if (recognition) {
      try { recognition.stop(); } catch {}
    }
    recognition = null;
  }

  return { isSupported, start, stop };
})();
