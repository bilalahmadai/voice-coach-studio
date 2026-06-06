window.VCData = (() => {
  const agents = [
    {
      id: "clarity",
      name: "Clear Words Agent",
      description: "Fix mumbling, dropped small words, and unclear endings.",
      focus: ["Articulation", "final consonants", "small words", "consistent volume"],
      pitch: [95, 165],
      volume: [-38, -32],
      variation: [8, 32],
      brightness: [700, 2400],
      cue: "Open your mouth slightly more and finish every word clearly.",
      avoid: "Do not rush small words like I, to, my, the, and."
    },
    {
      id: "masculine",
      name: "Calm Masculine Agent",
      description: "Train lower, steadier, warmer presence without forcing the throat.",
      focus: ["lower relaxed pitch", "warmth", "sentence endings", "slower pace"],
      pitch: [130, 145],
      volume: [-38, -32],
      variation: [5, 22],
      brightness: [550, 1900],
      cue: "Pause first, relax shoulders, speak slower, and let endings land downward.",
      avoid: "Do not force your throat low or press the voice."
    },
    {
      id: "volume",
      name: "Breath & Volume Agent",
      description: "Build stronger medium volume without shouting.",
      focus: ["breath support", "presence", "consistent dB", "smooth energy"],
      pitch: [95, 165],
      volume: [-36, -30],
      variation: [8, 30],
      brightness: [650, 2300],
      cue: "Use steady breath from the ribs/belly and speak through the full sentence.",
      avoid: "Do not fade out at the end of words or sentences."
    },
    {
      id: "emotion",
      name: "Emotion Control Agent",
      description: "Sound sincere, happy, or firm without losing control.",
      focus: ["controlled emotion", "intentional variation", "not shouting", "warm tone"],
      pitch: [95, 175],
      volume: [-40, -28],
      variation: [12, 48],
      brightness: [650, 2600],
      cue: "Let emotion show, but keep breath slow and words clear.",
      avoid: "Do not let emotion become throat tension."
    },
    {
      id: "realworld",
      name: "Real-World Speaking Agent",
      description: "Practice interviews, meetings, presentations, and normal conversation.",
      focus: ["natural delivery", "confidence", "pace", "clear structure"],
      pitch: [95, 165],
      volume: [-38, -32],
      variation: [8, 36],
      brightness: [650, 2400],
      cue: "Speak like you are explaining something important to one person.",
      avoid: "Do not sound robotic; keep natural movement."
    }
  ];

  const templates = [
    { id: "b1", difficulty: "basic", agent: "clarity", title: "Baseline Natural Voice", goal: "Get a clean baseline.", text: "Today I am recording my natural speaking voice. I want to speak clearly, calmly, and comfortably. I am not trying to sound perfect. I am only trying to understand how my voice sounds right now." },
    { id: "b2", difficulty: "basic", agent: "volume", title: "Medium Volume Control", goal: "Stop speaking too softly.", text: "I am speaking with medium volume. I am not shouting, and I am not mumbling. I am using enough breath so every word can be heard clearly from beginning to end." },
    { id: "b3", difficulty: "basic", agent: "clarity", title: "Small Words Clarity", goal: "Keep small words audible.", text: "I will not drop small words. I will say I, to, my, the, and, with enough clarity. Every small word matters because small words connect the full sentence." },
    { id: "b4", difficulty: "basic", agent: "masculine", title: "Relaxed Lower Voice", goal: "Lower without forcing.", text: "I am letting my voice settle into a comfortable lower range. I am not pushing my throat. I am speaking slowly, clearly, and calmly with relaxed confidence." },
    { id: "b5", difficulty: "basic", agent: "clarity", title: "Sentence Endings", goal: "Fix fading endings.", text: "I want my sentence endings to be clear and steady. I will not fade out at the end. I will finish each sentence with calm control and enough volume." },

    { id: "m1", difficulty: "mid", agent: "realworld", title: "Natural Explanation", goal: "Sound natural and structured.", text: "Let me explain this in a simple way. The main point is not complicated. If we stay focused, speak clearly, and take one step at a time, we can make the right decision." },
    { id: "m2", difficulty: "mid", agent: "masculine", title: "Calm Authority", goal: "Build grounded presence.", text: "I understand the situation. I am going to stay calm, look at the facts, and respond clearly. There is no need to rush. We can handle this properly." },
    { id: "m3", difficulty: "mid", agent: "volume", title: "Breath-Supported Paragraph", goal: "Use breath instead of throat pressure.", text: "Before I speak, I take a slow breath. Then I speak with steady airflow, clear words, and medium volume. My voice feels supported, not forced." },
    { id: "m4", difficulty: "mid", agent: "emotion", title: "Warm Sincere Tone", goal: "Show emotion without shaking.", text: "I want to say this honestly. I appreciate the effort, and I do not want it to go unnoticed. It matters to me, and I am glad we are talking about it." },
    { id: "m5", difficulty: "mid", agent: "clarity", title: "Clear Mouth Opening", goal: "Reduce mumbling.", text: "I am opening my mouth slightly more so my words do not sound trapped. I am speaking clearly, not lazily, and I am giving each word enough space." },

    { id: "mh1", difficulty: "mid-high", agent: "masculine", title: "Masculine Presence Drill", goal: "Lower, slower, steadier.", text: "I hear you. Let me think about that for a moment, and then I will give you a clear answer. I am calm, steady, and confident in how I speak." },
    { id: "mh2", difficulty: "mid-high", agent: "realworld", title: "Meeting Response", goal: "Professional confidence.", text: "That is a good question. From my perspective, the best next step is to simplify the problem, agree on the priority, and then move forward with a clear plan." },
    { id: "mh3", difficulty: "mid-high", agent: "emotion", title: "Controlled Frustration", goal: "Firm but controlled emotion.", text: "I am frustrated, but I want to handle this clearly and respectfully. This needs to improve, and I am willing to discuss the right solution." },
    { id: "mh4", difficulty: "mid-high", agent: "volume", title: "No Fade-Out Challenge", goal: "Keep volume consistent.", text: "I will keep the same clear energy until the end of this sentence. My last words are just as important as my first words, so I will not disappear at the end." },
    { id: "mh5", difficulty: "mid-high", agent: "clarity", title: "Difficult Word Clarity", goal: "Practice harder words.", text: "Natural, confident, comfortable, relaxed, clearly, pressure, aggressive, shoulders, slowly, and understood. I will say each word with clean pronunciation." },

    { id: "c1", difficulty: "challenging", agent: "realworld", title: "Interview Answer", goal: "Confident interview delivery.", text: "One strength I bring is the ability to stay calm and organized when things are unclear. I try to understand the real problem first, then communicate the solution in a simple and practical way." },
    { id: "c2", difficulty: "challenging", agent: "emotion", title: "Angry But Controlled", goal: "Firm voice without shouting.", text: "I need to be clear. This is not acceptable, and we need to fix it. I am not here to shout. I am here to speak directly and solve the problem." },
    { id: "c3", difficulty: "challenging", agent: "masculine", title: "Grounded Storytelling", goal: "Masculine storytelling.", text: "There was a time when I realized that confidence is not about speaking loudly or trying to impress people. It is about staying calm, choosing words carefully, and speaking with purpose." },
    { id: "c4", difficulty: "challenging", agent: "clarity", title: "Long Clarity Paragraph", goal: "Long-form clarity and stamina.", text: "Today I want to practice speaking in a voice that feels natural, confident, and relaxed, without forcing myself to sound different or pushing my throat too hard. I want my words to come out clearly, with enough volume to be understood." },
    { id: "c5", difficulty: "challenging", agent: "volume", title: "Presentation Opening", goal: "Presentation presence.", text: "Good morning everyone. Today I want to walk you through the main idea, explain why it matters, and show how we can take action in a clear and practical way." }
  ];

  function getAgent(id) {
    return agents.find((agent) => agent.id === id) || agents[1];
  }

  function getTemplate(id) {
    return templates.find((template) => template.id === id) || templates[10];
  }

  function labelDifficulty(value) {
    if (value === "mid-high") return "Mid-high";
    return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  }

  return { agents, templates, getAgent, getTemplate, labelDifficulty };
})();
