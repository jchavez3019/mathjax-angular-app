import { Component } from '@angular/core';
import {RouterOutlet} from '@angular/router';
// import { ExampleUsageComponent } from './mathjax/example-usage.component';

@Component({
  selector: 'app-root',
  standalone: true,
  // imports: [RouterOutlet, ExampleUsageComponent, MathDocumentComponent],
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'mathjax-angular19';
}
