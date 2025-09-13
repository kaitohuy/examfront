import { TestBed } from '@angular/core/testing';

import { HomeRedirectMatchService } from './home-redirect.match.service';

describe('HomeRedirectMatchService', () => {
  let service: HomeRedirectMatchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HomeRedirectMatchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
