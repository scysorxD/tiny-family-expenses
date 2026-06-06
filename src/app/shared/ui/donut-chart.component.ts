import { Component, Input, computed, signal } from '@angular/core';
import { categoryColor } from '../utils';

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

interface DonutSegment {
  label: string;
  color: string;
  pct: number;
  dash: string;
  offset: number;
}

@Component({
  selector: 'app-donut-chart',
  template: `
    @if (segments().length === 0) {
      <p class="label-muted donut-empty">No data.</p>
    } @else {
      <div class="donut-wrap">
        <svg viewBox="0 0 42 42" class="donut" role="img" [attr.aria-label]="centerLabel || 'Breakdown'">
          <circle class="donut-ring" cx="21" cy="21" r="15.915"></circle>
          @for (seg of segments(); track seg.label) {
            <circle
              class="donut-seg"
              cx="21"
              cy="21"
              r="15.915"
              [attr.stroke]="seg.color"
              [attr.stroke-dasharray]="seg.dash"
              [attr.stroke-dashoffset]="seg.offset"
            ></circle>
          }
          @if (centerLabel) {
            <text x="21" y="20" class="donut-total">{{ centerLabel }}</text>
          }
          @if (caption) {
            <text x="21" y="25" class="donut-cap">{{ caption }}</text>
          }
        </svg>
        <ul class="legend">
          @for (seg of segments(); track seg.label) {
            <li>
              <span class="dot" [style.background]="seg.color"></span>
              <span class="lg-label">{{ seg.label }}</span>
              <span class="lg-pct">{{ seg.pct }}%</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [
    `
      .donut-empty {
        margin: 8px 0;
      }
      .donut-wrap {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .donut {
        width: 116px;
        height: 116px;
        flex: none;
      }
      .donut-ring {
        fill: none;
        stroke: var(--app-border);
        stroke-width: 4;
      }
      .donut-seg {
        fill: none;
        stroke-width: 4;
        stroke-linecap: butt;
      }
      .donut-total {
        font-size: 5.5px;
        font-weight: 700;
        text-anchor: middle;
        fill: var(--app-text);
      }
      .donut-cap {
        font-size: 3px;
        text-anchor: middle;
        fill: var(--app-text-muted);
      }
      .legend {
        list-style: none;
        margin: 0;
        padding: 0;
        flex: 1;
        min-width: 0;
      }
      .legend li {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        margin-bottom: 6px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex: none;
      }
      .lg-label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--app-text-muted);
      }
      .lg-pct {
        font-weight: 700;
      }
    `,
  ],
})
export class DonutChartComponent {
  @Input() centerLabel = '';
  @Input() caption = '';

  private readonly _data = signal<DonutDatum[]>([]);

  @Input() set data(value: DonutDatum[]) {
    this._data.set(value ?? []);
  }

  readonly segments = computed<DonutSegment[]>(() => {
    const data = this._data().filter((d) => d.value > 0);
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total <= 0) {
      return [];
    }

    let cumulative = 0;
    return data.map((d) => {
      const pct = (d.value / total) * 100;
      const offset = 25 - cumulative;
      cumulative += pct;
      return {
        label: d.label,
        color: d.color ?? categoryColor(d.label),
        pct: Math.round(pct),
        dash: `${pct} ${100 - pct}`,
        offset,
      };
    });
  });
}
