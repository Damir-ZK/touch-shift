/**
 * Survival Mode Engine
 * Manages 3 lives, ghost racer AI opponent, progressive speedup, and game over states.
 * 
 * Rules:
 * 1. 3 lives total.
 * 2. Wrong key costs 1 life.
 * 3. Ghost races alongside the player. If ghost finishes sequence first, player loses 1 life.
 * 4. Ghost strictly waits for the player's first keypress before starting to type.
 * 5. Ghost speed gradually ramps up each wave up to a reasonable cap (280 CPM).
 * 6. Losing all lives ends the game.
 */

const STORAGE_KEY_SURVIVAL_BEST = 'touchshift_survival_best';
export const MAX_LIVES = 3;
export const INITIAL_GHOST_CPM = 40;
export const SPEEDUP_PER_WAVE_CPM = 3;
export const MAX_GHOST_CPM = 280;

export class SurvivalEngine {
  constructor({
    onGhostStep,
    onGhostOvertake,
    onLifeLost,
    onWaveComplete,
    onGameOver,
    onStateUpdate
  } = {}) {
    this.lives = MAX_LIVES;
    this.wave = 1;
    this.totalKeysTyped = 0;
    this.totalErrors = 0;

    this.currentSequence = [];
    this.ghostIndex = 0;
    this.ghostActive = false;
    this.ghostState = 'waiting'; // 'waiting' | 'racing' | 'overtook' | 'finished'
    this.ghostSpeedCPM = INITIAL_GHOST_CPM;

    this.ghostTimerId = null;
    this.isActive = false;

    this.onGhostStep = onGhostStep || (() => {});
    this.onGhostOvertake = onGhostOvertake || (() => {});
    this.onLifeLost = onLifeLost || (() => {});
    this.onWaveComplete = onWaveComplete || (() => {});
    this.onGameOver = onGameOver || (() => {});
    this.onStateUpdate = onStateUpdate || (() => {});

    this.bestWave = this.loadBestWave();
  }

  loadBestWave() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SURVIVAL_BEST);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  saveBestWave(wave) {
    if (wave > this.bestWave) {
      this.bestWave = wave;
      try {
        localStorage.setItem(STORAGE_KEY_SURVIVAL_BEST, String(wave));
      } catch (e) {
        console.warn('Failed to save survival best wave:', e);
      }
      return true;
    }
    return false;
  }

  start() {
    this.stopGhostTimer();
    this.lives = MAX_LIVES;
    this.wave = 1;
    this.totalKeysTyped = 0;
    this.totalErrors = 0;
    this.ghostSpeedCPM = INITIAL_GHOST_CPM;
    this.isActive = true;
    this.ghostActive = false;
    this.ghostState = 'waiting';
    this.ghostIndex = 0;

    this.emitState();
  }

  stop() {
    this.stopGhostTimer();
    this.isActive = false;
    this.ghostActive = false;
  }

  setSequence(sequence) {
    this.stopGhostTimer();
    this.currentSequence = Array.isArray(sequence) ? sequence : Array.from(sequence || []);
    this.ghostIndex = 0;
    this.ghostActive = false;
    this.ghostState = 'waiting'; // ONLY starts after player's first key!

    this.emitState();
  }

  onFirstPlayerKey() {
    if (!this.isActive || this.ghostActive || this.ghostState !== 'waiting') return;
    if (this.currentSequence.length === 0) return;

    this.ghostActive = true;
    this.ghostState = 'racing';
    this.startGhostTimer();
    this.emitState();
  }

  startGhostTimer() {
    this.stopGhostTimer();
    // Delay between each ghost character keystroke in milliseconds
    const stepIntervalMs = Math.max(120, (60000 / this.ghostSpeedCPM));

    this.ghostTimerId = setInterval(() => {
      this.advanceGhost();
    }, stepIntervalMs);
  }

  advanceGhost() {
    if (!this.isActive || !this.ghostActive) return;

    this.ghostIndex++;

    this.onGhostStep({
      ghostIndex: this.ghostIndex,
      totalLength: this.currentSequence.length,
      ghostChar: this.currentSequence[this.ghostIndex - 1]
    });

    this.emitState();

    // If ghost finishes the sequence before the player
    if (this.ghostIndex >= this.currentSequence.length) {
      this.handleGhostOvertake();
    }
  }

  handleGhostOvertake() {
    this.stopGhostTimer();
    this.ghostActive = false;
    this.ghostState = 'overtook';

    this.lives = Math.max(0, this.lives - 1);

    this.onGhostOvertake({
      remainingLives: this.lives,
      wave: this.wave
    });

    this.emitState();

    if (this.lives <= 0) {
      this.finishGame('ghost_overtake');
    }
  }

  onPlayerMistake() {
    if (!this.isActive) return;

    this.totalErrors++;
    this.lives = Math.max(0, this.lives - 1);

    this.onLifeLost({
      remainingLives: this.lives,
      wave: this.wave,
      reason: 'mistake'
    });

    this.emitState();

    if (this.lives <= 0) {
      this.finishGame('mistakes');
    }
  }

  onPlayerKeyAdvance() {
    if (!this.isActive) return;

    // If player hits first key, start ghost!
    if (!this.ghostActive && this.ghostState === 'waiting') {
      this.onFirstPlayerKey();
    }

    this.totalKeysTyped++;
  }

  onPlayerSequenceComplete() {
    if (!this.isActive) return;

    this.stopGhostTimer();
    this.ghostActive = false;
    this.ghostState = 'finished';

    const completedWave = this.wave;
    this.wave++;

    // Speed up ghost gradually, up to reasonable cap
    this.ghostSpeedCPM = Math.min(
      MAX_GHOST_CPM,
      INITIAL_GHOST_CPM + (this.wave - 1) * SPEEDUP_PER_WAVE_CPM
    );

    this.onWaveComplete({
      clearedWave: completedWave,
      nextWave: this.wave,
      newGhostSpeed: this.ghostSpeedCPM
    });

    this.emitState();
  }

  finishGame(cause) {
    this.stopGhostTimer();
    this.isActive = false;
    this.ghostActive = false;

    const wavesSurvived = Math.max(0, this.wave - 1);
    const isNewBest = this.saveBestWave(wavesSurvived);

    this.onGameOver({
      wavesSurvived,
      totalKeysTyped: this.totalKeysTyped,
      totalErrors: this.totalErrors,
      cause, // 'mistakes' | 'ghost_overtake'
      bestWave: this.bestWave,
      isNewBest,
      finalGhostSpeed: this.ghostSpeedCPM
    });
  }

  stopGhostTimer() {
    if (this.ghostTimerId) {
      clearInterval(this.ghostTimerId);
      this.ghostTimerId = null;
    }
  }

  emitState() {
    this.onStateUpdate({
      lives: this.lives,
      maxLives: MAX_LIVES,
      wave: this.wave,
      ghostIndex: this.ghostIndex,
      ghostSpeedCPM: this.ghostSpeedCPM,
      ghostState: this.ghostState,
      ghostActive: this.ghostActive,
      sequenceLength: this.currentSequence.length
    });
  }
}
