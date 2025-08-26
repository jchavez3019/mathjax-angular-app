import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { ExampleUsageComponent } from './mathjax/example-usage.component';
import {MathDocumentComponent} from './mathjax/app-math-document.component';

@Component({
  selector: 'app-root',
  standalone: true,
  // imports: [RouterOutlet, ExampleUsageComponent, MathDocumentComponent],
  imports: [RouterOutlet, MathDocumentComponent],
  template: `
<!--    <app-example-usage></app-example-usage>-->
    <app-math-document documentPath="/assets/output.html"></app-math-document>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  title = 'mathjax-angular19';
}
