import { TestBed } from '@angular/core/testing';

import { ExamTaskService } from './exam-task.service';

describe('ExamTaskService', () => {
  let service: ExamTaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExamTaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
