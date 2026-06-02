import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  LucideLineChart,
  LucideSparkles,
  LucideUsers,
} from 'lucide-angular';
import { AuthService } from '../auth/services/auth-service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './onboarding.html',
})
export class Onboarding implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly LucideLineChart = LucideLineChart;
  readonly LucideSparkles = LucideSparkles;
  readonly LucideUsers = LucideUsers;

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigate(['/home']);
    }
  }
}
