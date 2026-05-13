import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { AppShellComponent } from './layout/app-shell-component/app-shell-component';

export const routes: Routes = [
    {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: Home, title: 'Dashboard' },
    ],
  },
];
