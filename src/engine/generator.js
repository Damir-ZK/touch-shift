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
  },
  'weak': {
    id: 'weak',
    name: 'Weak Keys',
    chars: [],
    description: 'Drill weak and error-prone keys'
  }
};

export class SequenceGenerator {
  constructor() {
    this.currentPreset = 'en-shift';
    this.customChars = [...PRESETS['en-shift'].chars];
    this.weakChars = [];
    this.minLength = 3;
    this.maxLength = 6;
  }

  setPreset(presetId) {
    if (PRESETS[presetId] || presetId === 'custom' || presetId === 'weak') {
      this.currentPreset = presetId;
    }
  }

  setCustomChars(chars) {
    if (Array.isArray(chars) && chars.length > 0) {
      this.customChars = [...new Set(chars)];
    }
  }

  setWeakChars(chars) {
    if (Array.isArray(chars) && chars.length > 0) {
      this.weakChars = [...new Set(chars)];
    }
  }

  setRange(min, max) {
    const parsedMin = parseInt(min, 10);
    const parsedMax = parseInt(max, 10);
    this.minLength = Math.max(1, !isNaN(parsedMin) ? parsedMin : 3);
    this.maxLength = Math.max(this.minLength, !isNaN(parsedMax) ? parsedMax : this.minLength);
  }

  setLengthConfig(lengthConfig) {
    if (typeof lengthConfig === 'string' && lengthConfig.includes('-')) {
      const [minStr, maxStr] = lengthConfig.split('-');
      this.setRange(minStr, maxStr);
    } else {
      const fixed = parseInt(lengthConfig, 10);
      if (!isNaN(fixed)) {
        this.setRange(fixed, fixed);
      } else {
        this.setRange(3, 6);
      }
    }
  }

  getRange() {
    return { min: this.minLength, max: this.maxLength };
  }

  getActivePool() {
    if (this.currentPreset === 'weak') {
      return this.weakChars && this.weakChars.length > 0
        ? this.weakChars
        : (this.customChars.length > 0 ? this.customChars : PRESETS['en-shift'].chars);
    }
    if (this.currentPreset === 'custom') {
      return this.customChars.length > 0 ? this.customChars : PRESETS['en-shift'].chars;
    }
    return PRESETS[this.currentPreset]?.chars || PRESETS['en-shift'].chars;
  }

  determineLength() {
    if (this.minLength >= this.maxLength) {
      return this.minLength;
    }
    const range = this.maxLength - this.minLength + 1;
    return Math.floor(Math.random() * range) + this.minLength;
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
