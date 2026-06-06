I want to add a new “Practice Voice” page to my existing Voice Coach Studio app.

Current app context:

* The app uses browser microphone analysis.
* It tracks estimated pitch/Hz, loudness/dB, steadiness, warmth/brightness, live transcript, word-level history, pitch movement graph, and generates a Voice Movement Report.
* The app already has coach agents and training templates.
* My goal is to improve my speaking voice so I sound natural, clear, confident, steady, warm, and masculine/present without forcing my throat.

New page goal:
Create a dedicated Practice Voice page that works like a voice training gym. It should not only measure my voice; it should guide me through structured exercises from beginner to advanced.

UI requirements:

* Add a new bottom navbar item called “Practice”.
* When clicked, open the Practice Voice page or section.
* The page should be responsive and easy to use.
* It should have clear training cards, a selected drill area, live visual feedback, and post-drill results.
* It should use the same visual style as the existing app.
* It should include visualizations similar to pitch movement, but also for loudness and steadiness.
* Each drill should show:

  * drill name
  * difficulty
  * goal
  * instructions
  * text/sound to speak
  * target pitch range
  * target volume range
  * target steadiness range
  * timer
  * live score
  * pass/fail result
  * specific correction tip

Practice training categories:

1. Loudness Control

   * Goal: stop speaking too softly.
   * Visual: volume bar with green target zone.
   * Score: percentage of time volume stayed in target.
   * Example target: -42 dB to -38 dB for beginner, then -38 dB to -34 dB.

2. Pitch Control

   * Goal: learn comfortable lower pitch without forcing.
   * Visual: pitch movement graph with target band and average line.
   * Exercises:

     * hold a comfortable “mmm”
     * speak one sentence around 150 Hz
     * speak one sentence around 140 Hz
   * Warn if pitch is forced too low or too jumpy.

3. Steadiness Control

   * Goal: reduce shaky voice and pitch jumping.
   * Visual: pitch variation graph.
   * Score based on pitch standard deviation.
   * Target: smoother pitch movement, not robotic flatness.

4. Sentence Ending Control

   * Goal: stop rising or fading at the end.
   * Detect if the final part of the sentence goes upward, downward, or fades in volume.
   * Visual: compare start/middle/end pitch and volume.
   * Feedback:

     * “Ending rose like a question”
     * “Ending faded too soft”
     * “Ending landed clearly”

5. Clear Words / Articulation

   * Goal: improve small words, final consonants, and long words.
   * Track words like I, to, my, the, and.
   * Detect if small words are too soft.
   * Include practice words:

     * natural
     * speaking
     * clearly
     * calmly
     * comfortably
     * understand
     * confident

6. Emotion Control

   * Goal: speak with emotion while staying clear and controlled.
   * Modes:

     * calm
     * happy
     * sincere
     * firm/angry but controlled
     * whisper
     * presentation
   * Each mode should have different pitch, volume, variation, and warmth targets.

7. Real-World Speaking

   * Goal: transfer training into normal speech.
   * Drills:

     * meeting response
     * interview answer
     * disagreement
     * apology
     * explanation
     * presentation opening

Training progression:
Create a level system:

* Level 1: Breath and medium volume
* Level 2: Clear words
* Level 3: Pitch awareness
* Level 4: Steadiness
* Level 5: Sentence endings
* Level 6: Emotion control
* Level 7: Real-world speaking
* Level 8: Advanced calm masculine presence

Each level should have 3–5 drills. Start with easy drills and gradually increase difficulty.

Drill result report:
After each drill, generate a small report:

* drill name
* duration
* average pitch
* average volume
* steadiness
* pitch in target %
* volume in target %
* ending result
* top issue
* one correction for next attempt

Important behavior:

* Do not overload the user with too many numbers at once.
* Show one main correction at a time.
* The app should guide the user like:
  “First fix volume, then pitch, then emotion.”
* If the user is too soft, tell them to increase breath-supported volume before focusing on pitch.
* If pitch is high but volume is too soft, prioritize volume first.
* If pitch is low but strained, warn not to force the throat.

Implementation requirements:

* Keep project structure:

  * index.html
  * css/styles.css
  * js/data.js
  * js/audio.js
  * js/speech.js
  * js/reports.js
  * js/ui.js
  * js/app.js
* Add new drill data in js/data.js.
* Add practice page logic in js/app.js or a separate js/practice.js.
* Reuse existing microphone analysis functions.
* Reuse existing pitch movement graph logic where possible.
* Make the page fully responsive.
* Keep the bottom navbar minimal with icons and hover titles.
* Do not remove existing report, CSV, transcript, library, or session history features.

Output:
Create the updated code for the full app with the new Practice Voice page added.
