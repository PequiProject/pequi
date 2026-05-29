import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterResponse extends AuthUser {}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: AuthUser;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly baseUrl = 'http://localhost:8000/v1/auth';
  private readonly sessionKey = 'auth_session';

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, payload);
  }

  login(payload: LoginRequest): Observable<AuthTokenResponse> {
    return this.http
      .post<AuthTokenResponse>(`${this.baseUrl}/login`, payload)
      .pipe(tap(response => this.setSession(response)));
  }

refreshToken(): Observable<AuthTokenResponse> {
  const refreshToken = this.getRefreshToken();

  if (!refreshToken) {
    this.logout();
    throw new Error('Refresh token não encontrado.');
  }

  const payload: RefreshTokenRequest = {
    refresh_token: refreshToken,
  };

  return this.http
    .post<AuthTokenResponse>(`${this.baseUrl}/refresh`, payload)
    .pipe(tap(response => this.setSession(response)));
}

  logout(): void {
    localStorage.removeItem(this.sessionKey);
    void this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getAccessToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.getSession()?.refreshToken ?? null;
  }

  getCurrentUser(): AuthUser | null {
    return this.getSession()?.user ?? null;
  }

  private setSession(response: AuthTokenResponse): void {
    const session: AuthSession = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      tokenType: response.token_type,
      user: response.user,
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  private getSession(): AuthSession | null {
    const raw = localStorage.getItem(this.sessionKey);

    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }
}
