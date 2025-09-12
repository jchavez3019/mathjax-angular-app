// mathjax.service.ts
import {inject, Injectable, Renderer2, RendererFactory2} from '@angular/core';
import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {CHTML} from 'mathjax-full/js/output/chtml.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages.js';
import {BehaviorSubject} from 'rxjs';
import {MathDocument} from 'mathjax-full/js/core/MathDocument.js';
import {OptionList} from 'mathjax-full/js/util/Options.js';
import {DOCUMENT} from '@angular/common';
import {defaultMacros} from './mathjax.macros';
import {LiteElement} from 'mathjax-full/js/adaptors/lite/Element';


export interface MathJaxConfig {
  packages?: string[], // TeX packages to load into the input
  processEnvironments?: boolean,
  processEscapes?: boolean,
  inlineMath?: string[][],
  displayMath?: string[][],
  tags: string,
  macros?: { [key: string]: string },
}

// A document can specify additional packages and macros to be defined, but they should not modify
// any other attributes specified in `MathJaxConfig`.
export interface AdditionalTexOptions {
  packages?: string[];
  macros?: { [key: string]: string },
}

@Injectable({
  providedIn: 'root'
})
export class MathJaxService {

  private adaptor: ReturnType<typeof liteAdaptor> | null = null; // DOM adaptor used by MathJax in Node environments to manipulate HTML and compute styles
  private inputJax: TeX<any, any, any> | null = null; // Configured TeX input processor
  private outputJax: CHTML<any, any, any> | null = null; // Configured CHTML output processor
  private mathDocument: MathDocument<any, any, any> | null = null; // holds global configuration
  private isInitialized: boolean = false; // whether the service has been initialized
  private currentSection: number = 1; // TODO: May remove later
  private mathJaxStyleElement: HTMLStyleElement | null = null;
  private readonly MATHJAX_STYLE_ID = 'mathjax-global-styles';

  // Subject/observable noting the path to the current document that is being rendered. Any documents not matching
  // this path are not rendered. Because this path is subject to change, components that need to render a document
  // must subscribe to this observable and re-render their document upon change.
  private lastRenderedDocumentSubject = new BehaviorSubject<string>('');
  lastRenderedDocument$ = this.lastRenderedDocumentSubject.asObservable();

  private readonly baseConfig: OptionList = {
    packages: AllPackages,
    processEnvironments: true,
    processEscapes: true,
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']],
    tags: 'all',
    macros: defaultMacros,
  };

  // Other injected services
  private readonly renderer: Renderer2;
  private readonly document: Document = inject(DOCUMENT);

  constructor(
    private rendererFactory: RendererFactory2,
  ) {
    // We use a renderer in order to globally set the CSS that is required to properly view the current document.
    // NOTE: All documents from MathJax have some base CSS styling with additional dynamic styling that is specific to the
    // document. Naturally, it would be nice to cache this base styling and only every update the dynamic styling,
    // but I currently have not found a method that returns the styling in an organized fashion.
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  /**
   * Initialize the MathJax service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create the lite adaptor for DOM manipulation
      this.adaptor = liteAdaptor();
      RegisterHTMLHandler(this.adaptor);

      // Create the CHTML output processor
      this.outputJax = new CHTML({
        fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2'
      });

      // This is the end of our initialization
      this.isInitialized = true;
      console.log('MathJax service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MathJax:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Reset and create fresh MathJax components
   * This ensures clean state between document renders
   * @param inputConfig
   */
  private resetMathJaxState(inputConfig?: AdditionalTexOptions): TeX<any, any, any> {
    // Create fresh input processor with clean state
    let inputJax: TeX<any, any, any>;

    if (!!inputConfig) {
      // We were given additional input configuration values to use
      // for rendering the document. Merge them with the default
      // configuration.

      let configurePackages;
      if (this.baseConfig['packages'] != AllPackages) {
        // Merge the lists of packages that will be used.
        configurePackages = Array.from(new Set([
          ...this.baseConfig['packages'],
          ...inputConfig['packages'] ?? []
        ]));
      } else {
        // We are using all the packages, there's no need to merge the list.
        configurePackages = AllPackages;
      }

      // Merge the macro definitions. The definitions given in the input take precedence over
      // any duplicate definitions in the base configuration.
      const mergedMacros = {
        ...this.baseConfig['macros'],
        ...inputConfig['macros'] ?? {},
      };

      inputJax = new TeX({
        // Fill in the base configuration first
        ...this.baseConfig,
        // Overwrite any necessary values
        packages: configurePackages,
        macros: mergedMacros,
      });
    } else {
      // No configuration given. Use the default configuration.
      inputJax = new TeX(this.baseConfig);
    }

    return inputJax;
  }

  /**
   * Render a document with MathJax. Important to note, this service takes care of manually updating the global
   * CSS for the document that is currently being rendered, hence we only return the HTML necessary for the document.
   * @param documentPath
   * @param htmlContent
   * @param renderConfig
   */
  async renderDocument(
    documentPath: string,
    htmlContent: string,
    renderConfig?: AdditionalTexOptions,
  ): Promise<string> {

    // Initialize the service if not done already
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If the string is empty, return an empty string with no styling by default
    if (htmlContent.trim() === '') {
      return '';
    }

    try {
      // Reset the input TeX processor.
      // We only care about the 'packages' and 'macros' attributes. All other fields should be left untouched.
      const renderConfigSubset: AdditionalTexOptions | undefined = !!renderConfig ? {
        packages: renderConfig['packages'] ?? [],
        macros: renderConfig['macros'] ?? {},
      } : undefined;
      const inputJax: TeX<any, any, any> = this.resetMathJaxState(renderConfigSubset);

      // Create a new document with the fresh input processor
      const doc: MathDocument<any, any, any> = mathjax.document(htmlContent, {
        InputJax: inputJax,
        OutputJax: this.outputJax,
      });

      // Render the content using our Jax input and output configuration
      doc.findMath().compile().getMetrics().typeset().updateDocument();

      // Return the processed HTML content and the CSS styling to render the
      // content cleanly
      let mathHTML: string = this.adaptor!.outerHTML(this.adaptor!.body(doc.document));
      const mathCSS: string = this.adaptor!.textContent(this.outputJax!.styleSheet(doc) as LiteElement);

      // correct the anchor links
      mathHTML = this.fixAnchorLinks(documentPath, mathHTML);

      // Update the global styling sheet with the newly rendered CSS
      this.injectGlobalMathJaxStyles(mathCSS);

      console.log("Document rendered successfully", {
        mathHTML: mathHTML,
        mathCSS: mathCSS,
        documentPath: documentPath,
      });

      // Emit that a new document has been rendered.
      this.lastRenderedDocumentSubject.next(documentPath);
      return mathHTML;
    } catch (error) {
      console.error('Document rendering error:', error);
      return '';
    }
  }

  /**
   * Inject MathJax CSS globally into the document head. When the css input is not defined or an empty string,
   * this method simply removes any current css styling defined globally for mathjax.
   * @param css -- The new styling to use for MathJax in string format.
   */
  private injectGlobalMathJaxStyles(css: string): void {

    // Remove existing styles
    this.removeGlobalMathJaxStyles();

    // Immediately return if we are not given any CSS styling.
    if (!css || css.trim() === '') {
      return;
    }

    // Create and inject new style element
    this.mathJaxStyleElement = this.renderer.createElement('style');
    this.renderer.setAttribute(this.mathJaxStyleElement, 'id', this.MATHJAX_STYLE_ID);
    this.renderer.setAttribute(this.mathJaxStyleElement, 'type', 'text/css');
    this.renderer.appendChild(this.mathJaxStyleElement, this.renderer.createText(css));
    this.renderer.appendChild(this.document.head, this.mathJaxStyleElement);
  }

  /**
   * Remove any existing global MathJax styles
   */
  private removeGlobalMathJaxStyles(): void {
    // Primary manner of removing the styling by reference
    if (this.mathJaxStyleElement) {
      this.renderer.removeChild(this.document.head, this.mathJaxStyleElement);
      this.mathJaxStyleElement = null;
      return;
    }

    // Fallback manner of removing the styling by id in case the reference above is lost
    const existingStyle = this.document.getElementById(this.MATHJAX_STYLE_ID);
    if (existingStyle) {
      this.renderer.removeChild(this.document.head, existingStyle);
    }
  }

  /**
   * The MathJax module in this service does not consistently provide the correct anchor references for equation
   * references. Instead, we must manually fix this in the HTML by appending the anchor to the correct URL.
   * TODO:
   *  It would be nice to figure out why the MathJax npm package does not format the anchors correctly in Angular.
   *  If possible, it would be nice to get an explanation somehow, and if possible, find a better remedy instead
   *  of manually updating the HTML as this is not a good practice.
   *  If possible, this method should be deprecated if a cleaner alternative exists.
   * @param location -- Correct URL of the document before adding the anchor.
   * @param html -- The rendered HTML from MathJax which we will modify.
   * @private
   */
  private fixAnchorLinks(location: string, html: string): string {
    console.log(`Location given for html replacing: ${location}`);
    return html.replace(/href=(["'])(?:https?:\/\/[^/#]+)?\/?#([^"']+)\1/g, `href=$1${location}#$2$1`);
  }

  /**
   * Returns whether the service has been initialized.
   * Only returns false when the service has failed to initialize.
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset the service to initial state
   */
  reset(): void {
    this.isInitialized = false;
    this.adaptor = null;
    this.inputJax = null;
    this.outputJax = null;
    this.mathDocument = null;
    this.currentSection = 1;
    this.removeGlobalMathJaxStyles();
    this.lastRenderedDocumentSubject.complete();
  }

  /**
   * Get configuration information for debugging
   */
  getConfigInfo(): { [key: string]: any } {
    return {
      isInitialized: this.isInitialized,
      hasAdaptor: !!this.adaptor,
      hasInputJax: !!this.inputJax,
      hasOutputJax: !!this.outputJax,
      hasMathDocument: !!this.mathDocument,
      currentSection: this.currentSection,
      macroCount: this.inputJax?.parseOptions?.options?.["macros"] ?
        Object.keys(this.inputJax.parseOptions.options["macros"]).length : 0
    };
  }
}
