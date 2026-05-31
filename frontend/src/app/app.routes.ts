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
import { PhotoRegister } from './features/photo-register/photo-register';
import { RegisterAppointmentComponent } from './features/appointments/register-appointment/register-appointment';
import { Login } from './features/login/login';
import { Register } from './features/register/register';
import { Onboarding } from './features/onboarding/onboarding';
import { authGuard } from './features/auth/guards/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Onboarding, title: 'Bem-vindo' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
    {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: HomeComponent, title: 'Início' },
      { path: 'journey', component: Journey, title: 'Jornada' },
      { path: 'checkin', component: CheckinComponent, title: 'Check In' },
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
      { path: 'photo-register', component: PhotoRegister, title: 'Registro de Fotos' },
    ],
  },
];
