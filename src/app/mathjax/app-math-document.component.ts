// app-math-document.component.ts
import {Component, inject, Input, OnInit} from '@angular/core';
import { MathJaxConfig, MathJaxService } from './mathjax.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {DocumentMetadata, DocumentService} from './document.service';
import { firstValueFrom } from 'rxjs';
import {JsonPipe, NgIf} from '@angular/common';

@Component({
  selector: 'app-math-document',
  templateUrl: 'app-math-document.component.html',
  styleUrl: 'app-math-document.component.css',
  imports: [NgIf, JsonPipe],
})
export class MathDocumentComponent implements OnInit {
  // Path to the HTML document to be rendered. This should be an HTML document rendered from Pandoc.
  @Input({ required: true }) documentPath!: string;
  // Additional configurations to use with MathJax on this document.
  @Input() mathConfig?: MathJaxConfig;
  // If true, loads the content as soon as the component is initialized.
  @Input() autoLoad = true;
  // If true, displays the MathJax configuration.
  @Input() showConfigInfo = true;

  // Inject services.
  private readonly mathJaxService = inject(MathJaxService);
  private readonly documentService = inject(DocumentService);
  private readonly sanitizer = inject(DomSanitizer);

  loading = false;
  error: string | null = null;
  renderedContent: SafeHtml = '';
  mathStyles: SafeHtml = '';
  showDebugInfo = false;
  debugInfo: any = {};
  mathJaxConfigInfo: any = {};

  /**
   *
   */
  ngOnInit(): void {
    if (this.autoLoad) {
      this.loadDocument();
    }
  }

  /**
   *
   */
  async loadDocument(): Promise<void> {

    try {
      this.loading = true;
      this.error = null;

      // Load document
      const result: { content: string; metadata?: DocumentMetadata } = await firstValueFrom(
        this.documentService.loadDocument(this.documentPath)
      );
      // Unpack the content and metadata of the document.
      const { content, metadata } = result;

      // Merge configurations - metadata takes precedence over component input
      const finalConfig: MathJaxConfig = {
        // First set the fields from the component input.
        ...this.mathConfig,
        // Since the metadata is passed second, it will write over any fields defined by
        // the component input.
        ...metadata?.mathConfig
      };

      console.log('Final MathJax config:', finalConfig);

      // Initialize MathJax with final config
      this.mathJaxService.initialize(finalConfig);

      // Set section if specified in config
      // if (finalConfig.section) {
      //   this.mathJaxService.setSection(finalConfig.section);
      // }

      // Get configuration info for debugging
      this.mathJaxConfigInfo = this.mathJaxService.getConfigInfo();

      // Get and inject styles
      const styles = this.mathJaxService.getStyles();
      this.mathStyles = this.sanitizer.bypassSecurityTrustHtml(styles);

      // Render the document
      console.log('Rendering document content...');
      const renderedHtml = this.mathJaxService.renderDocument(content);
      this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(renderedHtml);

      console.log('Document rendered successfully');

    } catch (error: any) {
      this.error = error.message || 'Failed to load document';
      this.debugInfo = {
        error: error,
        mathJaxConfig: this.mathJaxConfigInfo,
        documentPath: this.documentPath,
        mathJaxReady: this.mathJaxService.isReady()
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

  /**
   * Method to render individual math expressions.
   * @param latex
   */
  renderInlineMath(latex: string): SafeHtml {
    try {
      const html = this.mathJaxService.renderMath(latex, false);
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Error rendering inline math:', error);
      return this.sanitizer.bypassSecurityTrustHtml(
        `<span class="math-error">Error: ${latex}</span>`
      );
    }
  }

  renderDisplayMath(latex: string): SafeHtml {
    try {
      const html = this.mathJaxService.renderMath(latex, true);
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch (error) {
      console.error('Error rendering display math:', error);
      return this.sanitizer.bypassSecurityTrustHtml(
        `<span class="math-error">Error: ${latex}</span>`
      );
    }
  }

}
