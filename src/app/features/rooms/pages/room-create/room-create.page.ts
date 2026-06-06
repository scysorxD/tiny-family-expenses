import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput } from '@ionic/angular/standalone';
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
    <app-page-header title="New room" defaultHref="/rooms"></app-page-header>
    <ion-content>
      <div class="page-pad">
        <p class="label-muted intro">Create a room to track shared expenses with others.</p>
        <form [formGroup]="form" (ngSubmit)="submit()" class="form-stack">
          <ion-input
            fill="outline"
            label="Room name"
            labelPlacement="stacked"
            placeholder="Parents expenses"
            formControlName="name"
          ></ion-input>
          <app-currency-select formControlName="currency"></app-currency-select>
          <app-submit-button
            type="submit"
            label="Create room"
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
  ],
})
export class RoomCreatePage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly roomService = inject(RoomService);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

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
      await this.feedback.success('Room created');
      await this.router.navigate(['/rooms', room.id]);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
