import assert from 'node:assert';
import { PRESETS, SequenceGenerator } from '../src/engine/generator.js';
import { KEY_DEFINITIONS, getCharMeta } from '../src/components/keyboardGuide.js';
import { StatsTracker } from '../src/engine/stats.js';

console.log('--- Running Automated Unit Tests for TouchShift Engine ---');

// Test 1: Presets contain required characters
console.log('Test 1: Verifying character presets...');
const enShiftChars = PRESETS['en-shift'].chars;
const ruShiftChars = PRESETS['ru-shift'].chars;
const numbersChars = PRESETS['numbers'].chars;

assert(enShiftChars.includes('!'), 'EN shift must contain !');
assert(enShiftChars.includes('@'), 'EN shift must contain @');
assert(enShiftChars.includes('#'), 'EN shift must contain #');
assert(enShiftChars.includes('$'), 'EN shift must contain $');
assert(enShiftChars.includes('%'), 'EN shift must contain %');
assert(enShiftChars.includes('^'), 'EN shift must contain ^');
assert(enShiftChars.includes('&'), 'EN shift must contain &');
assert(enShiftChars.includes('*'), 'EN shift must contain *');
assert(enShiftChars.includes('('), 'EN shift must contain (');
assert(enShiftChars.includes(')'), 'EN shift must contain )');
assert(enShiftChars.includes('_'), 'EN shift must contain _');
assert(enShiftChars.includes('+'), 'EN shift must contain +');

// Russian Shift layer specific characters: !"№;%:?*()_+
assert(ruShiftChars.includes('!'), 'RU shift must contain !');
assert(ruShiftChars.includes('"'), 'RU shift must contain "');
assert(ruShiftChars.includes('№'), 'RU shift must contain №');
assert(ruShiftChars.includes(';'), 'RU shift must contain ;');
assert(ruShiftChars.includes('%'), 'RU shift must contain %');
assert(ruShiftChars.includes(':'), 'RU shift must contain :');
assert(ruShiftChars.includes('?'), 'RU shift must contain ?');
assert(ruShiftChars.includes('*'), 'RU shift must contain *');
assert(ruShiftChars.includes('('), 'RU shift must contain (');
assert(ruShiftChars.includes(')'), 'RU shift must contain )');
assert(ruShiftChars.includes('_'), 'RU shift must contain _');
assert(ruShiftChars.includes('+'), 'RU shift must contain +');

console.log('✓ Presets test passed.');

// Test 2: Sequence Generator generates lengths between 3 and 6 characters
console.log('Test 2: Verifying sequence lengths between 3 and 6...');
const gen = new SequenceGenerator();
gen.setLengthConfig('3-6');

const lengthCounts = { 3: 0, 4: 0, 5: 0, 6: 0 };
for (let i = 0; i < 200; i++) {
  const seq = gen.generate();
  assert(seq.length >= 3 && seq.length <= 6, `Generated length ${seq.length} must be between 3 and 6`);
  assert(!seq.includes(' '), 'Generated sequence must not contain spaces');
  lengthCounts[seq.length]++;
}
assert(lengthCounts[3] > 0 && lengthCounts[4] > 0 && lengthCounts[5] > 0 && lengthCounts[6] > 0, 'All lengths 3-6 should be sampled');
console.log(`✓ Length distribution over 200 iterations: 3=${lengthCounts[3]}, 4=${lengthCounts[4]}, 5=${lengthCounts[5]}, 6=${lengthCounts[6]}`);

// Test 3: RU Shift generation
console.log('Test 3: Testing Cyrillic Shift preset generation...');
gen.setPreset('ru-shift');
let seenRuSpecific = false;
for (let i = 0; i < 50; i++) {
  const seq = gen.generate();
  for (const char of seq) {
    assert(ruShiftChars.includes(char), `Character ${char} must be in RU shift set`);
    if (['№', ';', ':', '?', '"'].includes(char)) {
      seenRuSpecific = true;
    }
  }
}
assert(seenRuSpecific, 'RU shift generation must include Cyrillic-specific symbols like №, ;, :, ?, "');
console.log('✓ Cyrillic Shift layer test passed.');

// Test 4: Keyboard Finger and Shift Hand Mapping
console.log('Test 4: Verifying Keyboard Guide finger and Shift mapping...');
// Left pinky: 1, !
const meta1 = getCharMeta('1');
assert.strictEqual(meta1.finger, 'pinky');
assert.strictEqual(meta1.hand, 'left');
assert.strictEqual(meta1.isShift, false);

const metaExcl = getCharMeta('!');
assert.strictEqual(metaExcl.finger, 'pinky');
assert.strictEqual(metaExcl.hand, 'left');
assert.strictEqual(metaExcl.shiftHand, 'right'); // Left hand key -> Right Shift

// Russian №: Key 3 (Left Middle) -> Right Shift
const metaNo = getCharMeta('№');
assert.strictEqual(metaNo.finger, 'middle');
assert.strictEqual(metaNo.hand, 'left');
assert.strictEqual(metaNo.shiftHand, 'right');

// Russian : (colon on key 6: Right Index) -> Left Shift
const metaColon = getCharMeta(':');
assert.strictEqual(metaColon.finger, 'index');
assert.strictEqual(metaColon.hand, 'right');
assert.strictEqual(metaColon.shiftHand, 'left');

// English ^ (caret on key 6: Right Index) -> Left Shift
const metaCaret = getCharMeta('^');
assert.strictEqual(metaCaret.finger, 'index');
assert.strictEqual(metaCaret.hand, 'right');
assert.strictEqual(metaCaret.shiftHand, 'left');

// Russian ? (question mark on key 7: Right Index) -> Left Shift
const metaQuestion = getCharMeta('?');
assert.strictEqual(metaQuestion.finger, 'index');
assert.strictEqual(metaQuestion.hand, 'right');
assert.strictEqual(metaQuestion.shiftHand, 'left');

// English & (ampersand on key 7: Right Index) -> Left Shift
const metaAmp = getCharMeta('&');
assert.strictEqual(metaAmp.finger, 'index');
assert.strictEqual(metaAmp.hand, 'right');
assert.strictEqual(metaAmp.shiftHand, 'left');

console.log('✓ Keyboard Guide and Shift hand rules verified perfectly.');

// Test 5: Stats Engine accuracy, streak, and weak keys
console.log('Test 5: Testing StatsTracker...');
// Mock localStorage for Node environment
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; }
};

const stats = new StatsTracker();
stats.recordCharAdvance('^');
stats.recordCharAdvance('^');
stats.recordCharMistake('^'); // 2 correct, 1 error = 67% accuracy
stats.recordSequenceComplete();

assert.strictEqual(stats.currentStreak, 1);
assert.strictEqual(stats.totalCharsTyped, 2);
assert.strictEqual(stats.totalErrors, 1);
assert.strictEqual(stats.getAccuracy(), 67);

const weak = stats.getWeakKeys(85, 1);
assert(weak.some(w => w.char === '^'), '^ must be detected as weak key');
console.log('✓ Stats engine test passed.');

console.log('\n=== ALL 5 ENGINE TEST SUITES PASSED CLEANLY! ===\n');
