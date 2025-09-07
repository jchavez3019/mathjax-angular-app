import { Component } from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatMenu, MatMenuItem, MatMenuTrigger} from "@angular/material/menu";
import {MatToolbar} from "@angular/material/toolbar";
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-document-home',
  imports: [
    MatButton,
    MatMenu,
    MatMenuItem,
    MatToolbar,
    MatMenuTrigger,
    RouterLink
  ],
  templateUrl: './document-home.component.html',
  styleUrl: './document-home.component.css'
})
export class DocumentHomeComponent {

}
