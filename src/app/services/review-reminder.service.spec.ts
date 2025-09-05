import { TestBed } from '@angular/core/testing';

import { ReviewReminderService } from './review-reminder.service';

describe('ReviewReminderService', () => {
  let service: ReviewReminderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReviewReminderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
