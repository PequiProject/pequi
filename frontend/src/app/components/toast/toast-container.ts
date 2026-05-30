import { Component, inject } from '@angular/core';
import { Toast } from './toast';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [Toast],
  templateUrl: './toast-container.html',
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);
}
