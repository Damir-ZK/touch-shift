/**
 * Statistics & Analytics Engine
 * Tracks live CPM, WPM, accuracy, streak, and per-character miss rates.
 */

const STORAGE_KEY = 'touchshift_stats_v1';

export class StatsTracker {
  constructor() {
    this.sessionStartTime = null;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.completedSequences = 0;
    this.totalCharsTyped = 0;
    this.totalErrors = 0;
    this.perCharStats = {}; // { [char]: { attempts: number, errors: number } }

    // Rolling timestamps of characters typed for CPM calculation: [{ time: number }]
    this.recentTypedTimestamps = [];

    // CPM freezing state
    this.isFrozen = true;
    this.freezeStartTime = null;
    this.frozenCPM = 0;
    this.frozenWPM = 0;
    this.lastCalculatedCPM = 0;

    this.load();
  }

  freeze(fixedCPM = null) {
    const now = performance.now();

    if (this.isFrozen) {
      if (fixedCPM !== null) {
        this.frozenCPM = fixedCPM;
        this.frozenWPM = Math.round(fixedCPM / 5);
        this.lastCalculatedCPM = fixedCPM;
      }
      return;
    }

    this.isFrozen = true;
    this.freezeStartTime = now;

    if (fixedCPM !== null) {
      this.frozenCPM = fixedCPM;
      this.frozenWPM = Math.round(fixedCPM / 5);
      this.lastCalculatedCPM = fixedCPM;
    } else {
      const liveCPM = this.calculateLiveCPM(now);
      this.frozenCPM = liveCPM > 0 ? liveCPM : (this.lastCalculatedCPM || 0);
      this.frozenWPM = Math.round(this.frozenCPM / 5);
    }
  }

  unfreeze() {
    if (!this.isFrozen) return;

    const now = performance.now();
    const pauseDuration = this.freezeStartTime ? Math.max(0, now - this.freezeStartTime) : 0;

    if (pauseDuration > 0) {
      this.recentTypedTimestamps = this.recentTypedTimestamps.map(t => t + pauseDuration);

      if (this.sessionStartTime) {
        this.sessionStartTime += pauseDuration;
      }
    }

    this.isFrozen = false;
    this.freezeStartTime = null;
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.bestStreak = data.bestStreak || 0;
        this.perCharStats = data.perCharStats || {};

        // Migrate legacy v1 data where mistakes did not increment attempts
        if (!data.version || data.version < 2) {
          for (const stat of Object.values(this.perCharStats)) {
            if (stat) {
              stat.attempts = (stat.attempts || 0) + (stat.errors || 0);
            }
          }
          this.save();
        }

        // Safety clamp: attempts should never be less than errors
        for (const stat of Object.values(this.perCharStats)) {
          if (stat && stat.attempts < stat.errors) {
            stat.attempts = stat.errors;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load stats from localStorage:', e);
    }
  }

  save() {
    try {
      const data = {
        version: 2,
        bestStreak: this.bestStreak,
        perCharStats: this.perCharStats
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save stats to localStorage:', e);
    }
  }

  reset() {
    this.sessionStartTime = null;
    this.currentStreak = 0;
    this.bestStreak = 0;
    this.completedSequences = 0;
    this.totalCharsTyped = 0;
    this.totalErrors = 0;
    this.perCharStats = {};
    this.recentTypedTimestamps = [];
    this.isFrozen = true;
    this.freezeStartTime = null;
    this.frozenCPM = 0;
    this.frozenWPM = 0;
    this.lastCalculatedCPM = 0;
    localStorage.removeItem(STORAGE_KEY);
  }

  recordCharAdvance(char) {
    if (!char) return;

    if (this.isFrozen) {
      this.unfreeze();
    }

    if (!this.sessionStartTime) {
      this.sessionStartTime = performance.now();
    }

    const now = performance.now();
    this.totalCharsTyped++;
    this.recentTypedTimestamps.push(now);

    // Filter rolling window (last 15 seconds)
    const cutoff = now - 15000;
    this.recentTypedTimestamps = this.recentTypedTimestamps.filter(t => t > cutoff);

    const currentCPM = this.calculateLiveCPM(now);
    if (currentCPM > 0) {
      this.lastCalculatedCPM = currentCPM;
    }

    // Per-char stats
    if (!this.perCharStats[char]) {
      this.perCharStats[char] = { attempts: 0, errors: 0 };
    }
    this.perCharStats[char].attempts++;

    this.save();
  }

  recordCharMistake(expectedChar) {
    if (!expectedChar) return;

    if (this.isFrozen) {
      this.unfreeze();
    }

    if (!this.sessionStartTime) {
      this.sessionStartTime = performance.now();
    }
    this.totalErrors++;
    this.currentStreak = 0;

    if (!this.perCharStats[expectedChar]) {
      this.perCharStats[expectedChar] = { attempts: 0, errors: 0 };
    }
    this.perCharStats[expectedChar].attempts++;
    this.perCharStats[expectedChar].errors++;

    this.save();
  }

  recordSequenceComplete() {
    this.completedSequences++;
    this.currentStreak++;

    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak;
    }

    const now = performance.now();
    const currentCPM = this.calculateLiveCPM(now);
    if (currentCPM > 0) {
      this.lastCalculatedCPM = currentCPM;
    }

    this.freeze();
    this.save();
  }

  recordSkip() {
    this.currentStreak = 0;
    this.freeze();
  }

  calculateLiveCPM(now = performance.now()) {
    const cutoff = now - 15000;
    this.recentTypedTimestamps = this.recentTypedTimestamps.filter(t => t > cutoff);

    if (this.recentTypedTimestamps.length < 2) {
      return 0;
    }
    const oldest = this.recentTypedTimestamps[0];
    const durationMin = (now - oldest) / 60000;

    if (durationMin <= 0.001) return this.lastCalculatedCPM || 0;
    const cpm = Math.round(this.recentTypedTimestamps.length / durationMin);
    this.lastCalculatedCPM = cpm;
    return cpm;
  }

  getCPM() {
    if (this.isFrozen) {
      return this.frozenCPM;
    }
    return this.calculateLiveCPM();
  }

  getWPM() {
    if (this.isFrozen) {
      return this.frozenWPM;
    }
    return Math.round(this.getCPM() / 5);
  }

  getAccuracy() {
    const total = this.totalCharsTyped + this.totalErrors;
    if (total === 0) return 100;
    return Math.round((this.totalCharsTyped / total) * 100);
  }

  getWeakKeys(thresholdAcc = 85, minAttempts = 2) {
    const weakList = [];
    for (const [char, stat] of Object.entries(this.perCharStats)) {
      if (stat.attempts >= minAttempts) {
        const acc = stat.attempts > 0
          ? Math.max(0, Math.min(100, Math.round(((stat.attempts - stat.errors) / stat.attempts) * 100)))
          : 100;
        if (acc < thresholdAcc) {
          weakList.push({
            char,
            attempts: stat.attempts,
            errors: stat.errors,
            accuracy: acc
          });
        }
      }
    }
    // Sort by lowest accuracy first
    return weakList.sort((a, b) => a.accuracy - b.accuracy);
  }

  getAllCharStats() {
    return Object.entries(this.perCharStats).map(([char, stat]) => {
      const accuracy = stat.attempts > 0
        ? Math.max(0, Math.min(100, Math.round(((stat.attempts - stat.errors) / stat.attempts) * 100)))
        : 100;
      return {
        char,
        attempts: stat.attempts,
        errors: stat.errors,
        accuracy
      };
    }).sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.attempts - a.attempts;
    });
  }

  getSessionDurationFormatted() {
    if (!this.sessionStartTime) return '00:00';
    const now = (this.isFrozen && this.freezeStartTime) ? this.freezeStartTime : performance.now();
    const totalSecs = Math.max(0, Math.floor((now - this.sessionStartTime) / 1000));
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }
}
