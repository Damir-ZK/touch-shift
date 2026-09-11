import assert from 'node:assert';
import { PRESETS, SequenceGenerator } from '../src/engine/generator.js';
import { KEY_DEFINITIONS, getCharMeta, KeyboardGuide } from '../src/components/keyboardGuide.js';
import { StatsTracker } from '../src/engine/stats.js';
import { SpeedrunEngine } from '../src/engine/speedrunEngine.js';
import { SurvivalEngine, MAX_LIVES, INITIAL_GHOST_CPM, SPEEDUP_PER_WAVE_CPM, MAX_GHOST_CPM } from '../src/engine/survivalEngine.js';

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

// Test 2: Sequence Generator default lengths between 4 and 8 characters
console.log('Test 2: Verifying default sequence lengths between 4 and 8...');
const gen = new SequenceGenerator();

const lengthCounts = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
for (let i = 0; i < 250; i++) {
  const seq = gen.generate();
  assert(seq.length >= 4 && seq.length <= 8, `Generated length ${seq.length} must be between 4 and 8`);
  assert(!seq.includes(' '), 'Generated sequence must not contain spaces');
  lengthCounts[seq.length]++;
}
assert(
  lengthCounts[4] > 0 && lengthCounts[5] > 0 && lengthCounts[6] > 0 && lengthCounts[7] > 0 && lengthCounts[8] > 0,
  'All default lengths 4-8 should be sampled'
);
console.log(`✓ Length distribution over 250 iterations: 4=${lengthCounts[4]}, 5=${lengthCounts[5]}, 6=${lengthCounts[6]}, 7=${lengthCounts[7]}, 8=${lengthCounts[8]}`);

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

// Test 4b: KeyboardGuide Ghost Mode Highlights
console.log('Test 4b: Verifying KeyboardGuide Ghost Mode removes correct key highlight...');
function createMockEl() {
  const classes = new Set();
  return {
    className: '',
    id: '',
    innerHTML: '',
    textContent: '',
    appendChild() {},
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      contains(c) { return classes.has(c); }
    }
  };
}

const origDoc = global.document;
global.document = {
  createElement: () => createMockEl(),
  getElementById: () => createMockEl(),
  body: createMockEl()
};

const guideContainer = createMockEl();
const lShift = createMockEl();
const rShift = createMockEl();
const hintFinger = createMockEl();

const guide = new KeyboardGuide({
  containerEl: guideContainer,
  lShiftEl: lShift,
  rShiftEl: rShift,
  hintFingerEl: hintFinger
});

// Full mode: highlighting '!' should highlight target key-1 and Right Shift
guide.setMode('full');
guide.highlight('!');
const key1El = guide.keyElements.get('key-1');
assert(key1El.classList.contains('active-target'), 'In full mode, key-1 must have active-target class');
assert(rShift.classList.contains('active-shift'), 'In full mode, right shift must have active-shift class');

// Ghost mode: highlighting '!' should NOT highlight key-1, but can still indicate Shift
guide.setMode('ghost');
assert(!key1El.classList.contains('active-target'), 'Switching to ghost mode must clear active-target on key-1');
assert(rShift.classList.contains('active-shift'), 'Ghost mode can retain shift indicator');

// Highlighting '1' (un-shifted) in ghost mode
guide.highlight('1');
assert(!key1El.classList.contains('active-target'), 'In ghost mode, key-1 must NOT be highlighted');
assert(!rShift.classList.contains('active-shift'), 'In ghost mode, right shift is not active for un-shifted 1');

// Switching back to full mode re-applies active-target immediately
guide.setMode('full');
assert(key1El.classList.contains('active-target'), 'Switching back to full mode must immediately restore key-1 active-target');

global.document = origDoc;
console.log('✓ KeyboardGuide Ghost mode correct key highlight suppression verified.');

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
const weakCaret = weak.find(w => w.char === '^');
assert.strictEqual(weakCaret.attempts, 3, '^ should have 3 attempts (2 correct + 1 mistake)');
assert.strictEqual(weakCaret.errors, 1);
assert.strictEqual(weakCaret.accuracy, 67);

// User-reported bug scenario:
// "When you make a mistake (e.g. press 4 instead of 5) it doesn't count this as an attempt, but only as a mistake."
// 1st keystroke: mistake on '5'
stats.recordCharMistake('5');
let charStats5 = stats.getAllCharStats().find(s => s.char === '5');
assert.strictEqual(charStats5.attempts, 1, '1st mistake must count as 1 attempt');
assert.strictEqual(charStats5.errors, 1, '1st mistake must record 1 error');
assert.strictEqual(charStats5.accuracy, 0, '1 mistake out of 1 attempt must be 0% accuracy, not 100%');

// 2nd keystroke: correct '5'
stats.recordCharAdvance('5');
charStats5 = stats.getAllCharStats().find(s => s.char === '5');
assert.strictEqual(charStats5.attempts, 2, 'Follow-up correct keypress must increment attempts to 2');
assert.strictEqual(charStats5.errors, 1, 'Errors remain 1');
assert.strictEqual(charStats5.accuracy, 50, '1 error out of 2 attempts must be exactly 50% accuracy, not 0%');

// Test legacy v1 storage migration (where attempts only counted advances)
global.localStorage.setItem('touchshift_stats_v1', JSON.stringify({
  bestStreak: 10,
  perCharStats: {
    '7': { attempts: 1, errors: 1 }, // 1 advance, 1 mistake in v1
    '8': { attempts: 0, errors: 1 }  // 0 advances, 1 mistake in v1
  }
}));
const migratedStats = new StatsTracker();
const char7 = migratedStats.getAllCharStats().find(s => s.char === '7');
assert.strictEqual(char7.attempts, 2, 'Legacy char 7 should be migrated from 1 to 2 attempts');
assert.strictEqual(char7.errors, 1);
assert.strictEqual(char7.accuracy, 50);

const char8 = migratedStats.getAllCharStats().find(s => s.char === '8');
assert.strictEqual(char8.attempts, 1, 'Legacy char 8 should be migrated from 0 to 1 attempt');
assert.strictEqual(char8.errors, 1);
assert.strictEqual(char8.accuracy, 0);

// Test CPM / WPM Freezing:
// 1. Initially frozen at 0
const freezeTracker = new StatsTracker();
assert.strictEqual(freezeTracker.isFrozen, true, 'Stats tracker must start frozen until first keystroke');
assert.strictEqual(freezeTracker.getCPM(), 0);
assert.strictEqual(freezeTracker.getWPM(), 0);

// 2. Active typing unfreezes
freezeTracker.recordCharAdvance('a');
assert.strictEqual(freezeTracker.isFrozen, false, 'First keypress must unfreeze stats');

// Simulate rapid keystrokes to establish a CPM
const t0 = performance.now();
freezeTracker.recentTypedTimestamps = [t0 - 1000, t0 - 750, t0 - 500, t0 - 250, t0]; // 5 keys in 1s = 300 CPM
freezeTracker.lastCalculatedCPM = 300;

// 3. Condition 2: Completing a sequence freezes CPM
freezeTracker.recordSequenceComplete();
assert.strictEqual(freezeTracker.isFrozen, true, 'Completing sequence must freeze CPM');
const frozenVal = freezeTracker.getCPM();
assert(frozenVal > 0, `Frozen CPM must be preserved, got ${frozenVal}`);
assert.strictEqual(freezeTracker.getWPM(), Math.round(frozenVal / 5));

// Even if time passes, getCPM() must NOT decay
assert.strictEqual(freezeTracker.getCPM(), frozenVal, 'Frozen CPM must not change over time');

// 4. Condition 1: GUI interaction freezes CPM
freezeTracker.unfreeze();
assert.strictEqual(freezeTracker.isFrozen, false);
freezeTracker.freeze();
assert.strictEqual(freezeTracker.isFrozen, true, 'Calling freeze() on GUI interaction must freeze CPM');

// 5. Condition 3: Speedrun mode completion / Survival game over freezes with fixed score
freezeTracker.freeze(240);
assert.strictEqual(freezeTracker.isFrozen, true);
assert.strictEqual(freezeTracker.getCPM(), 240, 'Speedrun finish must freeze CPM to speedrun result');
assert.strictEqual(freezeTracker.getWPM(), 48, 'WPM must match frozen CPM');

// 6. Next keystroke unfreezes and shifts timestamps forward so pause time is excluded
freezeTracker.freezeStartTime = performance.now() - 5000; // Simulated 5s freeze pause
const oldestBefore = freezeTracker.recentTypedTimestamps[0];
freezeTracker.recordCharAdvance('b');
assert.strictEqual(freezeTracker.isFrozen, false, 'Next keypress unfreezes stats');
const oldestAfter = freezeTracker.recentTypedTimestamps[0];
assert(oldestAfter >= oldestBefore + 4900, 'Pause duration must be shifted forward in timestamps to prevent CPM drop');

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
assert.strictEqual(INITIAL_GHOST_CPM, 40, 'INITIAL_GHOST_CPM must be 40');
assert.strictEqual(survival.ghostSpeedCPM, 40, 'Ghost speed must start at 40 CPM');
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
assert.strictEqual(survival.ghostSpeedCPM, INITIAL_GHOST_CPM + SPEEDUP_PER_WAVE_CPM, 'Ghost speed must scale with SPEEDUP_PER_WAVE_CPM');
assert(survival.ghostSpeedCPM > INITIAL_GHOST_CPM, 'Ghost speed must increase with wave');
assert(survival.ghostSpeedCPM <= MAX_GHOST_CPM, 'Ghost speed must not exceed MAX_GHOST_CPM cap');
assert(SPEEDUP_PER_WAVE_CPM < 7, 'Speedup rate must be slower than previous 7 CPM');

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
