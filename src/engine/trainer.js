/**
 * Typing Engine / Trainer State Machine
 * Handles keystroke capture, validation, zero-friction sequence rollover, and modes.
 */

export class TypingTrainer {
  constructor({
    generator,
    onSequenceUpdate,
    onCharAdvance,
    onCharMistake,
    onSequenceComplete,
    onSkip
  }) {
    this.generator = generator;
    this.onSequenceUpdate = onSequenceUpdate || (() => {});
    this.onCharAdvance = onCharAdvance || (() => {});
    this.onCharMistake = onCharMistake || (() => {});
    this.onSequenceComplete = onSequenceComplete || (() => {});
    this.onSkip = onSkip || (() => {});

    this.mode = 'strict'; // 'strict' | 'buffer'
    this.currentSequence = [];
    this.currentIndex = 0;
    this.statusArray = []; // Array of 'pending' | 'correct' | 'error'
    this.bufferTyped = []; // for buffer mode

    this.isActive = false;
    this.isPaused = false;
    this.startTime = null;
    this.sequenceStartTime = null;

    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  start() {
    this.isActive = true;
    this.isPaused = false;
    window.addEventListener('keydown', this.boundHandleKeyDown, { capture: true });
    this.nextSequence();
  }

  stop() {
    this.isActive = false;
    this.isPaused = false;
    window.removeEventListener('keydown', this.boundHandleKeyDown, { capture: true });
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  setMode(mode) {
    if (['strict', 'buffer', 'speedrun', 'survival'].includes(mode)) {
      this.mode = mode;
      this.resetCurrentSequence();
    }
  }

  nextSequence() {
    const raw = this.generator.generate();
    this.currentSequence = Array.from(raw);
    this.currentIndex = 0;
    this.statusArray = new Array(this.currentSequence.length).fill('pending');
    this.bufferTyped = [];
    this.sequenceStartTime = performance.now();

    if (!this.startTime) {
      this.startTime = performance.now();
    }

    this.onSequenceUpdate({
      sequence: this.currentSequence,
      currentIndex: this.currentIndex,
      statusArray: this.statusArray,
      mode: this.mode,
      isNew: true
    });
  }

  resetCurrentSequence() {
    this.currentIndex = 0;
    this.statusArray = new Array(this.currentSequence.length).fill('pending');
    this.bufferTyped = [];
    this.sequenceStartTime = performance.now();

    this.onSequenceUpdate({
      sequence: this.currentSequence,
      currentIndex: this.currentIndex,
      statusArray: this.statusArray,
      mode: this.mode,
      isReset: true
    });
  }

  skip() {
    this.onSkip();
    this.nextSequence();
  }

  getCurrentChar() {
    if (this.currentIndex < this.currentSequence.length) {
      return this.currentSequence[this.currentIndex];
    }
    return null;
  }

  handleKeyDown(event) {
    // If not active or currently paused, ignore
    if (!this.isActive || this.isPaused) return;

    // Check if user is typing inside another input element (like theme select or search)
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
      if (target.id !== 'hidden-input') {
        return;
      }
    }

    // Handle skip shortcuts (Tab or Escape)
    if (event.key === 'Tab' || event.key === 'Escape') {
      event.preventDefault();
      this.skip();
      return;
    }

    // Ignore system / modifier / control keys
    const ignoredKeys = [
      'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
    ];

    if (ignoredKeys.includes(event.key)) {
      return;
    }

    // Prevent default browser behavior on printable keys (e.g., '/' quick-find, space scroll)
    event.preventDefault();

    if (this.mode === 'buffer') {
      this.processBufferInput(event.key);
    } else {
      // 'strict', 'speedrun', and 'survival' all use instant-advance strict validation
      this.processStrictInput(event.key);
    }
  }

  processStrictInput(typedChar) {
    if (!typedChar || typedChar === 'Enter' || typedChar === '\n' || typedChar === '\r') return;
    if (this.currentIndex >= this.currentSequence.length) return;

    const expectedChar = this.currentSequence[this.currentIndex];

    if (typedChar === expectedChar) {
      // Correct!
      this.statusArray[this.currentIndex] = 'correct';
      const advancedIndex = this.currentIndex;
      this.currentIndex++;

      this.onCharAdvance({
        char: expectedChar,
        index: advancedIndex,
        isCorrect: true,
        currentIndex: this.currentIndex
      });

      // Check if sequence is completed
      if (this.currentIndex >= this.currentSequence.length) {
        const timeSpentMs = performance.now() - this.sequenceStartTime;
        this.onSequenceComplete({
          sequence: this.currentSequence.join(''),
          length: this.currentSequence.length,
          timeSpentMs
        });

        // ZERO-FRICTION ROLLOVER: Generate next sequence immediately
        this.nextSequence();
      } else {
        this.onSequenceUpdate({
          sequence: this.currentSequence,
          currentIndex: this.currentIndex,
          statusArray: this.statusArray,
          mode: this.mode
        });
      }
    } else {
      // Incorrect!
      this.statusArray[this.currentIndex] = 'error';

      this.onCharMistake({
        expectedChar,
        typedChar,
        index: this.currentIndex
      });

      this.onSequenceUpdate({
        sequence: this.currentSequence,
        currentIndex: this.currentIndex,
        statusArray: this.statusArray,
        mode: this.mode,
        isMistake: true
      });
    }
  }

  processBufferInput(key) {
    if (!key || key === 'Enter' || key === '\n' || key === '\r') return;
    if (key === 'Backspace') {
      if (this.bufferTyped.length > 0) {
        this.bufferTyped.pop();
        this.currentIndex = this.bufferTyped.length;
        this.statusArray[this.currentIndex] = 'pending';
        
        this.onSequenceUpdate({
          sequence: this.currentSequence,
          currentIndex: this.currentIndex,
          statusArray: this.statusArray,
          mode: this.mode,
          buffer: this.bufferTyped
        });
      }
      return;
    }

    // If single printable character
    if (key.length === 1 && this.bufferTyped.length < this.currentSequence.length) {
      const idx = this.bufferTyped.length;
      const expectedChar = this.currentSequence[idx];
      const isMatch = (key === expectedChar);

      this.bufferTyped.push(key);
      this.statusArray[idx] = isMatch ? 'correct' : 'error';
      this.currentIndex = this.bufferTyped.length;

      if (isMatch) {
        this.onCharAdvance({
          char: expectedChar,
          index: idx,
          isCorrect: true,
          currentIndex: this.currentIndex
        });
      } else {
        this.onCharMistake({
          expectedChar,
          typedChar: key,
          index: idx
        });
      }

      // If buffer filled all characters
      if (this.bufferTyped.length === this.currentSequence.length) {
        const timeSpentMs = performance.now() - this.sequenceStartTime;
        this.onSequenceComplete({
          sequence: this.currentSequence.join(''),
          length: this.currentSequence.length,
          timeSpentMs
        });
        // Rollover immediately
        this.nextSequence();
      } else {
        this.onSequenceUpdate({
          sequence: this.currentSequence,
          currentIndex: this.currentIndex,
          statusArray: this.statusArray,
          mode: this.mode,
          buffer: this.bufferTyped
        });
      }
    }
  }
}
