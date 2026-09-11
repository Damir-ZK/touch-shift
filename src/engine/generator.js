/**
 * Sequence Generator
 * Manages character sets, presets, and randomized sequence generation.
 */

export const PRESETS = {
  'en-shift': {
    id: 'en-shift',
    name: 'EN Shift',
    chars: ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'],
    description: 'English Shift layer characters on the number row'
  },
  'ru-shift': {
    id: 'ru-shift',
    name: 'RU Shift',
    chars: ['!', '"', '№', ';', '%', ':', '?', '*', '(', ')', '_', '+'],
    description: 'Cyrillic Shift layer characters on the number row'
  },
  'numbers': {
    id: 'numbers',
    name: 'Numbers',
    chars: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    description: 'Top row numbers and dash/equal'
  },
  'combined-en': {
    id: 'combined-en',
    name: 'Combined EN',
    chars: [
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',
      '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'
    ],
    description: 'Numbers + English Shift layer'
  },
  'combined-ru': {
    id: 'combined-ru',
    name: 'Combined RU',
    chars: [
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',
      '!', '"', '№', ';', '%', ':', '?', '*', '(', ')', '_', '+'
    ],
    description: 'Numbers + Cyrillic Shift layer'
  },
  'all': {
    id: 'all',
    name: 'All Mixed',
    chars: [
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',
      '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+',
      '"', '№', ';', ':', '?'
    ],
    description: 'All number row characters and both EN + RU Shift layers'
  }
};

export class SequenceGenerator {
  constructor() {
    this.currentPreset = 'en-shift';
    this.customChars = [...PRESETS['en-shift'].chars];
    this.lengthConfig = '3-6'; // '3-6', '3', '4', '5', '6'
  }

  setPreset(presetId) {
    if (PRESETS[presetId] || presetId === 'custom') {
      this.currentPreset = presetId;
    }
  }

  setCustomChars(chars) {
    if (Array.isArray(chars) && chars.length > 0) {
      this.customChars = [...new Set(chars)];
    }
  }

  setLengthConfig(lengthConfig) {
    this.lengthConfig = lengthConfig;
  }

  getActivePool() {
    if (this.currentPreset === 'custom') {
      return this.customChars.length > 0 ? this.customChars : PRESETS['en-shift'].chars;
    }
    return PRESETS[this.currentPreset]?.chars || PRESETS['en-shift'].chars;
  }

  determineLength() {
    if (this.lengthConfig === '3-6') {
      // Random integer between 3 and 6 inclusive
      return Math.floor(Math.random() * 4) + 3;
    }
    const parsed = parseInt(this.lengthConfig, 10);
    return !isNaN(parsed) && parsed >= 2 ? parsed : 4;
  }

  /**
   * Generates a random sequence of characters.
   * Optionally prioritizes weak keys if provided.
   * @param {Object} [weakKeyWeights] Optional map of char -> weight boost
   * @returns {string} The generated sequence
   */
  generate(weakKeyWeights = null) {
    const pool = this.getActivePool();
    const length = this.determineLength();

    if (pool.length === 0) return '!!!';
    if (pool.length === 1) return pool[0].repeat(length);

    const result = [];
    let lastChar = null;

    for (let i = 0; i < length; i++) {
      let chosenChar;
      
      // If weak keys weighting is provided
      if (weakKeyWeights && Object.keys(weakKeyWeights).length > 0) {
        chosenChar = this.sampleWeighted(pool, weakKeyWeights, lastChar);
      } else {
        // Standard random sampling without 3 in a row
        let candidates = pool;
        if (lastChar && result.length >= 2 && result[result.length - 1] === lastChar) {
          candidates = pool.filter(c => c !== lastChar);
          if (candidates.length === 0) candidates = pool;
        }
        chosenChar = candidates[Math.floor(Math.random() * candidates.length)];
      }

      result.push(chosenChar);
      lastChar = chosenChar;
    }

    return result.join('');
  }

  sampleWeighted(pool, weights, lastChar) {
    // Build weighted list
    const items = [];
    for (const char of pool) {
      const weight = weights[char] || 1;
      // Penalize immediate triple repeat
      const adjustedWeight = (char === lastChar) ? Math.max(1, weight * 0.4) : weight;
      items.push({ char, weight: adjustedWeight });
    }

    const totalWeight = items.reduce((acc, item) => acc + item.weight, 0);
    let randomVal = Math.random() * totalWeight;

    for (const item of items) {
      if (randomVal < item.weight) {
        return item.char;
      }
      randomVal -= item.weight;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }
}
