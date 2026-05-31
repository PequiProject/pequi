import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth-service';

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

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const navigateMock = vi.fn();

  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'teste@teste.com',
    full_name: 'Sarah',
    role: 'patient',
    is_active: true,
    is_verified: false,
    created_at: '2026-05-28T14:06:17.974436Z',
    updated_at: '2026-05-28T14:06:17.974436Z',
  };

  const mockAuthResponse: AuthTokenResponse = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-456',
    expires_in: 1800,
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockReset();
    navigateMock.mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        {
          provide: Router,
          useValue: {
            navigate: navigateMock,
          },
        },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should call register with the correct payload', () => {
    const payload: RegisterRequest = {
      email: 'teste@teste.com',
      password: '123456',
      full_name: 'Sarah',
    };

    let responseBody: AuthUser | undefined;

    service.register(payload).subscribe(response => {
      responseBody = response;
    });

    const req = httpMock.expectOne('http://localhost:8000/v1/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush(mockUser);

    expect(responseBody).toEqual(mockUser);
  });

  it('should call login and save session in localStorage', () => {
    const payload: LoginRequest = {
      email: 'teste@teste.com',
      password: '123456',
    };

    let responseBody: AuthTokenResponse | undefined;

    service.login(payload).subscribe(response => {
      responseBody = response;
    });

    const req = httpMock.expectOne('http://localhost:8000/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush(mockAuthResponse);

    expect(responseBody).toEqual(mockAuthResponse);

    const session = JSON.parse(localStorage.getItem('auth_session') ?? '{}');
    expect(session).toEqual({
      accessToken: mockAuthResponse.access_token,
      refreshToken: mockAuthResponse.refresh_token,
      expiresIn: mockAuthResponse.expires_in,
      tokenType: mockAuthResponse.token_type,
      user: mockAuthResponse.user,
    });
  });

  it('should return true from isAuthenticated when access token exists', () => {
    localStorage.setItem(
      'auth_session',
      JSON.stringify({
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresIn: 1800,
        tokenType: 'bearer',
        user: mockUser,
      })
    );

    expect(service.isAuthenticated()).toBe(true);
  });

  it('should return false from isAuthenticated when there is no session', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should return access token from session', () => {
    localStorage.setItem(
      'auth_session',
      JSON.stringify({
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresIn: 1800,
        tokenType: 'bearer',
        user: mockUser,
      })
    );

    expect(service.getAccessToken()).toBe('token-123');
  });

  it('should return refresh token from session', () => {
    localStorage.setItem(
      'auth_session',
      JSON.stringify({
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresIn: 1800,
        tokenType: 'bearer',
        user: mockUser,
      })
    );

    expect(service.getRefreshToken()).toBe('refresh-123');
  });

  it('should return current user from session', () => {
    localStorage.setItem(
      'auth_session',
      JSON.stringify({
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresIn: 1800,
        tokenType: 'bearer',
        user: mockUser,
      })
    );

    expect(service.getCurrentUser()).toEqual(mockUser);
  });

  it('should return null from getters when localStorage session is invalid JSON', () => {
    localStorage.setItem('auth_session', '{invalid-json');

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should call refresh token endpoint and update session', () => {
    localStorage.setItem(
      'auth_session',
      JSON.stringify({
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token-456',
        expiresIn: 1800,
        tokenType: 'bearer',
        user: mockUser,
      })
    );

    let responseBody: AuthTokenResponse | undefined;

    service.refreshToken().subscribe(response => {
      responseBody = response;
    });

    const req = httpMock.expectOne('http://localhost:8000/v1/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      refresh_token: 'refresh-token-456',
    });

    req.flush(mockAuthResponse);

    expect(responseBody).toEqual(mockAuthResponse);

    const session = JSON.parse(localStorage.getItem('auth_session') ?? '{}');
    expect(session.accessToken).toBe(mockAuthResponse.access_token);
    expect(session.refreshToken).toBe(mockAuthResponse.refresh_token);
    expect(session.user).toEqual(mockUser);
  });

  it('should logout and throw error when refresh token is missing', () => {
    expect(() => service.refreshToken()).toThrowError('Refresh token não encontrado.');

    expect(localStorage.getItem('auth_session')).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith(['/']);
  });

  it('should remove session and navigate to onboarding on logout', () => {
    localStorage.setItem(
      'auth_session',
      JSON.stringify({
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        expiresIn: 1800,
        tokenType: 'bearer',
        user: mockUser,
      })
    );

    service.logout();

    expect(localStorage.getItem('auth_session')).toBeNull();
    expect(navigateMock).toHaveBeenCalledWith(['/']);
  });
});