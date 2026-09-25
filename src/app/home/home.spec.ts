import { TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Home] }).compileComponents();
  });

  it('should render the context-path heading', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('GitHub Pages context-path demo');
  });

  it('should default to production environment at root base href', () => {
    const fixture = TestBed.createComponent(Home);
    const cmp = fixture.componentInstance as unknown as { environmentLabel: () => string };
    expect(cmp.environmentLabel()).toBe('production');
  });
});
