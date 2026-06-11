import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { RoomService } from '../../../../core/services/room.service';
import {
  CurrencySelectComponent,
  PageHeaderComponent,
  SubmitButtonComponent,
} from '../../../../shared/components';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-room-create',
  template: `
    <app-page-header [title]="'rooms.create.title' | translate" defaultHref="/rooms"></app-page-header>
    <ion-content>
      <div class="page-pad">
        <p class="label-muted intro">{{ 'rooms.create.intro' | translate }}</p>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form-stack">
          <ion-input
            fill="outline"
            [label]="'rooms.create.name' | translate"
            labelPlacement="stacked"
            [placeholder]="'rooms.create.namePlaceholder' | translate"
            formControlName="name"
          ></ion-input>
          <app-currency-select [label]="'common.currency' | translate" formControlName="currency"></app-currency-select>
          <app-submit-button
            type="submit"
            [label]="'rooms.create.submit' | translate"
            [loading]="loading()"
            [disabled]="form.invalid"
          ></app-submit-button>
        </form>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .intro {
        margin: 0 0 16px;
      }
      .form-stack {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
    `,
  ],
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonInput,
    PageHeaderComponent,
    CurrencySelectComponent,
    SubmitButtonComponent,
    TranslatePipe,
  ],
})
export class RoomCreatePage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly roomService = inject(RoomService);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    currency: ['ARS', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      const { name, currency } = this.form.getRawValue();
      const room = await this.roomService.createRoom(name, currency);
      await this.preferences.setLastRoomId(room.id);
      await this.feedback.success(this.translate.instant('rooms.create.created'));
      await this.router.navigate(['/rooms', room.id]);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
