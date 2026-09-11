/**
 * Speedrun Mode Engine
 * Manages a 60-second countdown sprint, starting on the first keypress.
 * Tracks total keys typed, accuracy, CPM, and saves personal best records.
 */

const STORAGE_KEY_SPEEDRUN_BEST = 'touchshift_speedrun_best';

export class SpeedrunEngine {
  constructor({ onTick, onWarningTick, onComplete } = {}) {
    this.durationMs = 60000;
    this.remainingMs = this.durationMs;
    this.hasStarted = false;
    this.isActive = false;

    this.totalKeysTyped = 0;
    this.totalErrors = 0;
    this.startTimestamp = null;
    this.timerId = null;
    this.lastWarnSecond = null;

    this.onTick = onTick || (() => {});
    this.onWarningTick = onWarningTick || (() => {});
    this.onComplete = onComplete || (() => {});

    this.bestScore = this.loadBestScore();
  }

  loadBestScore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SPEEDRUN_BEST);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  saveBestScore(score) {
    if (score > this.bestScore) {
      this.bestScore = score;
      try {
        localStorage.setItem(STORAGE_KEY_SPEEDRUN_BEST, String(score));
      } catch (e) {
        console.warn('Failed to save speedrun best score:', e);
      }
      return true;
    }
    return false;
  }

  reset() {
    this.stopTimer();
    this.remainingMs = this.durationMs;
    this.hasStarted = false;
    this.isActive = true;
    this.totalKeysTyped = 0;
    this.totalErrors = 0;
    this.startTimestamp = null;
    this.lastWarnSecond = null;

    this.onTick({
      remainingMs: this.remainingMs,
      secondsFormatted: '60.0',
      totalKeysTyped: 0,
      cpm: 0,
      wpm: 0,
      accuracy: 100,
      progressRatio: 1.0,
      hasStarted: false
    });
  }

  start() {
    this.reset();
  }

  stop() {
    this.stopTimer();
    this.isActive = false;
    this.hasStarted = false;
  }

  onFirstKeypress() {
    if (!this.isActive || this.hasStarted) return;
    this.hasStarted = true;
    this.startTimestamp = performance.now();
    this.lastWarnSecond = null;

    this.timerId = setInterval(() => this.updateTick(), 50);
  }

  recordKey(isCorrect) {
    if (!this.isActive) return;

    if (!this.hasStarted) {
      this.onFirstKeypress();
    }

    if (isCorrect) {
      this.totalKeysTyped++;
    } else {
      this.totalErrors++;
    }

    this.emitTick();
  }

  updateTick() {
    if (!this.hasStarted || !this.isActive) return;

    const elapsed = performance.now() - this.startTimestamp;
    this.remainingMs = Math.max(0, this.durationMs - elapsed);

    const secondsLeft = Math.ceil(this.remainingMs / 1000);
    // Warning tick at 5, 4, 3, 2, 1
    if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== this.lastWarnSecond) {
      this.lastWarnSecond = secondsLeft;
      this.onWarningTick(secondsLeft);
    }

    this.emitTick();

    if (this.remainingMs <= 0) {
      this.finish();
    }
  }

  emitTick() {
    const elapsedSeconds = this.hasStarted
      ? Math.max(0.1, (performance.now() - this.startTimestamp) / 1000)
      : 0;

    const cpm = elapsedSeconds > 0 ? Math.round((this.totalKeysTyped / elapsedSeconds) * 60) : 0;
    const wpm = Math.round(cpm / 5);
    const totalAttempts = this.totalKeysTyped + this.totalErrors;
    const accuracy = totalAttempts > 0 ? Math.round((this.totalKeysTyped / totalAttempts) * 100) : 100;
    const progressRatio = Math.max(0, Math.min(1, this.remainingMs / this.durationMs));

    const totalSeconds = (this.remainingMs / 1000).toFixed(1);

    this.onTick({
      remainingMs: this.remainingMs,
      secondsFormatted: totalSeconds,
      totalKeysTyped: this.totalKeysTyped,
      totalErrors: this.totalErrors,
      cpm,
      wpm,
      accuracy,
      progressRatio,
      hasStarted: this.hasStarted
    });
  }

  finish() {
    this.stopTimer();
    this.isActive = false;

    const totalAttempts = this.totalKeysTyped + this.totalErrors;
    const accuracy = totalAttempts > 0 ? Math.round((this.totalKeysTyped / totalAttempts) * 100) : 100;
    const cpm = Math.round(this.totalKeysTyped); // 1 minute exact!
    const wpm = Math.round(cpm / 5);
    const isNewBest = this.saveBestScore(this.totalKeysTyped);

    this.onComplete({
      totalKeysTyped: this.totalKeysTyped,
      totalErrors: this.totalErrors,
      accuracy,
      cpm,
      wpm,
      isNewBest,
      bestScore: this.bestScore
    });
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
