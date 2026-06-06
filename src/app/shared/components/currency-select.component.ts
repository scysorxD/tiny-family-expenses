import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonSelect, IonSelectOption } from '@ionic/angular/standalone';

const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'MXN'] as const;

@Component({
  selector: 'app-currency-select',
  template: `
    <ion-select
      fill="outline"
      [label]="label"
      labelPlacement="stacked"
      [value]="value"
      (ionChange)="handleChange($any($event).detail.value)"
      (ionBlur)="onTouched()"
    >
      @for (currency of currencies; track currency) {
        <ion-select-option [value]="currency">{{ currency }}</ion-select-option>
      }
    </ion-select>
  `,
  imports: [IonSelect, IonSelectOption],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencySelectComponent),
      multi: true,
    },
  ],
})
export class CurrencySelectComponent implements ControlValueAccessor {
  @Input() label = 'Currency';

  readonly currencies = CURRENCIES;
  value = 'ARS';

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  handleChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  writeValue(value: string | null): void {
    this.value = value ?? 'ARS';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
