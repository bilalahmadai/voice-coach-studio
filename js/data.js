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

  const practiceLevels = [
    { id: 1, title: "Breath & Medium Volume", category: "loudness", icon: "fa-volume-high", summary: "Build breath-supported volume before anything else." },
    { id: 2, title: "Clear Words", category: "articulation", icon: "fa-spell-check", summary: "Keep small words and endings audible." },
    { id: 3, title: "Pitch Awareness", category: "pitch", icon: "fa-wave-square", summary: "Find a comfortable lower pitch without forcing." },
    { id: 4, title: "Steadiness", category: "steadiness", icon: "fa-grip-lines", summary: "Reduce shaky movement while staying natural." },
    { id: 5, title: "Sentence Endings", category: "ending", icon: "fa-arrow-down", summary: "Land endings clearly — no question rise or fade." },
    { id: 6, title: "Emotion Control", category: "emotion", icon: "fa-face-smile", summary: "Express emotion while staying clear and controlled." },
    { id: 7, title: "Real-World Speaking", category: "realworld", icon: "fa-briefcase", summary: "Transfer training into everyday situations." },
    { id: 8, title: "Calm Masculine Presence", category: "presence", icon: "fa-user-tie", summary: "Advanced grounded, warm, confident delivery." }
  ];

  const practiceDrills = [
    { id: "l1d1", level: 1, category: "loudness", name: "Quiet Baseline", difficulty: "beginner", goal: "Hear how soft you speak now.", instructions: "Read at your normal volume. Do not push yet — just notice.", text: "This is my normal speaking volume. I am listening to how soft or loud I sound right now.", pitch: [95, 175], volume: [-48, -42], variation: [8, 40], brightness: [600, 2600], durationSec: 25, visual: "volume", passScore: 60 },
    { id: "l1d2", level: 1, category: "loudness", name: "Medium Volume Hold", difficulty: "beginner", goal: "Stay in a medium volume zone.", instructions: "Use breath from ribs/belly. Keep volume steady through the whole line.", text: "I am speaking with medium volume. Every word gets the same clear energy from start to finish.", pitch: [95, 175], volume: [-42, -38], variation: [8, 35], brightness: [600, 2600], durationSec: 30, visual: "volume", passScore: 70 },
    { id: "l1d3", level: 1, category: "loudness", name: "Breath Before Speech", difficulty: "beginner", goal: "Support volume with breath, not throat.", instructions: "Take a slow breath, then speak the full sentence without fading.", text: "Before I speak, I take a slow breath. Then I speak with steady airflow and enough volume to be heard clearly.", pitch: [95, 175], volume: [-40, -36], variation: [8, 35], brightness: [600, 2600], durationSec: 30, visual: "volume", passScore: 72 },
    { id: "l1d4", level: 1, category: "loudness", name: "No Fade Challenge", difficulty: "intermediate", goal: "Keep last words as loud as first words.", instructions: "Do not let volume drop at the end. Finish strong but calm.", text: "My first word and my last word should have the same clear volume. I will not disappear at the end of this sentence.", pitch: [95, 175], volume: [-38, -34], variation: [8, 32], brightness: [600, 2600], durationSec: 35, visual: "volume", passScore: 75 },
    { id: "l1d5", level: 1, category: "loudness", name: "Presentation Volume", difficulty: "intermediate", goal: "Project without shouting.", instructions: "Imagine one person across the room. Speak with presence.", text: "Good morning. Today I will explain the main idea clearly, with enough volume that everyone can hear me comfortably.", pitch: [95, 175], volume: [-36, -32], variation: [8, 30], brightness: [600, 2600], durationSec: 35, visual: "volume", passScore: 78 },

    { id: "l2d1", level: 2, category: "articulation", name: "Small Words Drill", difficulty: "beginner", goal: "Keep I, to, my, the, and audible.", instructions: "Give small words full volume. Do not swallow them.", text: "I want to tell my friend that the plan is good, and I think we should go.", pitch: [95, 165], volume: [-40, -34], variation: [8, 32], brightness: [650, 2400], durationSec: 30, visual: "articulation", passScore: 70, trackWords: ["i", "to", "my", "the", "and"] },
    { id: "l2d2", level: 2, category: "articulation", name: "Final Consonants", difficulty: "beginner", goal: "Finish every word cleanly.", instructions: "Open mouth slightly. Hit final t, d, k sounds clearly.", text: "I want to speak clearly and confidently. Every word ends with a clean sound, not a mumble.", pitch: [95, 165], volume: [-40, -34], variation: [8, 32], brightness: [650, 2400], durationSec: 30, visual: "articulation", passScore: 72, trackWords: ["want", "speak", "clearly", "confidently", "word", "sound"] },
    { id: "l2d3", level: 2, category: "articulation", name: "Practice Word List", difficulty: "intermediate", goal: "Pronounce longer words clearly.", instructions: "Say each word with equal clarity and volume.", text: "Natural, speaking, clearly, calmly, comfortably, understand, confident.", pitch: [95, 165], volume: [-38, -34], variation: [8, 30], brightness: [650, 2400], durationSec: 35, visual: "articulation", passScore: 75, trackWords: ["natural", "speaking", "clearly", "calmly", "comfortably", "understand", "confident"] },
    { id: "l2d4", level: 2, category: "articulation", name: "Long Clarity Paragraph", difficulty: "intermediate", goal: "Maintain clarity across a full paragraph.", instructions: "Keep mouth open and volume steady through the whole passage.", text: "Today I want to practice speaking in a voice that feels natural and clear. I will not drop small words, and I will finish every word with a clean ending.", pitch: [95, 165], volume: [-38, -34], variation: [8, 30], brightness: [650, 2400], durationSec: 40, visual: "articulation", passScore: 78, trackWords: ["i", "to", "the", "and", "every", "word"] },

    { id: "l3d1", level: 3, category: "pitch", name: "Comfortable Mmm", difficulty: "beginner", goal: "Hold a relaxed hum.", instructions: "Hum 'mmm' at a comfortable pitch. Do not force your throat lower.", text: "Mmmmmm. Mmmmmm. Mmmmmm.", pitch: [120, 160], volume: [-42, -34], variation: [3, 18], brightness: [550, 2000], durationSec: 20, visual: "pitch", passScore: 65, warnLow: 110, warnHigh: 180 },
    { id: "l3d2", level: 3, category: "pitch", name: "Sentence at 150 Hz", difficulty: "beginner", goal: "Speak one sentence around 150 Hz.", instructions: "Aim for a calm mid-range. Let pitch settle naturally.", text: "I am speaking at a comfortable mid pitch. My voice feels relaxed and steady.", pitch: [140, 160], volume: [-40, -34], variation: [5, 22], brightness: [550, 2000], durationSec: 30, visual: "pitch", passScore: 70, warnLow: 120, warnHigh: 175 },
    { id: "l3d3", level: 3, category: "pitch", name: "Sentence at 140 Hz", difficulty: "intermediate", goal: "Speak one sentence around 140 Hz.", instructions: "Lower slightly without pushing. Pause first, then speak slowly.", text: "I hear you. Let me think about that, and then I will give you a clear answer.", pitch: [130, 150], volume: [-40, -34], variation: [5, 20], brightness: [550, 1900], durationSec: 30, visual: "pitch", passScore: 72, warnLow: 115, warnHigh: 165 },
    { id: "l3d4", level: 3, category: "pitch", name: "Relaxed Lower Range", difficulty: "intermediate", goal: "Lower without throat strain.", instructions: "Relax shoulders and jaw. If it feels forced, stop pushing.", text: "I am letting my voice settle into a comfortable lower range. I am not pushing my throat.", pitch: [125, 145], volume: [-38, -34], variation: [5, 18], brightness: [550, 1900], durationSec: 35, visual: "pitch", passScore: 75, warnLow: 110, warnHigh: 160 },

    { id: "l4d1", level: 4, category: "steadiness", name: "Smooth One Line", difficulty: "beginner", goal: "Reduce pitch jumping on one sentence.", instructions: "Speak one smooth line. Avoid sudden spikes or drops.", text: "I will speak one smooth line without my pitch jumping up and down.", pitch: [120, 160], volume: [-40, -34], variation: [5, 18], brightness: [600, 2200], durationSec: 25, visual: "steadiness", passScore: 70 },
    { id: "l4d2", level: 4, category: "steadiness", name: "Steady Paragraph", difficulty: "intermediate", goal: "Keep pitch variation natural but controlled.", instructions: "Allow small movement — not robotic flatness, not wild jumps.", text: "My voice stays steady and controlled. There is natural movement, but I am not shaky or jumpy.", pitch: [120, 155], volume: [-40, -34], variation: [5, 16], brightness: [600, 2200], durationSec: 35, visual: "steadiness", passScore: 72 },
    { id: "l4d3", level: 4, category: "steadiness", name: "Calm Counting", difficulty: "beginner", goal: "Practice even pitch on numbers.", instructions: "Count slowly from one to ten with the same calm energy.", text: "One, two, three, four, five, six, seven, eight, nine, ten.", pitch: [120, 155], volume: [-40, -34], variation: [4, 15], brightness: [600, 2200], durationSec: 25, visual: "steadiness", passScore: 68 },
    { id: "l4d4", level: 4, category: "steadiness", name: "Controlled Pace", difficulty: "intermediate", goal: "Steady pitch at a slower pace.", instructions: "Slow down. Pauses help steadiness more than rushing.", text: "I understand the situation. I am going to stay calm, look at the facts, and respond clearly.", pitch: [125, 150], volume: [-38, -34], variation: [5, 14], brightness: [600, 2100], durationSec: 35, visual: "steadiness", passScore: 75 },

    { id: "l5d1", level: 5, category: "ending", name: "Land the Ending", difficulty: "beginner", goal: "Finish with clear downward energy.", instructions: "Let the last few words land — not rise like a question.", text: "I want my sentence endings to land clearly and calmly.", pitch: [120, 155], volume: [-40, -34], variation: [6, 22], brightness: [600, 2200], durationSec: 25, visual: "ending", passScore: 70, endingCheck: true },
    { id: "l5d2", level: 5, category: "ending", name: "No Question Rise", difficulty: "intermediate", goal: "Avoid rising pitch at the end.", instructions: "This is a statement, not a question. End slightly lower or level.", text: "That is the plan we agreed on.", pitch: [120, 150], volume: [-40, -34], variation: [6, 20], brightness: [600, 2200], durationSec: 25, visual: "ending", passScore: 72, endingCheck: true },
    { id: "l5d3", level: 5, category: "ending", name: "No Fade Out", difficulty: "intermediate", goal: "Keep volume through the last word.", instructions: "The last word matters as much as the first.", text: "I will keep the same clear energy until the very last word of this sentence.", pitch: [120, 155], volume: [-38, -34], variation: [6, 20], brightness: [600, 2200], durationSec: 30, visual: "ending", passScore: 75, endingCheck: true },
    { id: "l5d4", level: 5, category: "ending", name: "Confident Close", difficulty: "advanced", goal: "End with calm authority.", instructions: "Pause, breathe, speak, and let the ending settle downward.", text: "I am confident in my answer, and I stand by what I said.", pitch: [125, 148], volume: [-38, -32], variation: [5, 18], brightness: [550, 2000], durationSec: 30, visual: "ending", passScore: 78, endingCheck: true },

    { id: "l6d1", level: 6, category: "emotion", name: "Calm Mode", difficulty: "beginner", goal: "Sound calm and clear.", instructions: "Slow breath, medium volume, minimal pitch movement.", text: "Everything is fine. I am calm, focused, and ready to listen.", pitch: [120, 150], volume: [-40, -34], variation: [4, 14], brightness: [550, 1900], durationSec: 30, visual: "emotion", passScore: 70, emotionMode: "calm" },
    { id: "l6d2", level: 6, category: "emotion", name: "Happy Mode", difficulty: "intermediate", goal: "Show warmth without losing control.", instructions: "Let brightness rise slightly but keep volume steady.", text: "That is great news. I am really glad we figured this out together.", pitch: [130, 165], volume: [-38, -32], variation: [10, 28], brightness: [750, 2600], durationSec: 30, visual: "emotion", passScore: 72, emotionMode: "happy" },
    { id: "l6d3", level: 6, category: "emotion", name: "Sincere Mode", difficulty: "intermediate", goal: "Sound honest and warm.", instructions: "Speak like you mean it. Stay breath-supported.", text: "I want to say this honestly. It matters to me, and I appreciate you hearing me out.", pitch: [115, 150], volume: [-40, -34], variation: [8, 24], brightness: [600, 2200], durationSec: 35, visual: "emotion", passScore: 74, emotionMode: "sincere" },
    { id: "l6d4", level: 6, category: "emotion", name: "Firm & Controlled", difficulty: "advanced", goal: "Firm tone without shouting.", instructions: "Direct and steady. No throat tension.", text: "I need to be clear. This is not acceptable, and we need to fix it respectfully.", pitch: [120, 155], volume: [-36, -30], variation: [8, 26], brightness: [600, 2300], durationSec: 35, visual: "emotion", passScore: 75, emotionMode: "firm" },
    { id: "l6d5", level: 6, category: "emotion", name: "Presentation Mode", difficulty: "advanced", goal: "Confident presentation delivery.", instructions: "Open posture, clear volume, intentional variation.", text: "Good morning everyone. Today I will walk you through the main idea and explain why it matters.", pitch: [125, 160], volume: [-36, -30], variation: [8, 30], brightness: [650, 2500], durationSec: 40, visual: "emotion", passScore: 78, emotionMode: "presentation" },

    { id: "l7d1", level: 7, category: "realworld", name: "Meeting Response", difficulty: "intermediate", goal: "Professional meeting tone.", instructions: "Sound prepared and calm. Medium volume first.", text: "That is a good question. From my perspective, the best next step is to simplify the problem and agree on a priority.", pitch: [120, 155], volume: [-38, -34], variation: [6, 24], brightness: [600, 2300], durationSec: 35, visual: "realworld", passScore: 72 },
    { id: "l7d2", level: 7, category: "realworld", name: "Interview Answer", difficulty: "intermediate", goal: "Confident interview delivery.", instructions: "Structured answer, steady ending, clear words.", text: "One strength I bring is staying calm and organized when things are unclear. I try to understand the real problem first.", pitch: [120, 155], volume: [-38, -34], variation: [6, 22], brightness: [600, 2300], durationSec: 40, visual: "realworld", passScore: 74 },
    { id: "l7d3", level: 7, category: "realworld", name: "Respectful Disagreement", difficulty: "advanced", goal: "Disagree without tension.", instructions: "Firm but warm. Do not rush.", text: "I see your point, but I disagree. I think we should look at the data again before we decide.", pitch: [120, 150], volume: [-38, -32], variation: [6, 22], brightness: [600, 2200], durationSec: 35, visual: "realworld", passScore: 75 },
    { id: "l7d4", level: 7, category: "realworld", name: "Clear Apology", difficulty: "intermediate", goal: "Sincere apology with control.", instructions: "Warm, direct, not overly soft.", text: "I am sorry about what happened. I take responsibility, and I want to make this right.", pitch: [115, 150], volume: [-40, -34], variation: [6, 22], brightness: [600, 2200], durationSec: 30, visual: "realworld", passScore: 72 },
    { id: "l7d5", level: 7, category: "realworld", name: "Simple Explanation", difficulty: "intermediate", goal: "Explain clearly to one person.", instructions: "Imagine explaining to a friend. Steady pace.", text: "Let me explain this in a simple way. The main point is not complicated if we take it one step at a time.", pitch: [120, 155], volume: [-38, -34], variation: [6, 24], brightness: [600, 2300], durationSec: 35, visual: "realworld", passScore: 73 },
    { id: "l7d6", level: 7, category: "realworld", name: "Presentation Opening", difficulty: "advanced", goal: "Strong opening presence.", instructions: "Open with breath support and clear volume.", text: "Good morning everyone. Today I want to walk you through the main idea, explain why it matters, and show how we can take action.", pitch: [125, 155], volume: [-36, -32], variation: [6, 26], brightness: [650, 2400], durationSec: 40, visual: "realworld", passScore: 78 },

    { id: "l8d1", level: 8, category: "presence", name: "Grounded Opening", difficulty: "advanced", goal: "Lower, slower, warmer opening.", instructions: "Pause, breathe, speak slowly with relaxed confidence.", text: "I hear you. Let me think about that for a moment, and then I will give you a clear answer.", pitch: [130, 145], volume: [-38, -32], variation: [5, 16], brightness: [550, 1900], durationSec: 35, visual: "pitch", passScore: 78, warnLow: 115, warnHigh: 155 },
    { id: "l8d2", level: 8, category: "presence", name: "Calm Authority", difficulty: "advanced", goal: "Masculine presence without force.", instructions: "Steady pitch, medium volume, warm tone.", text: "I understand the situation. I am going to stay calm, look at the facts, and respond clearly.", pitch: [130, 145], volume: [-38, -32], variation: [5, 14], brightness: [550, 1850], durationSec: 35, visual: "steadiness", passScore: 80 },
    { id: "l8d3", level: 8, category: "presence", name: "Grounded Storytelling", difficulty: "advanced", goal: "Confident narrative delivery.", instructions: "Natural movement, but controlled volume and endings.", text: "There was a time when I realized that confidence is not about speaking loudly. It is about staying calm and speaking with purpose.", pitch: [128, 148], volume: [-38, -32], variation: [6, 18], brightness: [550, 2000], durationSec: 45, visual: "pitch", passScore: 80, warnLow: 115, warnHigh: 160 },
    { id: "l8d4", level: 8, category: "presence", name: "Full Presence Drill", difficulty: "advanced", goal: "Combine volume, pitch, steadiness, and endings.", instructions: "This is the full integration drill. Volume first, then pitch, then emotion.", text: "I speak with calm masculine presence. My volume is supported, my pitch is relaxed, my endings land clearly, and my voice feels warm and confident.", pitch: [130, 145], volume: [-38, -32], variation: [5, 14], brightness: [550, 1900], durationSec: 45, visual: "pitch", passScore: 82, warnLow: 115, warnHigh: 155, endingCheck: true }
  ];

  function getPracticeLevel(id) {
    return practiceLevels.find((level) => level.id === id) || practiceLevels[0];
  }

  function getPracticeDrill(id) {
    return practiceDrills.find((drill) => drill.id === id) || practiceDrills[0];
  }

  function getDrillsForLevel(levelId) {
    return practiceDrills.filter((drill) => drill.level === levelId);
  }

  function labelDrillDifficulty(value) {
    return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  }

  return {
    agents,
    templates,
    practiceLevels,
    practiceDrills,
    getAgent,
    getTemplate,
    getPracticeLevel,
    getPracticeDrill,
    getDrillsForLevel,
    labelDifficulty,
    labelDrillDifficulty
  };
})();
