/**
 * Keyboard Guide Component
 * Renders top-row keys with dual EN/RU labels, finger coding, and dynamic Shift indicators.
 */

export const KEY_DEFINITIONS = [
  {
    id: 'key-backquote',
    base: '`',
    enShift: '~',
    ruShift: 'Ё',
    finger: 'pinky',
    hand: 'left',
    shiftHand: 'right'
  },
  {
    id: 'key-1',
    base: '1',
    enShift: '!',
    ruShift: '!',
    finger: 'pinky',
    hand: 'left',
    shiftHand: 'right'
  },
  {
    id: 'key-2',
    base: '2',
    enShift: '@',
    ruShift: '"',
    finger: 'ring',
    hand: 'left',
    shiftHand: 'right'
  },
  {
    id: 'key-3',
    base: '3',
    enShift: '#',
    ruShift: '№',
    finger: 'middle',
    hand: 'left',
    shiftHand: 'right'
  },
  {
    id: 'key-4',
    base: '4',
    enShift: '$',
    ruShift: ';',
    finger: 'index',
    hand: 'left',
    shiftHand: 'right'
  },
  {
    id: 'key-5',
    base: '5',
    enShift: '%',
    ruShift: '%',
    finger: 'index',
    hand: 'left',
    shiftHand: 'right'
  },
  {
    id: 'key-6',
    base: '6',
    enShift: '^',
    ruShift: ':',
    finger: 'index',
    hand: 'right',
    shiftHand: 'left'
  },
  {
    id: 'key-7',
    base: '7',
    enShift: '&',
    ruShift: '?',
    finger: 'index',
    hand: 'right',
    shiftHand: 'left'
  },
  {
    id: 'key-8',
    base: '8',
    enShift: '*',
    ruShift: '*',
    finger: 'middle',
    hand: 'right',
    shiftHand: 'left'
  },
  {
    id: 'key-9',
    base: '9',
    enShift: '(',
    ruShift: '(',
    finger: 'ring',
    hand: 'right',
    shiftHand: 'left'
  },
  {
    id: 'key-0',
    base: '0',
    enShift: ')',
    ruShift: ')',
    finger: 'pinky',
    hand: 'right',
    shiftHand: 'left'
  },
  {
    id: 'key-minus',
    base: '-',
    enShift: '_',
    ruShift: '_',
    finger: 'pinky',
    hand: 'right',
    shiftHand: 'left'
  },
  {
    id: 'key-equal',
    base: '=',
    enShift: '+',
    ruShift: '+',
    finger: 'pinky',
    hand: 'right',
    shiftHand: 'left'
  },
  {
    id: 'key-bspace',
    base: '⌫',
    enShift: '',
    ruShift: '',
    finger: 'pinky',
    hand: 'right',
    shiftHand: null
  }
];

// Map character to its definition and typing metadata
export function getCharMeta(char) {
  for (const def of KEY_DEFINITIONS) {
    if (char === def.base) {
      return {
        keyId: def.id,
        char,
        isShift: false,
        finger: def.finger,
        hand: def.hand,
        shiftHand: null,
        fingerName: `${capitalize(def.hand)} ${capitalize(def.finger)}`,
        hint: `${capitalize(def.hand)} ${capitalize(def.finger)} (no shift)`
      };
    }
    if (char === def.enShift || char === def.ruShift) {
      const isRu = (char === def.ruShift && char !== def.enShift);
      return {
        keyId: def.id,
        char,
        isShift: true,
        isRu,
        finger: def.finger,
        hand: def.hand,
        shiftHand: def.shiftHand,
        fingerName: `${capitalize(def.hand)} ${capitalize(def.finger)}`,
        hint: `${capitalize(def.hand)} ${capitalize(def.finger)} + ${capitalize(def.shiftHand)} Shift`
      };
    }
  }
  return null;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export class KeyboardGuide {
  constructor({ containerEl, lShiftEl, rShiftEl, hintFingerEl, hintShiftEl }) {
    this.containerEl = containerEl;
    this.lShiftEl = lShiftEl;
    this.rShiftEl = rShiftEl;
    this.hintFingerEl = hintFingerEl;
    this.hintShiftEl = hintShiftEl;
    this.sectionEl = document.getElementById('keyboard-section');

    this.mode = 'full'; // 'full' | 'ghost' | 'hidden'
    this.keyElements = new Map();

    this.render();
  }

  render() {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = '';

    KEY_DEFINITIONS.forEach(def => {
      const keyEl = document.createElement('div');
      keyEl.className = `v-key finger-${def.finger}`;
      keyEl.id = def.id;

      if (def.id === 'key-bspace') {
        keyEl.innerHTML = `
          <div class="v-key-symbols"></div>
          <div class="v-key-base">${def.base}</div>
        `;
      } else {
        keyEl.innerHTML = `
          <div class="v-key-symbols">
            <span class="v-key-shift-en" title="EN Shift">${def.enShift}</span>
            <span class="v-key-shift-ru" title="RU Shift">${def.ruShift !== def.enShift ? def.ruShift : ''}</span>
          </div>
          <div class="v-key-base">${def.base}</div>
        `;
      }

      this.containerEl.appendChild(keyEl);
      this.keyElements.set(def.id, keyEl);
    });
  }

  setMode(mode) {
    this.mode = mode;
    if (!this.sectionEl) return;

    this.sectionEl.classList.remove('mode-ghost', 'mode-hidden');
    const hintBar = document.getElementById('target-hint-bar');

    if (mode === 'ghost') {
      this.sectionEl.classList.add('mode-ghost');
      if (hintBar) hintBar.classList.remove('hidden');
    } else if (mode === 'hidden') {
      this.sectionEl.classList.add('mode-hidden');
      if (hintBar) hintBar.classList.add('hidden');
    } else {
      if (hintBar) hintBar.classList.remove('hidden');
    }
  }

  highlight(char) {
    this.clearHighlight();
    if (!char) return;

    const meta = getCharMeta(char);
    if (!meta) return;

    // Highlight key
    const targetKeyEl = this.keyElements.get(meta.keyId);
    if (targetKeyEl) {
      targetKeyEl.classList.add('active-target');
    }

    // Highlight shift key
    if (meta.isShift && meta.shiftHand) {
      if (meta.shiftHand === 'left' && this.lShiftEl) {
        this.lShiftEl.classList.add('active-shift');
      } else if (meta.shiftHand === 'right' && this.rShiftEl) {
        this.rShiftEl.classList.add('active-shift');
      }
    }

    // Update hint badges
    if (this.hintFingerEl) {
      this.hintFingerEl.textContent = meta.fingerName;
      this.hintFingerEl.className = `hint-pill finger-${meta.finger}`;
    }

    if (this.hintShiftEl) {
      if (meta.isShift) {
        this.hintShiftEl.textContent = `Hold ${capitalize(meta.shiftHand)} Shift`;
        this.hintShiftEl.style.display = 'inline-block';
      } else {
        this.hintShiftEl.textContent = 'No Shift Needed';
        this.hintShiftEl.style.display = 'inline-block';
      }
    }
  }

  clearHighlight() {
    this.keyElements.forEach(el => el.classList.remove('active-target'));
    if (this.lShiftEl) this.lShiftEl.classList.remove('active-shift');
    if (this.rShiftEl) this.rShiftEl.classList.remove('active-shift');
  }
}
