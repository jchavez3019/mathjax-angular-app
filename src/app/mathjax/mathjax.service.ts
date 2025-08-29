// mathjax.service.ts
import { Injectable } from '@angular/core';
import {mathjax} from '@mathjax/src/js/mathjax.js';
import {TeX} from '@mathjax/src/js/input/tex.js';
import {CHTML} from '@mathjax/src/js/output/chtml.js';
import {SVG} from '@mathjax/src/js/output/svg.js';
import {liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';
import '@mathjax/src/js/util/asyncLoad/esm.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js';
import '@mathjax/src/js/input/tex/noundefined/NoUndefinedConfiguration.js';
import '@mathjax/src/js/input/tex/configmacros/ConfigMacrosConfiguration.js';
import '@mathjax/src/js/input/tex/boldsymbol/BoldsymbolConfiguration.js';
import {MathList} from '@mathjax/src/js/core/MathList.js';
import {MathItem} from '@mathjax/src/js/core/MathItem.js';

export interface MathJaxConfig {
  packages?: string[];
  macros?: { [key: string]: string };
  tags?: 'none' | 'ams' | 'all';
  tagSide?: 'right' | 'left';
  tagIndent?: string;
  section?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MathJaxService {
  private adaptor: any;
  private inputJax: any;
  private outputJax: any;
  private mathDocument: any;
  private isInitialized = false;
  private currentSection = 1;

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

  /**
   *
   * @param config
   */
  initialize(config?: MathJaxConfig): void {
    if (this.isInitialized) return;

    try {
      // Create adaptor
      this.adaptor = liteAdaptor();
      RegisterHTMLHandler(this.adaptor);

      // Use AllPackages or a minimal set for better compatibility
      // const packages: string[] = config?.packages || AllPackages;

      // Create TeX input jax with correct configuration structure
      // this.inputJax = new TeX({
      //   packages: packages,
      //   inlineMath: [['\\(', '\\)'], ['$', '$']],
      //   displayMath: [['\\[', '\\]'], ['$$', '$$']],
      //   processEscapes: true,
      //   processEnvironments: true,
      //   tags: config?.tags || 'ams',
      //   tagSide: config?.tagSide || 'right',
      //   tagIndent: config?.tagIndent || '0.8em',
      //   macros: this.defaultMacros
      // });
      this.inputJax = new TeX({
        packages: ['base', 'ams', 'newcommand', 'noundefined', 'configmacros', 'boldsymbol'],
        macros: this.defaultMacros,
        processEnvironments: true,
        processEscapes: true,
        inlineMath: [['\\(', '\\)'], ['$', '$']],
        displayMath: [['\\[', '\\]'], ['$$', '$$']],
        tags: config?.tags || 'ams',   // REQUIRED for \label, \ref, \eqref
        // tagSide: config?.tagSide || 'right',
        // tagIndent: config?.tagIndent || '0.8em',
      });

      this.outputJax = new CHTML({
        fontURL: 'https://cdn.jsdelivr.net/npm/@mathjax/mathjax-newcm-font/chtml/woff2'
      });
      // this.outputJax = new SVG({
      //   // fontURL: 'https://cdn.jsdelivr.net/npm/@mathjax/mathjax-newcm-font/svg',
      //   // fontURL: 'https://cdn.jsdelivr.net/npm/@mathjax/mathjax-newcm-font/svg',
      //   fontCache: 'local',
      // });

      // Create MathJax document processor
      this.mathDocument = mathjax.document('', {
        InputJax: this.inputJax,
        OutputJax: this.outputJax,
      });

      this.isInitialized = true;
      console.log('MathJax service initialized successfully');
      console.log("Initialization configuration settings.", {
        inputJax: this.inputJax,
        outputJax: this.outputJax,
        // allPackages: AllPackages,
        ...this.getConfigInfo()
      });
    } catch (error) {
      console.error('Failed to initialize MathJax:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   *
   * @param htmlContent
   */
  // renderDocument(htmlContent: string): string {
  //
  //   // Initialize the service if it was not already
  //   if (!this.isInitialized) {
  //     this.initialize();
  //   }
  //
  //   // Return an empty string if the HTML content is empty
  //   if (htmlContent.trim() === '') {
  //     return '';
  //   }
  //
  //   try {
  //     // Create a new document for the content with shared state
  //     const doc = mathjax.document(htmlContent, {
  //       InputJax: this.inputJax,
  //       OutputJax: this.outputJax,
  //     });
  //
  //     // Process all math in the document
  //     doc.findMath().compile().getMetrics().typeset().updateDocument();
  //
  //     // Return the processed HTML
  //     return this.adaptor.outerHTML(this.adaptor.body(doc.document));
  //   } catch (error) {
  //     console.error('Document rendering error:', error);
  //     return this.renderDocumentFallback(htmlContent);
  //   }
  // }
  async renderDocument(htmlContent: string): Promise<{math: string, mathCss: string}> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (htmlContent.trim() === '') {
      // return '';
      return {math: '', mathCss: ''};
    }

    try {
      // Create a new document for the content
      const doc = mathjax.document(htmlContent, {
        InputJax: this.inputJax,
        OutputJax: this.outputJax,
      });

      // Use renderPromise to handle all async operations
      await doc.renderPromise();

      // Return the processed HTML
      const math = this.adaptor.outerHTML(this.adaptor.body(doc.document));
      const mathCss = this.adaptor.cssText(this.outputJax.styleSheet(doc));
      console.log("Rendered document", {
        math: math,
        mathCss: mathCss,
      })
      return { math: math, mathCss: mathCss }
      // return math
    } catch (error) {
      console.error('Document rendering error:', error);
      // return this.renderDocumentFallback(htmlContent);
      // return "";
      return {math: '', mathCss: ''};
    }
  }

  /**
   *
   * @param latex
   * @param display
   */
  renderMath(latex: string, display: boolean = false): string {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!latex || latex.trim() === '') {
      return '';
    }

    try {
      // Wrap the LaTeX appropriately
      const mathText = display ? `\\[${latex}\\]` : `\\(${latex}\\)`;

      // Create a temporary document for this single expression
      const tempDoc = mathjax.document(mathText, {
        InputJax: this.inputJax,
        OutputJax: this.outputJax,
        // adaptor: this.adaptor
      });

      // Process the math
      tempDoc.findMath().compile().getMetrics().typeset().updateDocument();

      // Get the rendered result
      const mathElements: MathList<any, any, any> = tempDoc.math;
      const arr: MathItem<HTMLElement, Text, Document>[] = Array.from(
        mathElements as Iterable<MathItem<HTMLElement, Text, Document>>
      );

      if (arr.length === 0) {
        throw new Error('No math expressions found');
      }

      return this.adaptor.outerHTML(arr[0].typesetRoot);
    } catch (error) {
      console.error('MathJax rendering error:', error);
      return `<span class="math-error">Error rendering: ${latex}</span>`;
    }
  }

  /**
   *
   * @param htmlContent
   */
  private renderDocumentFallback(htmlContent: string): string {
    console.log('Using fallback rendering method');
    let processedContent = htmlContent;

    try {
      // Process display math first (to avoid conflicts with inline math)
      processedContent = processedContent.replace(
        /\$\$([^$]+)\$\$/g,
        (match, latex) => {
          try {
            return this.renderMath(latex.trim(), true);
          } catch {
            return `<span class="math-error">Error: ${latex}</span>`;
          }
        }
      );

      processedContent = processedContent.replace(
        /\\\[([^\]]+)\\\]/g,
        (match, latex) => {
          try {
            return this.renderMath(latex.trim(), true);
          } catch {
            return `<span class="math-error">Error: ${latex}</span>`;
          }
        }
      );

      // Process inline math
      processedContent = processedContent.replace(
        /\$([^$\n]+)\$/g,
        (match, latex) => {
          try {
            return this.renderMath(latex.trim(), false);
          } catch {
            return `<span class="math-error">Error: ${latex}</span>`;
          }
        }
      );

      processedContent = processedContent.replace(
        /\\\(([^)]+)\\\)/g,
        (match, latex) => {
          try {
            return this.renderMath(latex.trim(), false);
          } catch {
            return `<span class="math-error">Error: ${latex}</span>`;
          }
        }
      );

      return processedContent;
    } catch (error) {
      console.error('Fallback rendering failed:', error);
      return htmlContent;
    }
  }

  /**
   *
   */
  getStyles(): string {
    if (!this.isInitialized) {
      this.initialize();
    }

    try {
      if (this.outputJax && typeof this.outputJax.styleSheet === 'function') {
        const styles = this.outputJax.styleSheet(this.adaptor);
        console.log("Retrieved styles from MathJax", {
          styles: styles,
          defaultStyles: this.getDefaultStyles()
        })
        return styles || this.getDefaultStyles();
      }
    } catch (error) {
      console.warn('Failed to get MathJax styles:', error);
    }

    return this.getDefaultStyles();
  }

  /**
   *
   */
  private getDefaultStyles(): string {
    return `
      .MathJax {
        outline: 0;
        display: inline-block;
      }

      .MathJax[display="true"] {
        display: block;
        text-align: center;
        margin: 1em 0;
      }

      .MathJax svg {
        display: inline-block;
        vertical-align: middle;
      }

      .math-error {
        background: #ffe6e6;
        color: #cc0000;
        padding: 2px 4px;
        border-radius: 2px;
        font-family: monospace;
        font-size: 0.9em;
        border: 1px solid #ffcccc;
      }

      /* Equation numbering styles */
      .MathJax .mjx-tag {
        margin-right: 0.8em;
        font-weight: normal;
      }

      .math-content p {
        margin: 1em 0;
      }

      .math-content .MathJax {
        margin: 0 0.1em;
      }

      .mjx-display {
        display: block;
        text-align: center;
        margin: 1em 0;
        position: relative;
      }
    `;
  }

  /**
   *
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   *
   * @param macros
   */
  addMacros(macros: { [key: string]: string }): void {
    if (!this.isInitialized) {
      console.warn('MathJax not initialized. Call initialize() first.');
      return;
    }

    try {
      const config = this.inputJax.parseOptions;
      if (config && config.options && config.options.macros) {
        Object.assign(config.options.macros, macros);
        console.log('Added macros:', Object.keys(macros));
      } else {
        console.warn('Unable to access macros configuration');
      }
    } catch (error) {
      console.error('Error adding macros:', error);
    }
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
      macroCount: this.inputJax?.parseOptions?.options?.macros ?
        Object.keys(this.inputJax.parseOptions.options.macros).length : 0
    };
  }
}
