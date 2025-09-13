import {Component, inject, OnInit} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatMenu, MatMenuItem, MatMenuTrigger} from "@angular/material/menu";
import {MatToolbar} from "@angular/material/toolbar";
import {RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {NgForOf} from '@angular/common';

interface WatchedFile {
  file: string;
  display_name: string;
}

interface Manifest {
  outputDir: string;
  files: WatchedFile[];
}

// This should always be located immediately in './assets' and should match the name of 'manifestFileName' as configured
// in './pandoc_util/config.json'.
const manifestFileName = "latex_files.json";

@Component({
  selector: 'app-document-home',
  imports: [
    MatButton,
    MatMenu,
    MatMenuItem,
    MatToolbar,
    MatMenuTrigger,
    RouterLink,
    NgForOf
  ],
  templateUrl: './document-home.component.html',
  styleUrl: './document-home.component.css'
})
export class DocumentHomeComponent implements OnInit {

  latexFiles: WatchedFile[] = [];
  outputDir: string = './assets';

  private readonly http: HttpClient = inject(HttpClient);

  ngOnInit(): void {
    this.http.get<Manifest>(`assets/${manifestFileName}`).subscribe((manifest: Manifest) => {
      // The root of this directory should be './assets'.
      this.outputDir = manifest.outputDir;
      // Unpack the LaTeX files that can be rendered in this application.
      this.latexFiles = manifest.files.sort((a, b) => {
          // Sort the files by their displayed name in Lexicographic order
          return a.display_name.localeCompare(b.display_name)
        }
      );
      //   .map((arrEl: WatchedFile) => {
      //   // Use the map pipe in order to prepend the output directory to each file.
      //   return {
      //     ...arrEl,
      //     file: this.outputDir + arrEl.file,
      //   }
      // });

      console.log("From manifest, got data: ", {
        latexFiles: this.latexFiles,
        outputDir: this.outputDir,
      });
    });
  }

}
