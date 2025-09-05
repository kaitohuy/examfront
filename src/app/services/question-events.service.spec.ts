import { TestBed } from '@angular/core/testing';

import { QuestionEventsService } from './question-events.service';

describe('QuestionEventsService', () => {
  let service: QuestionEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuestionEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
