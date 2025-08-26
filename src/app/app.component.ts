import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExampleUsageComponent } from './mathjax/example-usage.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ExampleUsageComponent],
  template: `
    <app-example-usage></app-example-usage>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  title = 'mathjax-angular19';
}
