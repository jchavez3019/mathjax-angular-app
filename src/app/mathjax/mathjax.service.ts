// mathjax.service.ts
import {inject, Injectable, Renderer2, RendererFactory2} from '@angular/core';
import {mathjax} from '@mathjax/src/js/mathjax.js';
import {TeX} from '@mathjax/src/js/input/tex.js';
import {CHTML} from '@mathjax/src/js/output/chtml.js';
import {SVG} from '@mathjax/src/js/output/svg.js';
import {LiteAdaptor, liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/util/asyncLoad/esm.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js';
import '@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js';
import '@mathjax/src/js/input/tex/configmacros/ConfigMacrosConfiguration.js';
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js';
// import {MathList} from '@mathjax/src/js/core/MathList.js';
// import {MathItem} from '@mathjax/src/js/core/MathItem.js';
import {BehaviorSubject} from 'rxjs';
import {MathDocument} from '@mathjax/src/js/core/MathDocument.js';
import {OptionList} from '@mathjax/src/js/util/Options.js';
import {DOCUMENT} from '@angular/common';

// These are all the options that may be used to configure Tex for the service
export interface MathJaxConfig {
  packages?: string[];
  macros?: { [key: string]: string };
  tags?: 'none' | 'ams' | 'all';
  tagSide?: 'right' | 'left';
  tagIndent?: string;
  section?: number;
}

// A document can specify additional packages and macros to be defined, but they should not modify
// any other attributes specified in `MathJaxConfig`.
export interface AdditionalTexOptions {
  packages?: string[];
    macros?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class MathJaxService {

  private adaptor: LiteAdaptor | null = null; // DOM adaptor used by MathJax in Node environments to manipulate HTML and compute styles
  private inputJax: TeX<any, any, any> | null = null; // Configured TeX input processor
  private outputJax: CHTML<any, any, any> | null = null; // Configured CHTML output processor
  private mathDocument: MathDocument<any, any, any> | null = null; // holds global configuration
  private isInitialized: boolean = false; // whether the service has been initialized
  private currentSection: number = 1; // TODO: May remove later
  private mathJaxStyleElement: HTMLStyleElement | null = null;
  private readonly MATHJAX_STYLE_ID = 'mathjax-global-styles';

  private baseConfig: OptionList = {};

  // Subject/observable defining in string format the CSS styling to use
  // in order to correctly view the rendered Latex output.
  private cssStylingSubject = new BehaviorSubject<string>('');
  cssStyling$ = this.cssStylingSubject.asObservable();

  // Subject/observable noting the path to the current document that is being rendered. Any documents not matching
  // this path are not rendered. Because this path is subject to change, components that need to render a document
  // must subscribe to this observable and re-render their document upon change.
  private lastRenderedDocumentSubject = new BehaviorSubject<string>('');
  lastRenderedDocument$ = this.lastRenderedDocumentSubject.asObservable();

  private defaultMacros = {
    // Greek letters
    'uupsilon': '\\pmb{\\upsilon}',
    'llambda': '\\pmb{\\lambda}',
    'bbeta': '\\pmb{\\beta}',
    'aalpha': '\\pmb{\\alpha}',
    'zzeta': '\\pmb{\\zeta}',
    'etaeta': '\\boldsymbol{\\eta}',
    'xixi': '\\boldsymbol{\\xi}',
    'ep': '\\boldsymbol{\\epsilon}',
    'DEL': '\\boldsymbol{\\Delta}',
    'PHI': '\\boldsymbol{\\Phi}',
    'PI': '\\boldsymbol{\\Pi}',
    'LAM': '\\boldsymbol{\\Lambda}',
    'LAMm': '\\mathbb{L}',
    'GAM': '\\boldsymbol{\\Gamma}',
    'OMG': '\\boldsymbol{\\Omega}',
    'SI': '\\boldsymbol{\\Sigma}',
    'TH': '\\boldsymbol{\\Theta}',
    'UPS': '\\boldsymbol{\\Upsilon}',
    'XI': '\\boldsymbol{\\Xi}',

    // Matrix/vector notation
    'AA': '\\mathbf{A}', 'aa': '\\mathbf{a}',
    'BB': '\\mathbf{B}', 'bb': '\\mathbf{b}',
    'CC': '\\mathbf{C}', 'cc': '\\mathbf{c}',
    'DD': '\\mathbf{D}', 'dd': '\\mathbf{d}',
    'EE': '\\mathbf{E}', 'ee': '\\mathbf{e}',
    'FF': '\\mathbf{F}', 'ff': '\\mathbf{f}',
    'GG': '\\mathbf{G}', 'gg': '\\mathbf{g}',
    'HH': '\\mathbf{H}', 'hh': '\\mathbf{h}',
    'II': '\\mathbf{I}', 'ii': '\\mathbf{i}',
    'IIm': '\\mathbf{I}',
    'JJ': '\\mathbf{J}',
    'KK': '\\mathbf{K}',
    'LL': '\\mathbf{L}', 'll': '\\mathbf{l}',
    'MM': '\\mathbf{M}', 'mm': '\\mathbf{m}',
    'OO': '\\mathbf{O}',
    'PP': '\\mathbf{P}', 'pp': '\\mathbf{p}',
    'QQ': '\\mathbf{Q}', 'qq': '\\mathbf{q}',
    'RR': '\\mathbf{R}', 'rr': '\\mathbf{r}',
    'SS': '\\mathbf{S}',
    'TT': '\\mathbf{T}',
    'UU': '\\mathbf{U}', 'uu': '\\mathbf{u}',
    'VV': '\\boldsymbol{V}', 'vv': '\\boldsymbol{v}',
    'WW': '\\boldsymbol{W}', 'ww': '\\boldsymbol{w}',
    'XX': '\\boldsymbol{X}', 'xx': '\\boldsymbol{x}',
    'YY': '\\boldsymbol{Y}', 'yy': '\\boldsymbol{y}',
    'ZZ': '\\mathbf{Z}', 'zz': '\\mathbf{z}',

    // Special symbols
    'zer': '\\boldsymbol{0}',

    // Functions
    'E': '\\mathrm{E}',
    'EXy': '\\mathrm{E}_{\\mathbf{XY}}',
    'N': '\\mathrm{N}',
    'MVN': '\\mathrm{MVN}',
    'chol': '\\mathrm{chol}',
    'vec': '\\mathrm{vec}',
    'var': '\\mathrm{Var}',
    'cov': '\\mathrm{Cov}',
    'diag': '\\mathrm{diag}',
    'trace': '\\mathrm{trace}',
    'dg': '\\mathrm{dg}',

    // Alternative definitions
    'Ab': '\\mathbf{D}', 'Aa': '\\mathbf{d}', 'Am': '\\boldsymbol{\\Pi}',
    'Bb': '\\mathbf{J}', 'Ba': '\\mathbf{L}', 'Bm': '\\boldsymbol{\\Upsilon}',
    'Ca': '\\Delta', 'Cb': '\\boldsymbol{\\Gamma}',
    'Ub': '\\mathbf{C}', 'Ua': '\\mathbf{c}', 'Um': '\\boldsymbol{\\Upsilon}',
    'Qb': '\\mathbf{G}', 'Qm': '\\mathbb{Q}',
    'Rb': '\\mathbf{H}', 'Rm': '\\mathbb{R}',
    'Zb': '\\mathbf{M}', 'Za': '\\mathbf{N}', 'Zm': '\\boldsymbol{\\Xi}',

    // Tilde notation
    'hatxt': '\\widetilde{\\mathbf{x}}_t',
    'hatxtmt': '\\widetilde{\\mathbf{x}}_{t,t-1}',
    'hatxone': '\\widetilde{\\mathbf{x}}_1',
    'hatxzero': '\\widetilde{\\mathbf{x}}_0',
    'hatxtm': '\\widetilde{\\mathbf{x}}_{t-1}',
    'hatxQtm': '\\widetilde{\\mathbb{x}}_{t-1}',
    'hatyt': '\\widetilde{\\mathbf{y}}_t',
    'hatyone': '\\widetilde{\\mathbf{y}}_1',
    'hatwt': '\\widetilde{\\mathbf{w}}_t',
    'hatOt': '\\widetilde{\\mathbf{O}}_t',
    'hatWt': '\\widehat{\\boldsymbol{W}}_t',
    'hatWtp': '\\widehat{\\boldsymbol{W}}_{t+1}',
    'hatwtp': '\\widehat{\\boldsymbol{w}}_{t+1}',
    'hatVt': '\\widehat{\\boldsymbol{V}}_t',
    'hatUtT': '\\widehat{\\boldsymbol{U}}_t^T',
    'hatvt': '\\widehat{\\boldsymbol{v}}_t',
    'hatPt': '\\widetilde{\\mathbf{P}}_t',
    'hatUt': '\\widetilde{\\mathbf{U}}_t',
    'hatPtm': '\\widetilde{\\mathbf{P}}_{t-1}',
    'hatPQtm': '\\widetilde{\\mathbb{P}}_{t-1}',
    'hatPttm': '\\widetilde{\\mathbf{P}}_{t,t-1}',
    'hatPQttm': '\\widetilde{\\mathbb{P}}_{t,t-1}',
    'hatPtmt': '\\widetilde{\\mathbf{P}}_{t-1,t}',
    'hatVtT': '\\widetilde{\\boldsymbol{V}}_t^T',
    'hatVtpT': '\\widetilde{\\boldsymbol{V}}_{t+1}^T',
    'hatVtmT': '\\widetilde{\\boldsymbol{V}}_{t-1}^T',
    'hatVtt': '\\widetilde{\\boldsymbol{V}}_t^t',
    'hatStt': '\\widetilde{\\boldsymbol{S}}_t^t',
    'hatStT': '\\widetilde{\\boldsymbol{S}}_t^T',
    'hatVttm': '\\widetilde{\\boldsymbol{V}}_{t,t-1}',
    'hatVttmT': '\\widetilde{\\boldsymbol{V}}_{t,t-1}^T',
    'hatVttpT': '\\widetilde{\\boldsymbol{V}}_{t,t+1}^T',
    'hatVtptT': '\\widetilde{\\boldsymbol{V}}_{t,t+1}^T',
    'hatSttm': '\\widetilde{\\boldsymbol{S}}_{t,t-1}',
    'hatVtmtT': '\\widetilde{\\boldsymbol{V}}_{t,t-1}^T',
    'hatStmtT': '\\widetilde{\\boldsymbol{S}}_{t,t-1}^T',
    'hatSttmT': '\\widetilde{\\boldsymbol{S}}_{t,t-1}^T',
    'hatSttpT': '\\widetilde{\\boldsymbol{S}}_{t,t+1}^T',

    // More complex notation
    'hatxtT': '\\widetilde{\\boldsymbol{x}}_t^T',
    'hatxtpT': '\\widetilde{\\boldsymbol{x}}_{t+1}^T',
    'hatxtt': '\\widetilde{\\boldsymbol{x}}_t^{t}',
    'hatxttm': '\\widetilde{\\boldsymbol{x}}_t^{t-1}',
    'hatxtmT': '\\widetilde{\\boldsymbol{x}}_{t-1}^T',
    'hatxtmt1': '\\widetilde{\\boldsymbol{x}}_{t-1}^{t-1}',
    'hatxtpt1': '\\widetilde{\\boldsymbol{x}}_{t+1}^{t-1}',

    // Check/overline notation
    'checkWt': '\\overline{\\boldsymbol{W}}_t',
    'checkWtp': '\\overline{\\boldsymbol{W}}_{t+1}',
    'checkwt': '\\overline{\\boldsymbol{w}}_t',
    'checkwtp': '\\overline{\\boldsymbol{w}}_{t+1}',
    'checkvt': '\\overline{\\boldsymbol{v}}_t',
    'checkvtp': '\\overline{\\boldsymbol{v}}_{t+1}',
    'checkVtp': '\\overline{\\boldsymbol{V}}_{t+1}',
    'checkVt': '\\overline{\\boldsymbol{V}}_t',

    // Dot notation
    'dotvt': '\\dot{\\boldsymbol{v}}_t',
    'dotvtp': '\\dot{\\boldsymbol{v}}_{t+1}',
    'dotVtp': '\\dot{\\boldsymbol{V}}_{t+1}',
    'dotVt': '\\dot{\\boldsymbol{V}}_t',
    'YYr': '\\dot{\\boldsymbol{Y}}',
    'yyr': '\\dot{\\boldsymbol{y}}',
    'aar': '\\dot{\\mathbf{a}}',
    'ZZr': '\\dot{\\mathbf{Z}}',
    'RRr': '\\dot{\\mathbf{R}}',

    // Misc
    'IR': '\\nabla',
    'R': 'R',
    'Ss': '\\mathbf{S}'
  };

  private defaultTexPackages: string[] = [
    'base', // Core TeX package which provides the essential TeX math commands.
    'ams', // Adds features such as align, gather, multline, cases, and extra math symbols
    'newcommand', // Enables custom macros using \newcommand, \renewcommand, and \def
    'noundefined', // Throws errors for undefined TeX commands
    'configmacros', // Allows for predefined macros in the MathJax configuration
    'boldsymbol', // Adds support for bolding individual math symbols
  ];

  // Other injected services
  private readonly renderer: Renderer2;
  private readonly document: Document = inject(DOCUMENT);

  constructor(
    private rendererFactory: RendererFactory2,
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  /**
   *
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.baseConfig = {
        packages: this.defaultTexPackages,
        macros: this.defaultMacros,
        processEnvironments: true,
        processEscapes: true,
        inlineMath: [['\\(', '\\)'], ['$', '$']],
        displayMath: [['\\[', '\\]'], ['$$', '$$']],
        tags: 'all',
      }

      this.adaptor = liteAdaptor();
      RegisterHTMLHandler(this.adaptor);

      this.outputJax = new CHTML({
        fontURL: 'https://cdn.jsdelivr.net/npm/@mathjax/mathjax-newcm-font/chtml/woff2'
      });

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
      inputJax = new TeX({
        // Fill in the base configuration first
        ...this.baseConfig,
        // Overwrite any necessary values
        packages: Array.from(new Set([
          ...this.baseConfig['packages'],
          ...inputConfig['packages'] ?? []
        ])),
        macros: {
          ...this.baseConfig['macros'],
          ...inputConfig['macros'] ?? {},
        },
      });
    }
    else {
      // No configuration given. Use the default configuration.
      inputJax = new TeX(this.baseConfig);
    }

    return inputJax;
  }

  /**
   *
   * @param documentPath
   * @param htmlContent
   * @param renderConfig
   */
  async renderDocument(
    documentPath: string, htmlContent: string, renderConfig?: AdditionalTexOptions,
  ): Promise<{mathHTML: string, mathCSS: string}> {

    // Initialize the service if not done already
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If the string is empty, return an empty string with no styling by default
    if (htmlContent.trim() === '') {
      return {mathHTML: '', mathCSS: ''};
    }

    try {

      // Reset the input TeX processor
      const inputJax = this.resetMathJaxState(renderConfig);

      // Create a new document with the fresh input processor
      const doc = mathjax.document(htmlContent, {
        InputJax: inputJax,
        OutputJax: this.outputJax,
      });

      // Render the content using our Jax input and output configuration
      await doc.renderPromise();

      // Return the processed HTML content and the CSS styling to render the
      // content cleanly
      const mathHTML = this.adaptor!.outerHTML(this.adaptor!.body(doc.document));
      const mathCSS = this.adaptor!.cssText(this.outputJax!.styleSheet(doc));

      // correct the anchor links
      const correctedMathHTML = this.fixAnchorLinks(documentPath, mathHTML);

      // Update the global styling sheet with the newly rendered CSS
      this.injectGlobalMathJaxStyles(mathCSS);

      console.log("Rendered document", {
        mathHTML: correctedMathHTML,
        uncorrectedMathHTML: mathHTML,
        mathCSS: mathCSS,
      });
      // Emit that a new document has been rendered.
      this.lastRenderedDocumentSubject.next(documentPath);
      return { mathHTML: correctedMathHTML, mathCSS: mathCSS }
    } catch (error) {
      console.error('Document rendering error:', error);
      return {mathHTML: '', mathCSS: ''};
    }
  }

  /**
   * Inject MathJax CSS globally into the document head
   */
  private injectGlobalMathJaxStyles(css: string): void {
    // Remove existing styles
    this.removeGlobalMathJaxStyles();

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
   * Remove global MathJax styles
   */
  private removeGlobalMathJaxStyles(): void {

    // Primary manner of removing the styling by reference
    if (this.mathJaxStyleElement) {
      this.renderer.removeChild(this.document.head, this.mathJaxStyleElement);
      this.mathJaxStyleElement = null;
      return
    }

    // Fallback manner of removing the styling by id in case the reference above is lost
    const existingStyle = this.document.getElementById(this.MATHJAX_STYLE_ID);
    if (existingStyle) {
      this.renderer.removeChild(this.document.head, existingStyle);
    }
  }

  /**
   * This MathJax renderer in this service does not consistently provide the correct anchor references for equation
   * references. Instead, we must manually fix this in the HTML by appending the anchor to the correct URL.
   * @param location -- Correct URL of the document before adding the anchor.
   * @param html -- The rendered HTML from MathJax which we will modify.
   * @private
   */
  private fixAnchorLinks(location: string, html: string): string {
    console.log(`Location given for html replacing: ${location}`)
    return html.replace(/href=(["'])(?:https?:\/\/[^/#]+)?\/?#([^"']+)\1/g, `href=$1${location}#$2$1`);
  }

  /**
   * GIven a string of Latex, returns the HTML of the rendered result in string format.
   * TODO: (9/4/25)
   *  Test this function more thoroughly. Currently, renderDocument is the main utilized method,
   *  but this method may have merit in some situations as well.
   * @param latex
   * @param display
   */
  // renderMath(latex: string, display: boolean = false): string {
  //   if (!this.isInitialized) {
  //     this.initialize();
  //   }
  //
  //   if (!latex || latex.trim() === '') {
  //     return '';
  //   }
  //
  //   try {
  //     // Wrap the LaTeX appropriately
  //     const mathText = display ? `\\[${latex}\\]` : `\\(${latex}\\)`;
  //
  //     // Create a temporary document for this single expression
  //     const tempDoc = mathjax.document(mathText, {
  //       InputJax: this.inputJax,
  //       OutputJax: this.outputJax,
  //       // adaptor: this.adaptor
  //     });
  //
  //     // Process the math
  //     tempDoc.findMath().compile().getMetrics().typeset().updateDocument();
  //
  //     // Get the rendered result
  //     const mathElements: MathList<any, any, any> = tempDoc.math;
  //     const arr: MathItem<HTMLElement, Text, Document>[] = Array.from(
  //       mathElements as Iterable<MathItem<HTMLElement, Text, Document>>
  //     );
  //
  //     if (arr.length === 0) {
  //       throw new Error('No math expressions found');
  //     }
  //
  //     return this.adaptor!.outerHTML(arr[0].typesetRoot);
  //   } catch (error) {
  //     console.error('MathJax rendering error:', error);
  //     return `<span class="math-error">Error rendering: ${latex}</span>`;
  //   }
  // }

  /**
   *
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   *
   */
  reset(): void {
    this.isInitialized = false;
    this.adaptor = null;
    this.inputJax = null;
    this.outputJax = null;
    this.mathDocument = null;
    this.currentSection = 1;
    this.removeGlobalMathJaxStyles();
    this.cssStylingSubject.complete();
    this.lastRenderedDocumentSubject.complete();
  }

  /**
   *
   */
  getConfigInfo(): any {
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
