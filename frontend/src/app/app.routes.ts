import { Routes } from '@angular/router';
import { Home } from './features/home/home';
import { AppShellComponent } from './layout/app-shell-component/app-shell-component';
import { Journey } from './features/journey/journey';
import { Checkin } from './features/checkin/checkin';
import { Education } from './features/education/education';
import { Comunity } from './features/comunity/comunity';

export const routes: Routes = [
    {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: Home, title: 'Início' },
      { path: 'journey', component: Journey, title: 'Jornada' },
      { path: 'checkin', component: Checkin, title: 'Check In' },
      { path: 'education', component: Education, title: 'Educação' },
      { path: 'comunity', component: Comunity, title: 'Comunidade' },
    ],
  },
];
