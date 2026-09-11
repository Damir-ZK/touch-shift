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
import { SpeedrunEngine } from './engine/speedrunEngine.js';
import { SurvivalEngine } from './engine/survivalEngine.js';

class TouchShiftApp {
  constructor() {
    this.generator = new SequenceGenerator();
    this.stats = new StatsTracker();
    this.audio = new SoundSynthesizer();
    this.currentMode = 'strict';

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

    // Speedrun Elements
    this.speedrunBanner = document.getElementById('speedrun-banner');
    this.speedrunTimerEl = document.getElementById('speedrun-timer');
    this.speedrunProgressFill = document.getElementById('speedrun-progress-fill');
    this.speedrunKeysBadge = document.getElementById('speedrun-keys-badge');
    this.speedrunBestBadge = document.getElementById('speedrun-best-badge');
    this.speedrunStatusHint = document.getElementById('speedrun-status-hint');

    // Speedrun Modal Elements
    this.speedrunModalEl = document.getElementById('speedrun-modal');
    this.speedrunOverlayEl = document.getElementById('speedrun-overlay');
    this.speedrunCloseBtn = document.getElementById('speedrun-close-btn');
    this.speedrunRetryBtn = document.getElementById('speedrun-retry-btn');
    this.speedrunResultKeys = document.getElementById('speedrun-result-keys');
    this.speedrunResultCpm = document.getElementById('speedrun-result-cpm');
    this.speedrunResultWpm = document.getElementById('speedrun-result-wpm');
    this.speedrunResultAcc = document.getElementById('speedrun-result-acc');
    this.speedrunResultBest = document.getElementById('speedrun-result-best');
    this.speedrunNewRecord = document.getElementById('speedrun-new-record');

    // Survival Elements
    this.survivalBanner = document.getElementById('survival-banner');
    this.survivalHeartsEl = document.getElementById('survival-hearts');
    this.survivalWaveValEl = document.getElementById('survival-wave-val');
    this.survivalGhostPill = document.getElementById('survival-ghost-pill');
    this.ghostStatusTextEl = document.getElementById('ghost-status-text');
    this.ghostSpeedNumEl = document.getElementById('ghost-speed-num');
    this.survivalBestBadge = document.getElementById('survival-best-badge');

    // Survival Modal Elements
    this.survivalModalEl = document.getElementById('survival-modal');
    this.survivalOverlayEl = document.getElementById('survival-overlay');
    this.survivalCloseBtn = document.getElementById('survival-close-btn');
    this.survivalRetryBtn = document.getElementById('survival-retry-btn');
    this.survivalCauseText = document.getElementById('survival-cause-text');
    this.survivalResultWaves = document.getElementById('survival-result-waves');
    this.survivalResultKeys = document.getElementById('survival-result-keys');
    this.survivalResultSpeed = document.getElementById('survival-result-speed');
    this.survivalResultErrors = document.getElementById('survival-result-errors');
    this.survivalResultBest = document.getElementById('survival-result-best');
    this.survivalNewRecord = document.getElementById('survival-new-record');

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

    // Manual Modal Elements
    this.manualToggleBtn = document.getElementById('manual-toggle-btn');
    this.manualModalEl = document.getElementById('manual-modal');
    this.manualOverlayEl = document.getElementById('manual-overlay');
    this.manualCloseBtn = document.getElementById('manual-close-btn');
    this.manualDoneBtn = document.getElementById('manual-done-btn');

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

    // Initialize Speedrun Engine
    this.speedrunEngine = new SpeedrunEngine({
      onTick: (data) => this.handleSpeedrunTick(data),
      onWarningTick: (second) => this.audio.playTimerTick(),
      onComplete: (results) => this.handleSpeedrunComplete(results)
    });

    // Initialize Survival Engine
    this.survivalEngine = new SurvivalEngine({
      onGhostStep: (data) => this.handleGhostStep(data),
      onGhostOvertake: (data) => this.handleGhostOvertake(data),
      onLifeLost: (data) => this.handleLifeLost(data),
      onWaveComplete: (data) => this.handleWaveComplete(data),
      onGameOver: (results) => this.handleSurvivalGameOver(results),
      onStateUpdate: (state) => this.handleSurvivalStateUpdate(state)
    });

    // Initialize Trainer
    this.trainer = new TypingTrainer({
      generator: this.generator,
      onSequenceUpdate: (data) => {
        if (this.currentMode === 'survival' && this.survivalEngine) {
          if (data.isNew || data.isReset) {
            this.survivalEngine.setSequence(data.sequence);
          }
        }
        this.renderSequence(data);
      },
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

  openManual() {
    if (!this.manualModalEl) return;
    this.manualModalEl.classList.remove('hidden');
  }

  closeManual() {
    if (!this.manualModalEl) return;
    this.manualModalEl.classList.add('hidden');
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
        const presetId = btn.dataset.preset;
        if (presetId === 'weak') {
          const weakList = this.stats.getWeakKeys(90, 1);
          const weakChars = weakList.map(w => w.char);
          if (weakChars.length > 0) {
            this.startDrillingWeakKeys(weakChars);
          } else {
            alert('Great job! No weak keys detected yet (accuracy >= 90%). Keep typing to build more data!');
          }
          return;
        }

        document.querySelectorAll('.preset-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

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

    // Manual Modal Trigger & Close Events
    if (this.manualToggleBtn) {
      this.manualToggleBtn.addEventListener('click', () => {
        this.openManual();
      });
    }

    if (this.manualCloseBtn) {
      this.manualCloseBtn.addEventListener('click', () => {
        this.closeManual();
      });
    }

    if (this.manualDoneBtn) {
      this.manualDoneBtn.addEventListener('click', () => {
        this.closeManual();
      });
    }

    if (this.manualOverlayEl) {
      this.manualOverlayEl.addEventListener('click', () => {
        this.closeManual();
      });
    }

    // Modal Close and Action Buttons for Speedrun
    if (this.speedrunCloseBtn) this.speedrunCloseBtn.addEventListener('click', () => this.closeSpeedrunModal());
    if (this.speedrunOverlayEl) this.speedrunOverlayEl.addEventListener('click', () => this.closeSpeedrunModal());
    if (this.speedrunRetryBtn) this.speedrunRetryBtn.addEventListener('click', () => this.retrySpeedrun());

    // Modal Close and Action Buttons for Survival
    if (this.survivalCloseBtn) this.survivalCloseBtn.addEventListener('click', () => this.closeSurvivalModal());
    if (this.survivalOverlayEl) this.survivalOverlayEl.addEventListener('click', () => this.closeSurvivalModal());
    if (this.survivalRetryBtn) this.survivalRetryBtn.addEventListener('click', () => this.retrySurvival());

    // Close popovers / modals on Escape key, or Retry on Enter key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.speedrunModalEl && !this.speedrunModalEl.classList.contains('hidden')) {
          e.stopPropagation();
          this.closeSpeedrunModal();
        } else if (this.survivalModalEl && !this.survivalModalEl.classList.contains('hidden')) {
          e.stopPropagation();
          this.closeSurvivalModal();
        } else if (this.popoverEl && !this.popoverEl.classList.contains('hidden')) {
          e.stopPropagation();
          this.closePopover();
        } else if (this.manualModalEl && !this.manualModalEl.classList.contains('hidden')) {
          e.stopPropagation();
          this.closeManual();
        }
      } else if (e.key === 'Enter') {
        if (this.speedrunModalEl && !this.speedrunModalEl.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          this.retrySpeedrun();
        } else if (this.survivalModalEl && !this.survivalModalEl.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          this.retrySurvival();
        }
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

    // Mode selector buttons (Strict vs Buffer vs Speedrun vs Survival)
    document.querySelectorAll('.mode-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setAppMode(btn.dataset.mode);
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
          if (char === '\n' || char === '\r') {
            this.hiddenInput.value = '';
            return;
          }
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
        const weakList = this.stats.getWeakKeys(90, 1);
        const weakChars = weakList.map(w => w.char);
        if (weakChars.length > 0) {
          this.startDrillingWeakKeys(weakChars);
        } else {
          alert('Great job! No weak keys detected yet (accuracy >= 90%). Keep typing to build more data!');
        }
      });
    }
  }

  startDrillingWeakKeys(weakChars) {
    // Switch to weak preset pill
    document.querySelectorAll('.preset-pill').forEach(b => {
      if (b.dataset.preset === 'weak') b.classList.add('active');
      else b.classList.remove('active');
    });

    this.customPanel.classList.add('hidden');
    this.generator.setPreset('weak');
    this.generator.setWeakChars(weakChars);

    // Update custom toggle buttons in case user opens Custom drawer later
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

  setAppMode(mode) {
    this.currentMode = mode;

    document.querySelectorAll('.mode-pill').forEach(b => {
      if (b.dataset.mode === mode) b.classList.add('active');
      else b.classList.remove('active');
    });

    document.body.classList.remove('mode-speedrun', 'mode-survival');
    const targetHintBar = document.getElementById('target-hint-bar');

    if (this.speedrunBanner) this.speedrunBanner.classList.add('hidden');
    if (this.survivalBanner) this.survivalBanner.classList.add('hidden');
    if (this.speedrunModalEl) this.speedrunModalEl.classList.add('hidden');
    if (this.survivalModalEl) this.survivalModalEl.classList.add('hidden');

    this.speedrunEngine.stop();
    this.survivalEngine.stop();
    this.trainer.resume();

    if (mode === 'speedrun') {
      document.body.classList.add('mode-speedrun');
      if (targetHintBar) targetHintBar.classList.add('hidden');
      if (this.speedrunBanner) this.speedrunBanner.classList.remove('hidden');
      if (this.speedrunBestBadge) this.speedrunBestBadge.textContent = this.speedrunEngine.bestScore;
      this.speedrunEngine.start();
      this.trainer.setMode('speedrun');
    } else if (mode === 'survival') {
      document.body.classList.add('mode-survival');
      if (targetHintBar) targetHintBar.classList.add('hidden');
      if (this.survivalBanner) this.survivalBanner.classList.remove('hidden');
      if (this.survivalBestBadge) this.survivalBestBadge.textContent = this.survivalEngine.bestWave;
      this.survivalEngine.start();
      this.trainer.setMode('survival');
      this.survivalEngine.setSequence(this.trainer.currentSequence);
    } else {
      const currentGuideMode = localStorage.getItem('touchshift_guide_mode') || 'full';
      if (currentGuideMode !== 'hidden' && currentGuideMode !== 'zen') {
        if (targetHintBar) targetHintBar.classList.remove('hidden');
      }
      this.trainer.setMode(mode);
    }

    this.focusInput();
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

      // Ghost racer indicator in Survival mode
      if (this.currentMode === 'survival' && this.survivalEngine && this.survivalEngine.ghostActive) {
        if (index === this.survivalEngine.ghostIndex) {
          slot.classList.add('ghost-active');
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

    if (this.currentMode === 'speedrun') {
      this.speedrunEngine.recordKey(true);
    } else if (this.currentMode === 'survival') {
      this.survivalEngine.onPlayerKeyAdvance();
    }

    this.updateHUD();
  }

  handleCharMistake({ expectedChar, typedChar, index }) {
    this.audio.playErrorSound();
    this.stats.recordCharMistake(expectedChar);

    if (this.currentMode === 'speedrun') {
      this.speedrunEngine.recordKey(false);
    } else if (this.currentMode === 'survival') {
      this.survivalEngine.onPlayerMistake();
      // Ensure ghost starts typing even if player's first attempt is a mistake
      if (!this.survivalEngine.ghostActive && this.survivalEngine.ghostState === 'waiting') {
        this.survivalEngine.onFirstPlayerKey();
      }
    }

    this.updateHUD();
  }

  handleSequenceComplete({ sequence, length, timeSpentMs }) {
    this.audio.playSuccessChime();
    this.stats.recordSequenceComplete();

    if (this.currentMode === 'survival') {
      this.survivalEngine.onPlayerSequenceComplete();
    }

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
    if (this.currentMode === 'survival') {
      this.survivalEngine.setSequence(this.trainer.currentSequence);
    }
    this.updateHUD();
  }

  // --- Speedrun Mode Methods ---
  handleSpeedrunTick({ remainingMs, secondsFormatted, totalKeysTyped, progressRatio, hasStarted }) {
    if (this.speedrunTimerEl) {
      this.speedrunTimerEl.textContent = `${secondsFormatted}s`;
      const secondsNum = remainingMs / 1000;
      if (secondsNum <= 5) {
        this.speedrunTimerEl.classList.add('critical-warning');
        this.speedrunTimerEl.classList.remove('urgent-warning');
      } else if (secondsNum <= 15) {
        this.speedrunTimerEl.classList.add('urgent-warning');
        this.speedrunTimerEl.classList.remove('critical-warning');
      } else {
        this.speedrunTimerEl.classList.remove('urgent-warning', 'critical-warning');
      }
    }
    if (this.speedrunProgressFill) {
      this.speedrunProgressFill.style.width = `${Math.round(progressRatio * 100)}%`;
    }
    if (this.speedrunKeysBadge) {
      this.speedrunKeysBadge.textContent = `${totalKeysTyped} key${totalKeysTyped === 1 ? '' : 's'}`;
    }
    if (this.speedrunStatusHint) {
      this.speedrunStatusHint.textContent = hasStarted ? 'Sprint in progress!' : 'Type any key to start';
    }
  }

  handleSpeedrunComplete(results) {
    this.audio.playGameOver();
    this.trainer.pause();

    if (this.speedrunResultKeys) this.speedrunResultKeys.textContent = results.totalKeysTyped;
    if (this.speedrunResultCpm) this.speedrunResultCpm.textContent = results.cpm;
    if (this.speedrunResultWpm) this.speedrunResultWpm.textContent = results.wpm;
    if (this.speedrunResultAcc) this.speedrunResultAcc.textContent = `${results.accuracy}%`;
    if (this.speedrunResultBest) this.speedrunResultBest.textContent = results.bestScore;

    if (this.speedrunNewRecord) {
      if (results.isNewBest && results.totalKeysTyped > 0) {
        this.speedrunNewRecord.classList.remove('hidden');
      } else {
        this.speedrunNewRecord.classList.add('hidden');
      }
    }

    if (this.speedrunModalEl) {
      this.speedrunModalEl.classList.remove('hidden');
    }
  }

  closeSpeedrunModal() {
    this.retrySpeedrun();
  }

  retrySpeedrun() {
    if (this.speedrunModalEl) this.speedrunModalEl.classList.add('hidden');
    this.speedrunEngine.start();
    this.trainer.nextSequence();
    setTimeout(() => {
      this.trainer.resume();
      this.focusInput();
    }, 60);
  }

  // --- Survival Mode Methods ---
  handleGhostStep({ ghostIndex }) {
    this.updateGhostSlot(ghostIndex);
  }

  updateGhostSlot(ghostIndex) {
    if (!this.sequenceDisplayEl) return;
    const slots = this.sequenceDisplayEl.querySelectorAll('.char-slot');
    slots.forEach((slot, idx) => {
      if (idx === ghostIndex && this.currentMode === 'survival' && this.survivalEngine.ghostActive) {
        slot.classList.add('ghost-active');
      } else {
        slot.classList.remove('ghost-active');
      }
    });
  }

  handleGhostOvertake({ remainingLives, wave }) {
    this.audio.playGhostOvertake();
    this.updateHearts(remainingLives, remainingLives);

    if (remainingLives > 0) {
      if (this.flowFeedbackEl) {
        this.flowFeedbackEl.textContent = 'Ghost overtook you! -1 Life';
        this.flowFeedbackEl.classList.add('flash-error');
        setTimeout(() => {
          this.flowFeedbackEl.textContent = '';
          this.flowFeedbackEl.classList.remove('flash-error');
        }, 1200);
      }

      // Reset sequence: Ghost only starts after player hits first key!
      this.trainer.resetCurrentSequence();
      this.survivalEngine.setSequence(this.trainer.currentSequence);
    }
  }

  handleLifeLost({ remainingLives, reason }) {
    this.audio.playHeartLost();
    this.updateHearts(remainingLives, remainingLives);
  }

  handleWaveComplete({ clearedWave, nextWave, newGhostSpeed }) {
    this.audio.playGameWonRound();
    if (this.survivalWaveValEl) this.survivalWaveValEl.textContent = `Wave ${nextWave}`;
    if (this.ghostSpeedNumEl) this.ghostSpeedNumEl.textContent = `${newGhostSpeed} CPM`;

    if (this.flowFeedbackEl) {
      this.flowFeedbackEl.textContent = `Wave ${clearedWave} Cleared! 🔥`;
      this.flowFeedbackEl.classList.add('flash-success');
      setTimeout(() => {
        this.flowFeedbackEl.textContent = '';
        this.flowFeedbackEl.classList.remove('flash-success');
      }, 900);
    }
  }

  handleSurvivalGameOver(results) {
    this.audio.playGameOver();
    this.trainer.pause();

    if (this.survivalResultWaves) this.survivalResultWaves.textContent = results.wavesSurvived;
    if (this.survivalResultKeys) this.survivalResultKeys.textContent = results.totalKeysTyped;
    if (this.survivalResultSpeed) this.survivalResultSpeed.textContent = `${results.finalGhostSpeed} CPM`;
    if (this.survivalResultErrors) this.survivalResultErrors.textContent = results.totalErrors;
    if (this.survivalResultBest) this.survivalResultBest.textContent = results.bestWave;

    if (this.survivalCauseText) {
      if (results.cause === 'ghost_overtake') {
        this.survivalCauseText.textContent = 'The ghost was faster and depleted your last life.';
      } else {
        this.survivalCauseText.textContent = 'You made 3 mistakes and ran out of lives.';
      }
    }

    if (this.survivalNewRecord) {
      if (results.isNewBest && results.wavesSurvived > 0) {
        this.survivalNewRecord.classList.remove('hidden');
      } else {
        this.survivalNewRecord.classList.add('hidden');
      }
    }

    if (this.survivalModalEl) {
      this.survivalModalEl.classList.remove('hidden');
    }
  }

  closeSurvivalModal() {
    this.retrySurvival();
  }

  retrySurvival() {
    if (this.survivalModalEl) this.survivalModalEl.classList.add('hidden');
    this.survivalEngine.start();
    this.trainer.nextSequence();
    this.survivalEngine.setSequence(this.trainer.currentSequence);
    setTimeout(() => {
      this.trainer.resume();
      this.focusInput();
    }, 60);
  }

  updateHearts(lives, shakeIdx = -1) {
    if (!this.survivalHeartsEl) return;
    const hearts = this.survivalHeartsEl.querySelectorAll('.survival-heart');
    hearts.forEach((heart, idx) => {
      if (idx < lives) {
        heart.classList.add('active');
        heart.classList.remove('lost');
        heart.textContent = '❤️';
      } else {
        heart.classList.remove('active');
        heart.classList.add('lost');
        heart.textContent = '💔';
      }

      if (idx === shakeIdx) {
        heart.classList.add('shaking');
        setTimeout(() => heart.classList.remove('shaking'), 400);
      }
    });
  }

  handleSurvivalStateUpdate(state) {
    this.updateHearts(state.lives);
    if (this.survivalWaveValEl) this.survivalWaveValEl.textContent = `Wave ${state.wave}`;
    if (this.ghostSpeedNumEl) this.ghostSpeedNumEl.textContent = `${state.ghostSpeedCPM} CPM`;

    if (this.ghostStatusTextEl) {
      if (state.ghostState === 'waiting') {
        this.ghostStatusTextEl.textContent = 'Ghost waiting for first key...';
      } else if (state.ghostState === 'racing') {
        this.ghostStatusTextEl.textContent = 'Ghost is racing!';
      } else if (state.ghostState === 'overtook') {
        this.ghostStatusTextEl.textContent = 'Ghost overtook you!';
      }
    }

    if (this.survivalGhostPill) {
      if (state.ghostState === 'racing') {
        this.survivalGhostPill.classList.add('racing');
      } else {
        this.survivalGhostPill.classList.remove('racing');
      }
    }
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
