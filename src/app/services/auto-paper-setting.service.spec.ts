import { TestBed } from '@angular/core/testing';

import { AutoPaperSettingService } from './auto-paper-setting.service';

describe('AutoPaperSettingService', () => {
  let service: AutoPaperSettingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutoPaperSettingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
