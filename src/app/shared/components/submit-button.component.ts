import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonSpinner } from '@ionic/angular/standalone';

type ButtonFill = 'clear' | 'outline' | 'solid' | 'default';

@Component({
  selector: 'app-submit-button',
  template: `
    <ion-button
      [expand]="expand"
      [type]="type"
      [fill]="fill"
      [disabled]="disabled || loading"
      (click)="action.emit()"
    >
      @if (loading) {
        <ion-spinner name="dots"></ion-spinner>
      } @else {
        {{ label }}
      }
    </ion-button>
  `,
  imports: [IonButton, IonSpinner],
})
export class SubmitButtonComponent {
  @Input() label = '';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() expand: 'block' | 'full' = 'block';
  @Input() fill: ButtonFill = 'solid';

  @Output() action = new EventEmitter<void>();
}
