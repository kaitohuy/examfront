import { TestBed } from '@angular/core/testing';

import { NotificationUrlResolverService } from './notification-url-resolver.service';

describe('NotificationUrlResolverService', () => {
  let service: NotificationUrlResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationUrlResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
