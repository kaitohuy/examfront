import { TestBed } from '@angular/core/testing';

import { HomeRedirectGuardService } from './home-redirect.guard.service';

describe('HomeRedirectGuardService', () => {
  let service: HomeRedirectGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HomeRedirectGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
