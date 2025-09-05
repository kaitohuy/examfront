import { TestBed } from '@angular/core/testing';

import { FileArchiveService } from './file-archive.service';

describe('FileArchiveService', () => {
  let service: FileArchiveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileArchiveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
