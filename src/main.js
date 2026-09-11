/**
 * Main Application Bootstrapper
 * Connects the UI, Sound, Generator, Trainer, Keyboard Guide, and Stats.
 */

import { PRESETS, SequenceGenerator } from './engine/generator.js';
import { TypingTrainer } from './engine/trainer.js';
import { StatsTracker } from './engine/stats.js';
import { SoundSynthesizer } from './audio/soundEffects.js';
import { KeyboardGuide } from './components/keyboardGuide.js';
import { WeakKeysView } from './components/weakKeysView.js';

class TouchShiftApp {
  constructor() {
    this.generator = new SequenceGenerator();
    this.stats = new StatsTracker();
    this.audio = new SoundSynthesizer();

    // DOM Elements
    this.htmlEl = document.documentElement;
    this.stageCardEl = document.getElementById('stage-card');
    this.sequenceDisplayEl = document.getElementById('sequence-display');
    this.flowFeedbackEl = document.getElementById('flow-feedback');
    this.hiddenInput = document.getElementById('hidden-input');

    // HUD Elements
    this.hudCpm = document.getElementById('hud-cpm');
    this.hudWpm = document.getElementById('hud-wpm');
    this.hudAcc = document.getElementById('hud-acc');
    this.hudErrors = document.getElementById('hud-errors');
    this.hudStreakCount = document.getElementById('streak-count');
    this.hudStreakFlame = document.getElementById('streak-flame');
    this.hudBestStreak = document.getElementById('hud-best-streak');
    this.hudCompleted = document.getElementById('hud-completed');
    this.hudSessionTime = document.getElementById('hud-session-time');

    // Custom Panel Elements
    this.customPanel = document.getElementById('custom-chars-panel');
    this.customGrid = document.getElementById('custom-chars-grid');
    this.customSelectAllBtn = document.getElementById('custom-select-all');
    this.customClearAllBtn = document.getElementById('custom-clear-all');
    this.customSelectWeakBtn = document.getElementById('custom-select-weak');

    // Audio & Theme Elements
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.soundIconOn = document.getElementById('sound-icon-on');
    this.soundIconOff = document.getElementById('sound-icon-off');
    this.themeSelector = document.getElementById('theme-selector');

    // Skip button
    this.skipBtn = document.getElementById('skip-btn');

    // Initialize Keyboard Guide
    this.keyboardGuide = new KeyboardGuide({
      containerEl: document.getElementById('keyboard-keys-row'),
      lShiftEl: document.getElementById('guide-l-shift'),
      rShiftEl: document.getElementById('guide-r-shift'),
      hintFingerEl: document.getElementById('hint-finger-badge'),
      hintShiftEl: document.getElementById('hint-shift-badge')
    });

    // Initialize Weak Keys View
    this.weakKeysView = new WeakKeysView({
      statsTracker: this.stats,
      onDrillWeakKeys: (weakChars) => this.startDrillingWeakKeys(weakChars)
    });

    // Initialize Trainer
    this.trainer = new TypingTrainer({
      generator: this.generator,
      onSequenceUpdate: (data) => this.renderSequence(data),
      onCharAdvance: (data) => this.handleCharAdvance(data),
      onCharMistake: (data) => this.handleCharMistake(data),
      onSequenceComplete: (data) => this.handleSequenceComplete(data),
      onSkip: () => this.handleSkip()
    });

    this.initTheme();
    this.initSoundUI();
    this.initGuideMode();
    this.initCustomPanel();
    this.bindEvents();
    this.startHudLoop();

    // Start training session
    this.trainer.start();
    this.focusInput();
  }

  initGuideMode() {
    const savedMode = localStorage.getItem('touchshift_guide_mode') || 'full';
    document.querySelectorAll('.guide-mode-btn').forEach(btn => {
      if (btn.dataset.guideMode === savedMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.keyboardGuide.setMode(savedMode);
  }

  initTheme() {
    const savedTheme = localStorage.getItem('touchshift_theme') || 'cyber-neon';
    this.htmlEl.setAttribute('data-theme', savedTheme);
    if (this.themeSelector) {
      this.themeSelector.value = savedTheme;
    }
  }

  initSoundUI() {
    this.updateSoundIcon();
  }

  updateSoundIcon() {
    if (this.audio.isMuted) {
      this.soundIconOn.classList.add('hidden');
      this.soundIconOff.classList.remove('hidden');
    } else {
      this.soundIconOn.classList.remove('hidden');
      this.soundIconOff.classList.add('hidden');
    }
  }

  focusInput() {
    if (this.hiddenInput) {
      this.hiddenInput.focus();
    }
  }

  bindEvents() {
    // Stage Card click ensures focus
    if (this.stageCardEl) {
      this.stageCardEl.addEventListener('click', () => this.focusInput());
    }
    document.addEventListener('click', (e) => {
      // Don't steal focus if clicking buttons or dropdowns
      if (!e.target.closest('button') && !e.target.closest('select') && !e.target.closest('.stats-drawer')) {
        this.focusInput();
      }
    });

    // Theme selector
    if (this.themeSelector) {
      this.themeSelector.addEventListener('change', (e) => {
        const theme = e.target.value;
        this.htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('touchshift_theme', theme);
      });
    }

    // Sound toggle
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => {
        this.audio.toggleMute();
        this.updateSoundIcon();
      });
    }

    // Guide mode buttons
    document.querySelectorAll('.guide-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.guide-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.guideMode;
        localStorage.setItem('touchshift_guide_mode', mode);
        this.keyboardGuide.setMode(mode);
      });
    });

    // Preset selector buttons
    document.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const presetId = btn.dataset.preset;
        if (presetId === 'custom') {
          this.customPanel.classList.remove('hidden');
          this.generator.setPreset('custom');
        } else {
          this.customPanel.classList.add('hidden');
          this.generator.setPreset(presetId);
        }
        this.trainer.nextSequence();
      });
    });

    // Length selector buttons
    document.querySelectorAll('.length-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.length-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.generator.setLengthConfig(btn.dataset.len);
        this.trainer.nextSequence();
      });
    });

    // Mode selector buttons (Strict vs Buffer)
    document.querySelectorAll('.mode-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.trainer.setMode(btn.dataset.mode);
      });
    });

    // Skip button
    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => {
        this.trainer.skip();
      });
    }

    // Hidden input support for virtual/IME keyboards
    if (this.hiddenInput) {
      this.hiddenInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val && val.length > 0) {
          const char = val[val.length - 1];
          // Pass as key event
          const event = new KeyboardEvent('keydown', { key: char, bubbles: true });
          window.dispatchEvent(event);
          this.hiddenInput.value = '';
        }
      });
    }
  }

  initCustomPanel() {
    if (!this.customGrid) return;
    this.customGrid.innerHTML = '';

    // Collect all unique characters across all presets
    const allChars = PRESETS['all'].chars;
    const selectedSet = new Set(this.generator.customChars);

    allChars.forEach(char => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `char-toggle-btn ${selectedSet.has(char) ? 'selected' : ''}`;
      btn.textContent = char;
      btn.dataset.char = char;

      btn.addEventListener('click', () => {
        if (selectedSet.has(char)) {
          if (selectedSet.size > 1) {
            selectedSet.delete(char);
            btn.classList.remove('selected');
          }
        } else {
          selectedSet.add(char);
          btn.classList.add('selected');
        }
        this.generator.setCustomChars(Array.from(selectedSet));
        this.trainer.nextSequence();
      });

      this.customGrid.appendChild(btn);
    });

    if (this.customSelectAllBtn) {
      this.customSelectAllBtn.addEventListener('click', () => {
        allChars.forEach(c => selectedSet.add(c));
        document.querySelectorAll('.char-toggle-btn').forEach(b => b.classList.add('selected'));
        this.generator.setCustomChars(Array.from(selectedSet));
        this.trainer.nextSequence();
      });
    }

    if (this.customClearAllBtn) {
      this.customClearAllBtn.addEventListener('click', () => {
        // Keep at least the first char
        selectedSet.clear();
        selectedSet.add(allChars[0]);
        document.querySelectorAll('.char-toggle-btn').forEach((b, idx) => {
          if (idx === 0) b.classList.add('selected');
          else b.classList.remove('selected');
        });
        this.generator.setCustomChars(Array.from(selectedSet));
        this.trainer.nextSequence();
      });
    }

    if (this.customSelectWeakBtn) {
      this.customSelectWeakBtn.addEventListener('click', () => {
        const weakList = this.stats.getWeakKeys(85, 1);
        const weakChars = weakList.map(w => w.char);
        if (weakChars.length > 0) {
          this.startDrillingWeakKeys(weakChars);
        } else {
          alert('No weak keys recorded yet (<85% accuracy). Practice a bit more to identify weak spots!');
        }
      });
    }
  }

  startDrillingWeakKeys(weakChars) {
    // Switch to custom preset
    document.querySelectorAll('.preset-pill').forEach(b => {
      if (b.dataset.preset === 'custom') b.classList.add('active');
      else b.classList.remove('active');
    });

    this.customPanel.classList.remove('hidden');
    this.generator.setPreset('custom');
    this.generator.setCustomChars(weakChars);

    // Update custom toggle buttons
    const weakSet = new Set(weakChars);
    document.querySelectorAll('.char-toggle-btn').forEach(btn => {
      if (weakSet.has(btn.dataset.char)) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });

    this.trainer.nextSequence();
  }

  renderSequence({ sequence, currentIndex, statusArray, isMistake }) {
    if (!this.sequenceDisplayEl) return;
    this.sequenceDisplayEl.innerHTML = '';

    sequence.forEach((char, index) => {
      const slot = document.createElement('div');
      slot.className = 'char-slot';
      slot.textContent = char;

      if (index === currentIndex) {
        slot.classList.add('active');
        if (isMistake) {
          slot.classList.add('error');
        }
      } else if (index < currentIndex) {
        const status = statusArray[index];
        if (status === 'correct') {
          slot.classList.add('correct');
        } else if (status === 'error') {
          slot.classList.add('error');
        }
      }

      this.sequenceDisplayEl.appendChild(slot);
    });

    // Highlight the active expected character on keyboard guide
    const activeChar = currentIndex < sequence.length ? sequence[currentIndex] : null;
    this.keyboardGuide.highlight(activeChar);
  }

  handleCharAdvance({ char, index, isCorrect, currentIndex }) {
    this.audio.playKeyClick();
    this.stats.recordCharAdvance(char);
    this.updateHUD();
  }

  handleCharMistake({ expectedChar, typedChar, index }) {
    this.audio.playErrorSound();
    this.stats.recordCharMistake(expectedChar);
    this.updateHUD();
  }

  handleSequenceComplete({ sequence, length, timeSpentMs }) {
    this.audio.playSuccessChime();
    this.stats.recordSequenceComplete();
    this.updateHUD();

    // Trigger visual celebration ripple
    if (this.flowFeedbackEl) {
      this.flowFeedbackEl.classList.add('flash-success');
      setTimeout(() => {
        this.flowFeedbackEl.classList.remove('flash-success');
      }, 200);
    }
  }

  handleSkip() {
    this.stats.recordSkip();
    this.updateHUD();
  }

  startHudLoop() {
    // Update session duration and CPM periodically
    setInterval(() => {
      this.updateHUD();
    }, 1000);
  }

  updateHUD() {
    if (this.hudCpm) this.hudCpm.textContent = this.stats.getCPM();
    if (this.hudWpm) this.hudWpm.textContent = `${this.stats.getWPM()} WPM`;
    if (this.hudAcc) this.hudAcc.textContent = `${this.stats.getAccuracy()}%`;
    if (this.hudErrors) {
      const misses = this.stats.totalErrors;
      this.hudErrors.textContent = `${misses} miss${misses === 1 ? '' : 'es'}`;
    }
    if (this.hudStreakCount) this.hudStreakCount.textContent = this.stats.currentStreak;
    if (this.hudBestStreak) this.hudBestStreak.textContent = `Best: ${this.stats.bestStreak}`;
    if (this.hudCompleted) this.hudCompleted.textContent = this.stats.completedSequences;
    if (this.hudSessionTime) this.hudSessionTime.textContent = this.stats.getSessionDurationFormatted();

    if (this.hudStreakFlame) {
      if (this.stats.currentStreak >= 5) {
        this.hudStreakFlame.classList.add('active');
      } else {
        this.hudStreakFlame.classList.remove('active');
      }
    }
  }
}

// Bootstrap once DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new TouchShiftApp();
});
