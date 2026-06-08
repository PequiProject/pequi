import { TestBed } from '@angular/core/testing';

import { NotificationApi } from './notification-api.service';

describe('NotificationApi', () => {
  let service: NotificationApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
