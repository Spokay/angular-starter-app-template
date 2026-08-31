import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideTestingEnvironment } from '../../../testing/test-providers';

import { ErrorPage } from './error-page';

describe('ErrorPage', () => {
  let component: ErrorPage;
  let fixture: ComponentFixture<ErrorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorPage],
      providers: [provideTestingEnvironment()],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
