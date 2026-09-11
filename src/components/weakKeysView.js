/**
 * Weak Keys & Performance Drawer View Component
 */

import { getCharMeta } from './keyboardGuide.js';

export class WeakKeysView {
  constructor({ statsTracker, onDrillWeakKeys }) {
    this.stats = statsTracker;
    this.onDrillWeakKeys = onDrillWeakKeys || (() => {});

    this.drawerEl = document.getElementById('stats-drawer');
    this.overlayEl = document.getElementById('drawer-overlay');
    this.closeBtn = document.getElementById('stats-close-btn');
    this.openBtn = document.getElementById('stats-open-btn');
    this.drillBtn = document.getElementById('drill-weak-btn');
    this.resetBtn = document.getElementById('reset-stats-btn');
    this.tbodyEl = document.getElementById('weak-keys-tbody');

    // Summary fields
    this.totalTypedEl = document.getElementById('stat-total-typed');
    this.overallAccEl = document.getElementById('stat-overall-acc');
    this.maxStreakEl = document.getElementById('stat-max-streak');
    this.avgCpmEl = document.getElementById('stat-avg-cpm');

    this.initEvents();
  }

  initEvents() {
    if (this.openBtn) {
      this.openBtn.addEventListener('click', () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    if (this.overlayEl) {
      this.overlayEl.addEventListener('click', () => this.close());
    }
    if (this.drillBtn) {
      this.drillBtn.addEventListener('click', () => {
        const weakList = this.stats.getWeakKeys(90, 1);
        const weakChars = weakList.map(w => w.char);
        if (weakChars.length > 0) {
          this.onDrillWeakKeys(weakChars);
          this.close();
        } else {
          alert('Great job! No weak keys detected yet (accuracy >= 90%). Keep typing to build more data!');
        }
      });
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all accumulated statistics and weak keys data?')) {
          this.stats.reset();
          this.render();
        }
      });
    }
  }

  open() {
    if (!this.drawerEl) return;
    this.stats.freeze();
    this.drawerEl.classList.remove('hidden');
    this.render();
  }

  close() {
    if (!this.drawerEl) return;
    this.drawerEl.classList.add('hidden');
  }

  render() {
    // Summary values
    if (this.totalTypedEl) this.totalTypedEl.textContent = this.stats.totalCharsTyped;
    if (this.overallAccEl) this.overallAccEl.textContent = `${this.stats.getAccuracy()}%`;
    if (this.maxStreakEl) this.maxStreakEl.textContent = this.stats.bestStreak;
    if (this.avgCpmEl) this.avgCpmEl.textContent = this.stats.getCPM();

    // Per char table
    if (!this.tbodyEl) return;
    this.tbodyEl.innerHTML = '';

    const list = this.stats.getAllCharStats();

    if (list.length === 0) {
      this.tbodyEl.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No characters typed yet. Start typing on the main canvas!
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(item => {
      const meta = getCharMeta(item.char);
      const row = document.createElement('tr');

      let accClass = 'acc-high';
      let statusBadge = '✨ Mastered';
      if (item.accuracy < 75) {
        accClass = 'acc-low';
        statusBadge = '⚠️ Needs Work';
      } else if (item.accuracy < 90) {
        accClass = 'acc-mid';
        statusBadge = '⚡ Improving';
      }

      const keyInfo = meta ? `${meta.fingerName} (${meta.isShift ? 'Shift' : 'Base'})` : 'Number Row';

      row.innerHTML = `
        <td><span class="char-badge">${item.char}</span></td>
        <td style="color: var(--text-muted);">${keyInfo}</td>
        <td>${item.attempts}</td>
        <td style="color: ${item.errors > 0 ? 'var(--color-error)' : 'inherit'};">${item.errors}</td>
        <td class="${accClass}">${item.accuracy}%</td>
        <td style="font-weight: 600;">${statusBadge}</td>
      `;

      this.tbodyEl.appendChild(row);
    });
  }
}
