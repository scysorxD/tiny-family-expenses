import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

export type StatusTone = 'open' | 'paid' | 'warning' | 'danger' | 'muted';

@Component({
  selector: 'app-status-pill',
  template: `<span [class]="'status-pill is-' + tone">
    @if (icon) {
      <ion-icon [name]="icon"></ion-icon>
    }
    {{ label }}
  </span>`,
  imports: [IonIcon],
})
export class StatusPillComponent {
  @Input() label = '';
  @Input() tone: StatusTone = 'muted';
  @Input() icon: string | null = null;
}
