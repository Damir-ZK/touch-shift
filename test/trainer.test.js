import assert from 'node:assert';
import { PRESETS, SequenceGenerator } from '../src/engine/generator.js';
import { KEY_DEFINITIONS, getCharMeta } from '../src/components/keyboardGuide.js';
import { StatsTracker } from '../src/engine/stats.js';
import { SpeedrunEngine } from '../src/engine/speedrunEngine.js';
import { SurvivalEngine, MAX_LIVES, INITIAL_GHOST_CPM, MAX_GHOST_CPM } from '../src/engine/survivalEngine.js';

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

// Test 6: Arbitrary Min & Max Sequence Lengths and Fixed-Length Mode
console.log('Test 6: Testing Arbitrary Min & Max and Fixed-Length generation...');
const rangeGen = new SequenceGenerator();

// Fixed length mode (min === max)
rangeGen.setRange(5, 5);
assert.strictEqual(rangeGen.minLength, 5);
assert.strictEqual(rangeGen.maxLength, 5);
for (let i = 0; i < 50; i++) {
  const seq = rangeGen.generate();
  assert.strictEqual(seq.length, 5, `When min=5 and max=5, generated sequence must always be exactly 5 chars, got ${seq.length}`);
}

// Single character fixed length (min=1, max=1)
rangeGen.setRange(1, 1);
for (let i = 0; i < 20; i++) {
  const seq = rangeGen.generate();
  assert.strictEqual(seq.length, 1, `When min=1 and max=1, generated sequence must always be 1 char, got ${seq.length}`);
}

// Arbitrary range (e.g. 2 to 8)
rangeGen.setRange(2, 8);
assert.strictEqual(rangeGen.minLength, 2);
assert.strictEqual(rangeGen.maxLength, 8);
const counts = {};
for (let i = 0; i < 300; i++) {
  const seq = rangeGen.generate();
  assert(seq.length >= 2 && seq.length <= 8, `Sequence length ${seq.length} must be between 2 and 8`);
  counts[seq.length] = (counts[seq.length] || 0) + 1;
}
for (let l = 2; l <= 8; l++) {
  assert(counts[l] > 0, `Length ${l} should be generated at least once in 300 iterations`);
}

// Clamping validation (min must be at least 1, max cannot be less than min)
rangeGen.setRange(0, -2);
assert(rangeGen.minLength >= 1, 'Min length must be clamped to at least 1');
assert(rangeGen.maxLength >= rangeGen.minLength, 'Max length must not be less than min length');

console.log('✓ Arbitrary Min & Max and Fixed-Length generation test passed.');

// Test 7: Weak Keys preset and drill generation
console.log('Test 7: Testing Weak Keys preset and drill generation...');
const weakGen = new SequenceGenerator();
weakGen.setPreset('weak');
weakGen.setWeakChars(['#', '%']);
for (let i = 0; i < 50; i++) {
  const seq = weakGen.generate();
  assert(seq.split('').every(c => ['#', '%'].includes(c)), `Weak preset must generate only weak characters, got ${seq}`);
}
console.log('✓ Weak keys preset test passed.');

// Test 8: Speedrun Engine Validation
console.log('Test 8: Testing SpeedrunEngine (60-second countdown and keys count)...');
let tickCount = 0;
let lastTickData = null;
let speedrunCompletedResult = null;

const speedrun = new SpeedrunEngine({
  onTick: (data) => {
    tickCount++;
    lastTickData = data;
  },
  onComplete: (res) => {
    speedrunCompletedResult = res;
  }
});

speedrun.start();
assert.strictEqual(speedrun.remainingMs, 60000, 'Initial speedrun remaining time must be 60000ms');
assert.strictEqual(speedrun.hasStarted, false, 'Speedrun should not start counting down before first keypress');
assert.strictEqual(speedrun.totalKeysTyped, 0);

// Record first key
speedrun.recordKey(true);
assert.strictEqual(speedrun.hasStarted, true, 'First keypress must activate speedrun timer');
assert.strictEqual(speedrun.totalKeysTyped, 1, 'Total keys typed must be 1');

// Record more keys and a mistake
speedrun.recordKey(true);
speedrun.recordKey(false);
speedrun.recordKey(true);
assert.strictEqual(speedrun.totalKeysTyped, 3, 'Total keys typed must be 3');
assert.strictEqual(speedrun.totalErrors, 1, 'Total errors must be 1');

// Verify finish computes stats
speedrun.finish();
assert.strictEqual(speedrunCompletedResult.totalKeysTyped, 3);
assert.strictEqual(speedrunCompletedResult.totalErrors, 1);
assert.strictEqual(speedrunCompletedResult.accuracy, 75, 'Accuracy must be 3/4 = 75%');
assert.strictEqual(speedrun.isActive, false, 'Engine must become inactive after finish');

console.log('✓ SpeedrunEngine test passed.');

// Test 9: Survival Engine Validation
console.log('Test 9: Testing SurvivalEngine (3 lives, ghost racing, speed scaling)...');
let ghostStepCalls = 0;
let ghostOvertakeCalls = 0;
let lifeLostCalls = 0;
let waveCompleteCalls = 0;
let gameOverResult = null;

const survival = new SurvivalEngine({
  onGhostStep: () => { ghostStepCalls++; },
  onGhostOvertake: () => { ghostOvertakeCalls++; },
  onLifeLost: () => { lifeLostCalls++; },
  onWaveComplete: () => { waveCompleteCalls++; },
  onGameOver: (res) => { gameOverResult = res; }
});

survival.start();
assert.strictEqual(survival.lives, MAX_LIVES, `Must start with ${MAX_LIVES} lives`);
assert.strictEqual(survival.wave, 1, 'Must start at Wave 1');
assert.strictEqual(survival.ghostState, 'waiting', 'Ghost must initially be waiting');
assert.strictEqual(survival.ghostActive, false, 'Ghost must be inactive before player hits first key');

// Set sequence of 4 chars
survival.setSequence(['!', '@', '#', '$']);
assert.strictEqual(survival.ghostActive, false, 'Ghost must still wait after sequence is set');

// Player strikes first key
survival.onPlayerKeyAdvance();
assert.strictEqual(survival.ghostActive, true, 'Ghost must start racing once player strikes first key');
assert.strictEqual(survival.ghostState, 'racing');

// Player makes a mistake -> loses 1 life
survival.onPlayerMistake();
assert.strictEqual(survival.lives, 2, 'Typo must deduct 1 life');
assert.strictEqual(lifeLostCalls, 1, 'onLifeLost must be called');

// Ghost overtakes player (ghost completes sequence)
survival.ghostIndex = 4;
survival.handleGhostOvertake();
assert.strictEqual(survival.lives, 1, 'Ghost overtake must deduct 1 life');
assert.strictEqual(ghostOvertakeCalls, 1, 'onGhostOvertake must be called');
assert.strictEqual(survival.ghostActive, false, 'Ghost must stop active timer on overtake');

// Reset sequence after overtake -> ghost must wait again!
survival.setSequence(['1', '2', '3', '4']);
assert.strictEqual(survival.ghostActive, false, 'Ghost must wait again for first keypress after reset');

// Complete sequence before ghost -> wave completes & speed escalates
survival.onPlayerKeyAdvance();
survival.onPlayerSequenceComplete();
assert.strictEqual(survival.wave, 2, 'Wave must advance to 2');
assert.strictEqual(waveCompleteCalls, 1, 'onWaveComplete must be called');
assert(survival.ghostSpeedCPM > INITIAL_GHOST_CPM, 'Ghost speed must increase with wave');
assert(survival.ghostSpeedCPM <= MAX_GHOST_CPM, 'Ghost speed must not exceed MAX_GHOST_CPM cap');

// Third lost life -> Game Over
survival.onPlayerMistake();
assert.strictEqual(survival.lives, 0, 'Lives must reach 0');
assert(gameOverResult !== null, 'onGameOver must be called when lives reach 0');
assert.strictEqual(survival.isActive, false, 'SurvivalEngine must be inactive after game over');

// Clean up any timers
speedrun.stop();
survival.stop();

console.log('✓ SurvivalEngine test passed.');

// Test 10: Enter Key Safeguard & Modal Regeneration Validation
console.log('Test 10: Testing Enter key rejection and engine restart regeneration...');
import { TypingTrainer } from '../src/engine/trainer.js';

let mistakeCount = 0;
let advanceCount = 0;
const testTrainer = new TypingTrainer({
  generator: new SequenceGenerator(),
  onCharAdvance: () => { advanceCount++; },
  onCharMistake: () => { mistakeCount++; }
});

testTrainer.isActive = true;
testTrainer.currentSequence = ['a', 'b', 'c'];
testTrainer.currentIndex = 0;
testTrainer.statusArray = ['pending', 'pending', 'pending'];

// Simulate pressing Enter key
testTrainer.handleKeyDown({
  key: 'Enter',
  preventDefault: () => {}
});

assert.strictEqual(testTrainer.currentIndex, 0, 'Enter key must NOT advance trainer currentIndex');
assert.strictEqual(mistakeCount, 0, 'Enter key must NOT register as a mistake');
assert.strictEqual(advanceCount, 0, 'Enter key must NOT advance characters');

// Direct call to processStrictInput with Enter
testTrainer.processStrictInput('Enter');
assert.strictEqual(testTrainer.currentIndex, 0, 'Direct processStrictInput with Enter must be ignored');
assert.strictEqual(mistakeCount, 0, 'Direct processStrictInput with Enter must not cause mistake');

// Direct call to processStrictInput with newline
testTrainer.processStrictInput('\n');
assert.strictEqual(testTrainer.currentIndex, 0, 'Newline must be ignored');
assert.strictEqual(mistakeCount, 0, 'Newline must not cause mistake');

// Test life regeneration on retry/close
survival.start();
assert.strictEqual(survival.lives, MAX_LIVES, 'Restarting survival must regenerate all lives to MAX_LIVES');
assert.strictEqual(survival.isActive, true, 'Restarting survival must activate engine');

speedrun.start();
assert.strictEqual(speedrun.remainingMs, 60000, 'Restarting speedrun must reset timer to 60000ms');
assert.strictEqual(speedrun.isActive, true, 'Restarting speedrun must activate engine');

speedrun.stop();
survival.stop();
console.log('✓ Enter key safeguard and modal regeneration tests passed.');

console.log('\n=== ALL 10 ENGINE TEST SUITES PASSED CLEANLY! ===\n');
