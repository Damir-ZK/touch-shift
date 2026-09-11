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

    // Sequence Font Scale State
    this.fontSize = parseFloat(localStorage.getItem('touchshift_font_size') || '3.2');

    // Length & Popover Elements
    this.lengthTriggerBtn = document.getElementById('length-trigger-btn');
    this.lengthBadge = document.getElementById('length-badge');
    this.popoverEl = document.getElementById('display-fit-popover');
    this.popoverOverlay = document.getElementById('popover-overlay');
    this.popoverCloseBtn = document.getElementById('popover-close-btn');
    this.popoverDoneBtn = document.getElementById('popover-done-btn');
    this.fontSizeSlider = document.getElementById('font-size-slider');
    this.fontSizeVal = document.getElementById('font-size-val');
    this.capacityVal = document.getElementById('capacity-val');
    this.setMaxFitBtn = document.getElementById('set-max-fit-btn');
    this.popoverMinSlider = document.getElementById('popover-min-slider');
    this.popoverMaxSlider = document.getElementById('popover-max-slider');
    this.minLenDisplay = document.getElementById('min-len-display');
    this.maxLenDisplay = document.getElementById('max-len-display');
    this.popoverLengthSummary = document.getElementById('popover-length-summary');

    // Skip button
    this.skipBtn = document.getElementById('skip-btn');

    // Initialize Keyboard Guide
    this.keyboardGuide = new KeyboardGuide({
      containerEl: document.getElementById('keyboard-keys-row'),
      lShiftEl: document.getElementById('guide-l-shift'),
      rShiftEl: document.getElementById('guide-r-shift'),
      hintFingerEl: document.getElementById('hint-finger-badge')
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
    this.applyFontSize(this.fontSize, false);
    this.initLengthUI();
    this.bindEvents();
    this.startHudLoop();

    // Start training session
    this.trainer.start();
    this.focusInput();
  }

  applyFontSize(size, triggerUpdate = true) {
    this.fontSize = Math.max(1.8, Math.min(parseFloat(size) || 3.2, 4.5));
    document.documentElement.style.setProperty('--sequence-font-size', `${this.fontSize}rem`);
    localStorage.setItem('touchshift_font_size', String(this.fontSize));

    if (this.fontSizeSlider) {
      this.fontSizeSlider.value = this.fontSize;
    }
    if (this.fontSizeVal) {
      this.fontSizeVal.textContent = `${this.fontSize.toFixed(1)}rem`;
    }

    // Update preset font button states
    document.querySelectorAll('.font-preset-btn').forEach(btn => {
      const presetSize = parseFloat(btn.dataset.size);
      if (Math.abs(presetSize - this.fontSize) < 0.15) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.maxFittingChars = this.calculateMaxFittingChars(this.fontSize);
    this.updatePopoverCapacity();

    if (this.maxLength && this.maxLength > this.maxFittingChars) {
      const newMin = Math.min(this.minLength, this.maxFittingChars);
      this.setLengthRange(newMin, this.maxFittingChars, triggerUpdate);
    } else {
      this.updateLengthUI();
    }
  }

  calculateMaxFittingChars(fontSize = this.fontSize) {
    const stageCard = this.stageCardEl || document.querySelector('.stage-card');
    let availableWidth;
    if (stageCard && stageCard.clientWidth > 0) {
      const style = window.getComputedStyle(stageCard);
      const padLeft = parseFloat(style.paddingLeft) || 40;
      const padRight = parseFloat(style.paddingRight) || 40;
      availableWidth = stageCard.clientWidth - padLeft - padRight;
    } else {
      const screenW = window.innerWidth || document.documentElement.clientWidth || 1024;
      availableWidth = Math.min(screenW * 0.94 - 48, 1400);
    }

    const slotWidth = fontSize * 16 * 1.45;
    const gap = Math.max(8, Math.min(window.innerWidth * 0.014, 20));

    const maxChars = Math.floor((availableWidth + gap) / (slotWidth + gap));
    return Math.max(2, Math.min(maxChars, 24));
  }

  updatePopoverCapacity() {
    if (this.capacityVal) {
      this.capacityVal.textContent = this.maxFittingChars;
    }
    if (this.popoverMinSlider) {
      this.popoverMinSlider.max = this.maxFittingChars;
    }
    if (this.popoverMaxSlider) {
      this.popoverMaxSlider.max = this.maxFittingChars;
    }
  }

  initLengthUI() {
    this.maxFittingChars = this.calculateMaxFittingChars(this.fontSize);
    const savedMin = parseInt(localStorage.getItem('touchshift_min_len'), 10);
    const savedMax = parseInt(localStorage.getItem('touchshift_max_len'), 10);

    const initialMin = !isNaN(savedMin) ? Math.max(1, Math.min(savedMin, this.maxFittingChars)) : 3;
    const initialMax = !isNaN(savedMax)
      ? Math.max(initialMin, Math.min(savedMax, this.maxFittingChars))
      : Math.max(initialMin, Math.min(6, this.maxFittingChars));

    this.setLengthRange(initialMin, initialMax, false);
    this.updatePopoverCapacity();
  }

  updateLengthUI() {
    if (this.popoverMinSlider) {
      this.popoverMinSlider.value = this.minLength;
      this.popoverMinSlider.max = this.maxFittingChars;
    }
    if (this.popoverMaxSlider) {
      this.popoverMaxSlider.value = this.maxLength;
      this.popoverMaxSlider.max = this.maxFittingChars;
    }
    if (this.minLenDisplay) {
      this.minLenDisplay.textContent = this.minLength;
    }
    if (this.maxLenDisplay) {
      this.maxLenDisplay.textContent = this.maxLength;
    }

    const summaryText = this.minLength === this.maxLength
      ? `${this.minLength} keys (Fixed)`
      : `${this.minLength}–${this.maxLength} keys (Random)`;

    if (this.popoverLengthSummary) {
      this.popoverLengthSummary.textContent = summaryText;
    }

    if (this.lengthBadge) {
      if (this.minLength === this.maxLength) {
        this.lengthBadge.textContent = `${this.minLength} (Fixed)`;
        this.lengthBadge.classList.add('is-fixed');
        this.lengthBadge.title = `Always generates exactly ${this.minLength} characters`;
      } else {
        this.lengthBadge.textContent = `${this.minLength}–${this.maxLength} (Random)`;
        this.lengthBadge.classList.remove('is-fixed');
        this.lengthBadge.title = `Generates random sequences between ${this.minLength} and ${this.maxLength} characters`;
      }
    }
  }

  setLengthRange(min, max, triggerNew = true) {
    const clampedMin = Math.max(1, Math.min(min, this.maxFittingChars));
    const clampedMax = Math.max(clampedMin, Math.min(max, this.maxFittingChars));

    this.minLength = clampedMin;
    this.maxLength = clampedMax;

    this.generator.setRange(this.minLength, this.maxLength);
    localStorage.setItem('touchshift_min_len', this.minLength);
    localStorage.setItem('touchshift_max_len', this.maxLength);

    this.updateLengthUI();

    if (triggerNew && this.trainer) {
      this.trainer.nextSequence();
      this.focusInput();
    }
  }

  openPopover() {
    if (!this.popoverEl) return;
    this.updatePopoverCapacity();
    this.updateLengthUI();
    this.popoverEl.classList.remove('hidden');
  }

  closePopover() {
    if (!this.popoverEl) return;
    this.popoverEl.classList.add('hidden');
    this.focusInput();
  }

  initGuideMode() {
    let savedMode = localStorage.getItem('touchshift_guide_mode') || 'full';
    if (savedMode === 'full-blindfold') savedMode = 'zen';
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
      // Don't steal focus if clicking buttons, dropdowns, inputs, stats drawer, or modal dialog
      if (
        !e.target.closest('button') &&
        !e.target.closest('select') &&
        !e.target.closest('input') &&
        !e.target.closest('.stats-drawer') &&
        !e.target.closest('.modal-dialog')
      ) {
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

    // Length Popover Trigger & Modal Events
    if (this.lengthTriggerBtn) {
      this.lengthTriggerBtn.addEventListener('click', () => {
        this.openPopover();
      });
    }

    if (this.popoverCloseBtn) {
      this.popoverCloseBtn.addEventListener('click', () => {
        this.closePopover();
      });
    }

    if (this.popoverDoneBtn) {
      this.popoverDoneBtn.addEventListener('click', () => {
        this.closePopover();
      });
    }

    if (this.popoverOverlay) {
      this.popoverOverlay.addEventListener('click', () => {
        this.closePopover();
      });
    }

    // Close popover on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.popoverEl && !this.popoverEl.classList.contains('hidden')) {
        e.stopPropagation();
        this.closePopover();
      }
    }, { capture: true });

    // Sequence Font Size Slider
    if (this.fontSizeSlider) {
      this.fontSizeSlider.addEventListener('input', (e) => {
        this.applyFontSize(parseFloat(e.target.value));
      });
    }

    // Sequence Font Size Presets
    document.querySelectorAll('.font-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const size = parseFloat(btn.dataset.size);
        this.applyFontSize(size);
      });
    });

    // Popover Min Length Slider
    if (this.popoverMinSlider) {
      this.popoverMinSlider.addEventListener('input', (e) => {
        const nextMin = parseInt(e.target.value, 10);
        const nextMax = Math.max(this.maxLength, nextMin);
        this.setLengthRange(nextMin, nextMax);
      });
    }

    // Popover Max Length Slider
    if (this.popoverMaxSlider) {
      this.popoverMaxSlider.addEventListener('input', (e) => {
        const nextMax = parseInt(e.target.value, 10);
        const nextMin = Math.min(this.minLength, nextMax);
        this.setLengthRange(nextMin, nextMax);
      });
    }

    // Set Max Fit Button
    if (this.setMaxFitBtn) {
      this.setMaxFitBtn.addEventListener('click', () => {
        this.setLengthRange(this.minLength, this.maxFittingChars);
      });
    }

    // Dynamic screen-width resize listener to enforce screen-fitting limit
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newMaxFitting = this.calculateMaxFittingChars(this.fontSize);
        if (newMaxFitting !== this.maxFittingChars) {
          this.maxFittingChars = newMaxFitting;
          this.updatePopoverCapacity();
          const adjustedMax = Math.min(this.maxLength, this.maxFittingChars);
          const adjustedMin = Math.min(this.minLength, adjustedMax);
          const changed = adjustedMax !== this.maxLength || adjustedMin !== this.minLength;
          this.setLengthRange(adjustedMin, adjustedMax, changed);
        }
      }, 150);
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
