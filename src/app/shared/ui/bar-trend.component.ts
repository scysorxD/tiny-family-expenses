import { Component, Input, computed, signal } from '@angular/core';

export interface BarDatum {
  label: string;
  value: number;
}

interface Bar {
  label: string;
  height: number;
  active: boolean;
}

@Component({
  selector: 'app-bar-trend',
  template: `
    @if (bars().length === 0) {
      <p class="label-muted">No data.</p>
    } @else {
      <div class="bars">
        @for (bar of bars(); track bar.label; let last = $last) {
          <div class="bar-col">
            <div class="bar-track">
              <div class="bar-fill" [class.active]="last" [style.height.%]="bar.height"></div>
            </div>
            <span class="bar-label">{{ bar.label }}</span>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .bars {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        height: 132px;
      }
      .bar-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        height: 100%;
      }
      .bar-track {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .bar-fill {
        width: 70%;
        min-height: 4px;
        border-radius: 6px 6px 0 0;
        background: var(--app-primary-soft);
        transition: height 0.25s ease;
      }
      .bar-fill.active {
        background: var(--app-primary);
      }
      .bar-label {
        font-size: 0.72rem;
        color: var(--app-text-muted);
      }
    `,
  ],
})
export class BarTrendComponent {
  private readonly _data = signal<BarDatum[]>([]);

  @Input() set data(value: BarDatum[]) {
    this._data.set(value ?? []);
  }

  readonly bars = computed<Bar[]>(() => {
    const data = this._data();
    if (data.length === 0) {
      return [];
    }
    const max = Math.max(...data.map((d) => d.value), 0);
    return data.map((d, index) => ({
      label: d.label,
      height: max > 0 ? Math.max((d.value / max) * 100, 2) : 2,
      active: index === data.length - 1,
    }));
  });
}
