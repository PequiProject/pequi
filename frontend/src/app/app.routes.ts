import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { AppShellComponent } from './layout/app-shell-component/app-shell-component';
import { Journey } from './features/journey/journey';
import { CheckinComponent } from './features/checkin/checkin';
import { Education } from './features/education/education';
import { Comunity } from './features/comunity/comunity';
import { CommunityFeed } from './features/comunity/community-feed/community-feed';
import { CommunityPostPage } from './features/comunity/community-post-page/community-post-page';
import { Profile } from './features/profile/profile';
import { Notification } from './components/notification/notification';
import { RegisterAppointmentComponent } from './features/appointments/register-appointment/register-appointment';
import { Medication } from './features/medication/medication';

export const routes: Routes = [
    {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: HomeComponent, title: 'Início' },
      { path: 'journey', component: Journey, title: 'Jornada' },
      { path: 'checkin', component: CheckinComponent, title: 'Check In' },
      { path: 'medication', component: Medication, title: 'Remédios' },
      {
        path: 'appointments/register',
        component: RegisterAppointmentComponent,
        title: 'Registrar consulta',
      },
      { path: 'education', component: Education, title: 'Educação' },
      { path: 'comunity', component: Comunity, title: 'Comunidade' },
      { path: 'comunity/feed', component: CommunityFeed, title: 'Comunidade' },
      { path: 'comunity/feed/:postId', component: CommunityPostPage, title: 'Post' },
      { path: 'profile', component: Profile, title: 'Perfil' },
      { path: 'notifications', component: Notification, title: 'Notificações' },
    ],
  },
];
