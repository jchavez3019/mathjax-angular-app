import {RouterModule, Routes} from '@angular/router';
import {MathDocumentComponent} from './mathjax/app-math-document.component';
import {DocumentHomeComponent} from './document-home/document-home.component';
import {NgModule} from '@angular/core';

export const routes: Routes = [
  // Add your routes here
  { path: 'document', component: MathDocumentComponent },
  {path: '', component: DocumentHomeComponent, pathMatch: 'full'},
  {path: '**', redirectTo: ''}
];
