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

    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.bestStreak = data.bestStreak || 0;
        this.perCharStats = data.perCharStats || {};
      }
    } catch (e) {
      console.warn('Failed to load stats from localStorage:', e);
    }
  }

  save() {
    try {
      const data = {
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
    localStorage.removeItem(STORAGE_KEY);
  }

  recordCharAdvance(char) {
    if (!this.sessionStartTime) {
      this.sessionStartTime = performance.now();
    }

    const now = performance.now();
    this.totalCharsTyped++;
    this.recentTypedTimestamps.push(now);

    // Filter rolling window (last 15 seconds)
    const cutoff = now - 15000;
    this.recentTypedTimestamps = this.recentTypedTimestamps.filter(t => t > cutoff);

    // Per-char stats
    if (!this.perCharStats[char]) {
      this.perCharStats[char] = { attempts: 0, errors: 0 };
    }
    this.perCharStats[char].attempts++;

    this.save();
  }

  recordCharMistake(expectedChar) {
    this.totalErrors++;
    this.currentStreak = 0;

    if (!this.perCharStats[expectedChar]) {
      this.perCharStats[expectedChar] = { attempts: 0, errors: 0 };
    }
    this.perCharStats[expectedChar].errors++;

    this.save();
  }

  recordSequenceComplete() {
    this.completedSequences++;
    this.currentStreak++;

    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak;
    }

    this.save();
  }

  recordSkip() {
    this.currentStreak = 0;
  }

  getCPM() {
    if (this.recentTypedTimestamps.length < 2) {
      return 0;
    }
    const now = performance.now();
    const oldest = this.recentTypedTimestamps[0];
    const durationMin = (now - oldest) / 60000;

    if (durationMin <= 0.001) return 0;
    return Math.round(this.recentTypedTimestamps.length / durationMin);
  }

  getWPM() {
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
        const acc = Math.round(((stat.attempts - stat.errors) / stat.attempts) * 100);
        if (acc < thresholdAcc || stat.errors > 0) {
          weakList.push({
            char,
            attempts: stat.attempts,
            errors: stat.errors,
            accuracy: Math.max(0, acc)
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
        ? Math.max(0, Math.round(((stat.attempts - stat.errors) / stat.attempts) * 100))
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
    const totalSecs = Math.floor((performance.now() - this.sessionStartTime) / 1000);
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }
}
