import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { RoomService } from '../../../../core/services/room.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-room-create',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/rooms"></ion-back-button>
        </ion-buttons>
        <ion-title>New room</ion-title>
      </ion-toolbar>
    </ion-header>
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
          <ion-select fill="outline" label="Currency" labelPlacement="stacked" formControlName="currency">
            <ion-select-option value="ARS">ARS</ion-select-option>
            <ion-select-option value="USD">USD</ion-select-option>
            <ion-select-option value="EUR">EUR</ion-select-option>
            <ion-select-option value="BRL">BRL</ion-select-option>
            <ion-select-option value="CLP">CLP</ion-select-option>
            <ion-select-option value="MXN">MXN</ion-select-option>
          </ion-select>
          <ion-button expand="block" type="submit" [disabled]="loading() || form.invalid">
            @if (loading()) {
              <ion-spinner name="dots"></ion-spinner>
            } @else {
              Create room
            }
          </ion-button>
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
      .form-stack ion-button {
        margin-top: 6px;
      }
    `,
  ],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonSpinner,
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
