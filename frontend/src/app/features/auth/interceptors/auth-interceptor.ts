import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { AuthService } from '../services/auth-service';
import { catchError, switchMap, throwError } from 'rxjs';

const isAuthRoute = (url: string): boolean => {
  return url.includes('/v1/auth/login') || url.includes('/v1/auth/register') || url.includes('/v1/auth/refresh');
};

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  const accessToken = authService.getAccessToken();
  

  const authReq =
    accessToken && !isAuthRoute(req.url)
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const refreshToken = authService.getRefreshToken();

    if (error.status !== 401 || !refreshToken || isAuthRoute(req.url)) {
    return throwError(() => error);
    }
      return authService.refreshToken().pipe(
        switchMap(response => {
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${response.access_token}`,
            },
          });

          return next(retryReq);
        }),
        catchError(refreshError => {
          authService.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};