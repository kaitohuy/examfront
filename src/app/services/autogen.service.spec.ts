import { TestBed } from '@angular/core/testing';

import { AutogenService } from './autogen.service';

describe('AutogenService', () => {
  let service: AutogenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutogenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
