// app-math-document.component.ts
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Input,
  NgZone,
  OnInit,
  Renderer2, ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {MathJaxConfig, MathJaxService} from './mathjax.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {DocumentMetadata, DocumentService} from './document.service';
import {firstValueFrom, map, filter} from 'rxjs';
import {JsonPipe, NgIf} from '@angular/common';
import {ActivatedRoute, Params, UrlSegment} from '@angular/router';

@Component({
  selector: 'app-math-document',
  templateUrl: 'app-math-document.component.html',
  styleUrl: 'app-math-document.component.css',
  imports: [NgIf, JsonPipe],
  encapsulation: ViewEncapsulation.None
})
export class MathDocumentComponent implements OnInit {

  // Path to the HTML document to be rendered. This should be an HTML document rendered from Pandoc.
  // @Input({ required: true }) documentPath!: string;
  private documentPath: string | null= null;
  // Additional configurations to use with MathJax on this document.
  @Input() mathConfig?: MathJaxConfig;
  // If true, displays the MathJax configuration.
  @Input() showConfigInfo = true;

  // Inject services.
  private readonly mathJaxService = inject(MathJaxService);
  private readonly documentService = inject(DocumentService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly elementRef = inject(ElementRef);
  private readonly route = inject(ActivatedRoute);

  loading = false;
  error: string | null = null;
  renderedContent: SafeHtml = '';
  showDebugInfo = false;
  debugInfo: any = {};
  mathJaxConfigInfo: any = {};
  urlPath: string = '';

  // urlPath: Observable<UrlSegment[]> = null;

  /**
   *
   */
  async ngOnInit(): Promise<void> {

    this.route.paramMap.subscribe(param => {
      this.documentPath = param.get('documentPath');
      this.urlPath = window.location.href;
      console.log('Full URL as in browser for this document:', this.urlPath);

      this.loadDocument();
    });

    // const url_query: Params = await firstValueFrom(this.route.queryParams);
    // this.urlPath = window.location.href;
    // this.documentPath = url_query['path'];

    // console.log('Full URL as in browser for this document:', this.urlPath);

    // this.loadDocument();

    // firstValueFrom(
    //   this.mathJaxService.cssStyling$.pipe(
    //     // Filter out the style if it is an empty string
    //     filter((style: string) => style !== ''),
    //     // Map the style to a SafeHtml data type so that we can insert it into the document
    //     map<string, SafeHtml>((style: string) => this.sanitizer.bypassSecurityTrustHtml(style)),
    //   )
    // ).then((style: SafeHtml) => {
    //   // Once we get the first emission of the MathJax css styling, inject it into the document
    //   this.mathStyles = style;
    // });

  }

  /**
   *
   */
  async loadDocument(): Promise<void> {

    try {
      this.loading = true;
      this.error = null;

      if (this.documentPath == null) {
        console.error("Document Path was empty.")
      }

      console.log(`Loading document with path: ${this.documentPath}`);

      // Load the document and unpack its contents
      const { content: docContent, metadata: docMetadata } = await firstValueFrom(
        this.documentService.loadDocument(this.documentPath!)
      );

      // // Merge configurations - metadata takes precedence over component input
      // const finalConfig: MathJaxConfig = {
      //   // First set the fields from the component input.
      //   ...this.mathConfig,
      //   // Since the metadata is passed second, it will write over any fields defined by
      //   // the component input.
      //   ...docMetadata?.mathConfig
      // };
      //
      // console.log('Final MathJax config:', finalConfig);

      // Get configuration info for debugging
      this.mathJaxConfigInfo = this.mathJaxService.getConfigInfo();

      // Render the document and unpack its results.
      console.log('Rendering document content...');
      const renderedHtml = await this.mathJaxService.renderDocument(this.urlPath, docContent);
      this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(renderedHtml);
    } catch (error: any) {
      this.error = error.message || 'Failed to load document';
      this.debugInfo = {
        error: error,
        mathJaxConfig: this.mathJaxConfigInfo,
        documentPath: this.documentPath,
        // mathJaxReady: this.mathJaxService.isReady()
      };
      console.error('Document loading error:', error);
    } finally {
      this.loading = false;
    }
  }

  retry(): void {
    // Reset MathJax service before retrying
    this.mathJaxService.reset();
    this.loadDocument();
  }

  toggleDebugInfo(): void {
    this.showDebugInfo = !this.showDebugInfo;
  }

  // TODO:
  //  Would like to keep the methods below, but need to figure out and test how to properly
  //  render individual LaTeX expressions.

  /**
   * Method to render individual math expressions.
   * @param latex
   */
  // async renderInlineMath(latex: string): Promise<SafeHtml> {
  //   try {
  //     const html = await this.mathJaxService.renderMath(latex, false);
  //     return this.sanitizer.bypassSecurityTrustHtml(html);
  //   } catch (error) {
  //     console.error('Error rendering inline math:', error);
  //     return this.sanitizer.bypassSecurityTrustHtml(
  //       `<span class="math-error">Error: ${latex}</span>`
  //     );
  //   }
  // }
  //
  // async renderDisplayMath(latex: string): Promise<SafeHtml> {
  //   try {
  //     const html = await this.mathJaxService.renderMath(latex, true);
  //     return this.sanitizer.bypassSecurityTrustHtml(html);
  //   } catch (error) {
  //     console.error('Error rendering display math:', error);
  //     return this.sanitizer.bypassSecurityTrustHtml(
  //       `<span class="math-error">Error: ${latex}</span>`
  //     );
  //   }
  // }

}
