import { TestBed } from '@angular/core/testing';

import { NavEpochService } from './nav-epoch.service';

describe('NavEpochService', () => {
  let service: NavEpochService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavEpochService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
