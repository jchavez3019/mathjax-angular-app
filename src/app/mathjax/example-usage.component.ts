// example-usage.component.ts
import {
  Component,
  OnInit,
  ViewChild,
  inject,
  OnDestroy,
  signal,
  computed,
  DestroyRef, AfterViewInit, ElementRef, ChangeDetectorRef
} from '@angular/core';
import {HttpClient, HttpClientModule} from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MathJaxContentComponent } from './mathjax-content.component';
import { MathJaxService } from './mathjax.service';
import { InteractivePlotComponent } from './interactive-plot.component';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

declare global {
  interface Window {
    MathJax: any;
  }
}

interface ExampleSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
  options?: {
    enableDynamicComponents?: boolean;
    showControls?: boolean;
    containerClass?: string;
  };
}

@Component({
  selector: 'app-example-usage',
  standalone: true,
  imports: [CommonModule, FormsModule, MathJaxContentComponent, HttpClientModule],
  templateUrl: 'example-usage.component.html',
  styleUrl: 'example-usage.component.css'
})
export class ExampleUsageComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly mathJaxService = inject(MathJaxService);
  private readonly destroyRef = inject(DestroyRef);

  example_content: string = "";
  safe_content: SafeHtml = "";
  @ViewChild('quickExample', { static: false }) quickExample!: ElementRef<HTMLDivElement>;

  @ViewChild('demoContent') demoContentComponent!: MathJaxContentComponent;

  // Reactive state
  totalComponents = signal(0);
  totalMathExpressions = signal(0);
  averageProcessingTime = computed(() => {
    if (this.processingTimes.length === 0) return 0;
    return Math.round(this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length);
  });

  isProcessing = signal(false);
  globalStatus = signal<'ready' | 'processing' | 'error'>('ready');

  // Global settings
  isDarkTheme = false;
  globalComponentsEnabled = true;
  showMetrics = false;

  // Performance tracking
  processingTimes: number[] = [];
  componentsCreated = 0;
  sectionProcessing = new Map<string, boolean>();
  processingStartTimes = new Map<string, number>();

  // Demo controls
  demoEquationType: 'linear' | 'quadratic' | 'trigonometric' | 'exponential' | 'logarithmic' = 'quadratic';
  demoParamA = 1;
  demoParamB = 0;
  demoMathContent = computed(() => this.generateDemoContent());

  // Example sections data
  sections: ExampleSection[] = [
    {
      id: 'basic-math',
      title: 'Basic Mathematics',
      description: 'Simple LaTeX expressions and formatting',
      icon: '🧮',
      content: `
# Mathematical Expressions

Here are some basic mathematical expressions rendered with MathJax:

## Inline Mathematics
The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ and it's used to solve quadratic equations.

The area of a circle with radius $r$ is $A = \\pi r^2$.

## Display Mathematics
$E = mc^2$

$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$

$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$

## Matrix Example
$\\begin{bmatrix}
a & b \\\\
c & d
\\end{bmatrix}
\\begin{bmatrix}
x \\\\
y
\\end{bmatrix}
=
\\begin{bmatrix}
ax + by \\\\
cx + dy
\\end{bmatrix}$
      `,
      options: {
        enableDynamicComponents: false,
        showControls: true,
        containerClass: 'basic-math'
      }
    },
    {
      id: 'advanced-math',
      title: 'Advanced Mathematics',
      description: 'Complex equations and theorem demonstrations',
      icon: '🔬',
      content: `
# Advanced Mathematical Concepts

## Calculus and Analysis

### Taylor Series
The Taylor series expansion of $e^x$ around $x = 0$:
$e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots$

### Fourier Transform
$\\mathcal{F}\\{f(t)\\} = \\int_{-\\infty}^{\\infty} f(t) e^{-2\\pi i \\xi t} dt$

## Linear Algebra

### Eigenvalue Problem
For a matrix $A$, find $\\lambda$ and $\\mathbf{v}$ such that:
$A\\mathbf{v} = \\lambda\\mathbf{v}$

### Determinant
$\\det(A) = \\sum_{\\sigma \\in S_n} \\text{sgn}(\\sigma) \\prod_{i=1}^n a_{i,\\sigma(i)}$

## Probability Theory

### Bayes' Theorem
$P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$

### Normal Distribution
$f(x) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$
      `,
      options: {
        enableDynamicComponents: false,
        showControls: true,
        containerClass: 'advanced-math'
      }
    },
    {
      id: 'interactive-components',
      title: 'Interactive Components',
      description: 'Dynamic Angular components embedded in mathematical content',
      icon: '⚛️',
      content: `
# Interactive Mathematical Components

This section demonstrates how to embed dynamic Angular components within mathematical content.

## Function Visualization

Here's an interactive plot that you can manipulate:

<ng-component name="interactive-plot" props='{"title": "Quadratic Function", "description": "Interactive quadratic function plot", "showControls": true, "showFunction": true}'></ng-component>

## Mathematical Analysis

The quadratic function $f(x) = ax^2 + bx + c$ has several important properties:

- **Vertex**: $x = -\\frac{b}{2a}$, $y = f\\left(-\\frac{b}{2a}\\right)$
- **Discriminant**: $\\Delta = b^2 - 4ac$
- **Roots** (when $\\Delta \\geq 0$): $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$

## Another Interactive Plot

Let's visualize a trigonometric function:

<ng-component name="interactive-plot" props='{"title": "Sine Wave", "description": "Interactive sine wave with adjustable parameters", "showControls": true, "canvasWidth": 500, "canvasHeight": 300}'></ng-component>

The general form of a sine wave is:
$f(x) = A \\sin(\\omega x + \\phi) + C$

Where:
- $A$ is the amplitude
- $\\omega$ is the angular frequency
- $\\phi$ is the phase shift
- $C$ is the vertical offset
      `,
      options: {
        enableDynamicComponents: true,
        showControls: true,
        containerClass: 'interactive-components'
      }
    },
    {
      id: 'mixed-content',
      title: 'Mixed Content',
      description: 'Combination of text, mathematics, and interactive elements',
      icon: '🎯',
      content: `
# Mathematical Learning Module

## Introduction to Derivatives

The derivative of a function measures how the function changes as its input changes.

### Definition
The derivative of $f(x)$ at point $x = a$ is:
$f'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}$

### Power Rule
For $f(x) = x^n$ where $n$ is a constant:
$\\frac{d}{dx}[x^n] = nx^{n-1}$

### Interactive Visualization

Let's explore how derivatives work with this interactive plot:

<ng-component name="interactive-plot" props='{"title": "Derivative Visualization", "description": "See how the derivative changes with different functions", "showControls": true, "showFunction": true, "canvasWidth": 480, "canvasHeight": 320}'></ng-component>

### Examples

1. $\\frac{d}{dx}[x^3] = 3x^2$
2. $\\frac{d}{dx}[x^{1/2}] = \\frac{1}{2}x^{-1/2} = \\frac{1}{2\\sqrt{x}}$
3. $\\frac{d}{dx}[x^{-1}] = -x^{-2} = -\\frac{1}{x^2}$

## Chain Rule

When dealing with composite functions $f(g(x))$:
$\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$

### Example
If $y = (3x + 1)^5$, then:
$\\frac{dy}{dx} = 5(3x + 1)^4 \\cdot 3 = 15(3x + 1)^4$
      `,
      options: {
        enableDynamicComponents: true,
        showControls: true,
        containerClass: 'mixed-content'
      }
    }
  ];

  get fastestRender(): number {
    return this.processingTimes.length > 0 ? Math.min(...this.processingTimes) : 0;
  }

  constructor(private http: HttpClient, private sanitizer: DomSanitizer,
              private changeDetector: ChangeDetectorRef) {}

  get slowestRender(): number {
    return this.processingTimes.length > 0 ? Math.max(...this.processingTimes) : 0;
  }

  ngOnInit(): void {
    console.log('🚀 ExampleUsageComponent initializing...');

    // Register the interactive plot component
    this.mathJaxService.registerComponent('interactive-plot', InteractivePlotComponent);

    this.setupCleanup();
    this.initializeStats();

    console.log('✅ ExampleUsageComponent initialized successfully');
  }

  ngOnDestroy(): void {
    this.mathJaxService.destroyAllComponents();
  }

  private setupCleanup(): void {
    this.destroyRef.onDestroy(() => {
      this.mathJaxService.destroyAllComponents();
      console.log('🧹 ExampleUsageComponent cleanup completed');
    });
  }

  private initializeStats(): void {
    // Count initial math expressions
    let mathCount = 0;
    this.sections.forEach(section => {
      // Count $ delimited expressions
      const inlineMath = (section.content.match(/\$[^$]+\$/g) || []).length;
      const displayMath = (section.content.match(/\$\$[\s\S]*?\$\$/g) || []).length;
      mathCount += inlineMath + displayMath;
    });

    this.totalMathExpressions.set(mathCount);
    console.log(`📊 Found ${mathCount} math expressions`);
  }

  ngAfterViewInit(): void {
    // Small delay to ensure the view is fully rendered
    setTimeout(() => {
      this.renderMath();
    }, 100);
  }

  renderMath(): void {
    try {
      const self = this;

      // Configure MathJax before loading the script
      window.MathJax = {
        loader: { load: ['[tex]/tagformat', '[tex]/ams'] },
        section: 1,
        tex: {
          tags: 'ams',
          packages: {'[+]': ['tagformat', 'sections', 'ams', 'newcommand', 'configmacros']},
          tagformat: {
            number: (n: any) => window.MathJax.config.section + '.' + n
          },
          macros: {
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

            // Functions - simplified to avoid \textup{\textrm{}} nesting
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

            // Tilde notation (simplified)
            'hatxt': '\\widetilde{\\mathbf{x}}_t',
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
            // 'hatwt': '\\widehat{\\boldsymbol{w}}_t',
            'hatwtp': '\\widehat{\\boldsymbol{w}}_{t+1}',
            'hatVt': '\\widehat{\\boldsymbol{V}}_t',
            'hatvt': '\\widehat{\\boldsymbol{v}}_t',
            'hatPt': '\\widetilde{\\mathbf{P}}_t',
            'hatPtm': '\\widetilde{\\mathbf{P}}_{t-1}',
            'hatPQtm': '\\widetilde{\\mathbb{P}}_{t-1}',
            'hatPttm': '\\widetilde{\\mathbf{P}}_{t,t-1}',
            'hatPQttm': '\\widetilde{\\mathbb{P}}_{t,t-1}',
            'hatPtmt': '\\widetilde{\\mathbf{P}}_{t-1,t}',
            'hatVtT': '\\widetilde{\\boldsymbol{V}}_t^T',
            'hatVttm': '\\widetilde{\\boldsymbol{V}}_{t,t-1}',

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
          }
        },
        options: {
          // This tells MathJax to process math in ANY element, not just specific classes
          processHtmlClass: 'sample_output',
          processClass: 'math',
          skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        },
        chtml: {
          displayAlign: 'left',
          displayIndent: '2em'
        },
        startup: {
          ready() {
            const Configuration = window.MathJax._.input.tex.Configuration.Configuration;
            const CommandMap = window.MathJax._.input.tex.SymbolMap.CommandMap;

            new CommandMap('sections', { nextSection: 'NextSection' }, {
              NextSection(parser: any, name: any) {
                window.MathJax.config.section++;
                parser.tags.counter = parser.tags.allCounter = 0;
              }
            });

            Configuration.create('sections', { handler: { macro: ['sections'] } });

            // const HTMLHandler = window.MathJax.startup.document.options.HTMLHandler;
            // HTMLHandler.className['math inline'] = ['\\(', '\\)'];
            // HTMLHandler.className['math display'] = ['\\[', '\\]'];

            window.MathJax.startup.defaultReady();
            console.log('MathJax loaded successfully');

            // Load content and render after MathJax is ready
            self.loadAndRenderContent();
          }
        }
      };

      // Load MathJax script
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
      script.async = true;
      document.head.appendChild(script);

    } catch (error) {
      console.error('Failed to initialize MathJax:', error);
    }
  }

  private loadAndRenderContent(): void {
    this.http.get('/assets/output.html', { responseType: 'text' })
      .subscribe({
        next: (html) => {
          this.example_content = html; // This will be sanitized
          this.safe_content = this.sanitizer.bypassSecurityTrustHtml(html); // This won't

          this.changeDetector.detectChanges();
          this.typesetMath();
        },
        error: (err) => console.error('Failed to load content:', err)
      });
  }

  private typesetMath(): void {
    if (window.MathJax && window.MathJax.typesetPromise) {
      // Get the actual DOM element from the ElementRef
      const element = this.quickExample?.nativeElement;
      if (element) {
        window.MathJax.typesetPromise([element]).then(() => {
          console.log('Math rendering of quick example complete');
        }).catch((err: any) => {
          console.error('MathJax typeset error on quick example:', err);
        });
      } else {
        console.error('quickExample element not found');
      }
    } else {
      console.error('MathJax not available');
    }
  }

  // Event handlers
  onSectionProcessed(sectionId: string): void {
    const startTime = this.processingStartTimes.get(sectionId);
    if (startTime) {
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      this.processingStartTimes.delete(sectionId);
      console.log(`✅ Section ${sectionId} processed in ${processingTime}ms`);
    }

    this.updateGlobalStatus();
  }

  onComponentCreated(event: {name: string, instance: any}, sectionId: string): void {
    this.componentsCreated++;
    this.totalComponents.set(this.componentsCreated);
    console.log(`🎯 Component created: ${event.name} in section ${sectionId}`);
  }

  onProcessingStateChange(isProcessing: boolean, sectionId: string): void {
    if (isProcessing) {
      this.sectionProcessing.set(sectionId, true);
      this.processingStartTimes.set(sectionId, Date.now());
    } else {
      this.sectionProcessing.set(sectionId, false);
    }

    this.updateGlobalStatus();
  }

  onSectionError(error: Error, sectionId: string): void {
    console.error(`❌ Error in section ${sectionId}:`, error);
    this.sectionProcessing.set(sectionId, false);
    this.updateGlobalStatus();
  }

  onDemoProcessed(): void {
    console.log('✅ Demo content processed');
  }

  onDemoComponentCreated(event: {name: string, instance: any}): void {
    console.log('🎯 Demo component created:', event.name);
  }

  // Global control methods
  refreshAllContent(): void {
    console.log('🔄 Refreshing all content...');
    this.isProcessing.set(true);
    this.globalStatus.set('processing');

    // Reset metrics
    this.processingTimes = [];
    this.componentsCreated = 0;
    this.totalComponents.set(0);

    // Trigger refresh for all sections by clearing processing states
    this.sections.forEach(section => {
      this.sectionProcessing.set(section.id, true);
    });

    // The MathJax content components will handle their own refresh
    setTimeout(() => {
      this.updateGlobalStatus();
    }, 1000);
  }

  refreshSection(sectionId: string): void {
    console.log(`🔄 Refreshing section: ${sectionId}`);
    this.sectionProcessing.set(sectionId, true);
    // The individual component will handle the refresh
  }

  toggleGlobalTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    console.log(`🎨 Theme switched to: ${this.isDarkTheme ? 'dark' : 'light'}`);

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
  }

  toggleComponentsGlobally(): void {
    this.globalComponentsEnabled = !this.globalComponentsEnabled;
    console.log(`🔧 Components globally ${this.globalComponentsEnabled ? 'enabled' : 'disabled'}`);
  }

  exportContent(): void {
    console.log('📄 Exporting content...');

    const exportData = {
      timestamp: new Date().toISOString(),
      sections: this.sections,
      metrics: {
        totalComponents: this.totalComponents(),
        totalMathExpressions: this.totalMathExpressions(),
        averageProcessingTime: this.averageProcessingTime(),
        processingTimes: this.processingTimes,
        componentsCreated: this.componentsCreated
      },
      settings: {
        isDarkTheme: this.isDarkTheme,
        globalComponentsEnabled: this.globalComponentsEnabled,
        showMetrics: this.showMetrics
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mathjax-content-export-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('📄 Content exported successfully');
  }

  // Demo control methods
  updateDemoContent(): void {
    console.log('🎮 Demo content updated:', {
      type: this.demoEquationType,
      paramA: this.demoParamA,
      paramB: this.demoParamB
    });
  }

  randomizeDemoParams(): void {
    this.demoParamA = -5 + Math.random() * 10;
    this.demoParamB = -10 + Math.random() * 20;

    const types: typeof this.demoEquationType[] = ['linear', 'quadratic', 'trigonometric', 'exponential', 'logarithmic'];
    this.demoEquationType = types[Math.floor(Math.random() * types.length)];

    console.log('🎲 Demo parameters randomized');
  }

  resetDemoParams(): void {
    this.demoEquationType = 'quadratic';
    this.demoParamA = 1;
    this.demoParamB = 0;

    console.log('↻ Demo parameters reset');
  }

  private generateDemoContent(): string {
    const { demoEquationType, demoParamA, demoParamB } = this;

    let equation: string;
    let description: string;
    let componentProps: string;

    switch (demoEquationType) {
      case 'linear':
        equation = `f(x) = ${demoParamA.toFixed(2)}x + ${demoParamB.toFixed(2)}`;
        description = 'Linear functions have a constant rate of change (slope).';
        componentProps = JSON.stringify({
          title: 'Linear Function',
          description: `Interactive plot of ${equation}`,
          showControls: true,
          showFunction: true
        });
        break;

      case 'quadratic':
        equation = `f(x) = ${demoParamA.toFixed(2)}x^2 + ${demoParamB.toFixed(2)}x`;
        description = 'Quadratic functions form parabolas and have applications in physics and engineering.';
        componentProps = JSON.stringify({
          title: 'Quadratic Function',
          description: `Interactive plot of ${equation}`,
          showControls: true,
          showFunction: true
        });
        break;

      case 'trigonometric':
        equation = `f(x) = ${demoParamA.toFixed(2)}\\sin(${demoParamB.toFixed(2)}x)`;
        description = 'Trigonometric functions are periodic and model wave-like phenomena.';
        componentProps = JSON.stringify({
          title: 'Sine Function',
          description: `Interactive plot of ${equation}`,
          showControls: true,
          showFunction: true
        });
        break;

      case 'exponential':
        equation = `f(x) = ${demoParamA.toFixed(2)}e^{${demoParamB.toFixed(2)}x}`;
        description = 'Exponential functions model growth and decay processes.';
        componentProps = JSON.stringify({
          title: 'Exponential Function',
          description: `Interactive plot of ${equation}`,
          showControls: true,
          showFunction: true
        });
        break;

      case 'logarithmic':
        equation = `f(x) = ${demoParamA.toFixed(2)}\\ln(x) + ${demoParamB.toFixed(2)}`;
        description = 'Logarithmic functions are the inverse of exponential functions.';
        componentProps = JSON.stringify({
          title: 'Logarithmic Function',
          description: `Interactive plot of ${equation}`,
          showControls: true,
          showFunction: true
        });
        break;
    }

    return `
# Dynamic Function Visualization

## Current Function
$${equation}$

${description}

## Interactive Plot

<ng-component name="interactive-plot" props='${componentProps}'></ng-component>

## Properties

The current function has the following characteristics:

- **Parameter A**: ${demoParamA.toFixed(2)}
- **Parameter B**: ${demoParamB.toFixed(2)}
- **Type**: ${demoEquationType.charAt(0).toUpperCase() + demoEquationType.slice(1)}

### Mathematical Analysis

${this.getDemoAnalysis()}
    `;
  }

  private getDemoAnalysis(): string {
    switch (this.demoEquationType) {
      case 'linear':
        return `
- **Slope**: ${this.demoParamA.toFixed(2)}
- **Y-intercept**: ${this.demoParamB.toFixed(2)}
- **Domain**: $(-\\infty, \\infty)$
- **Range**: $(-\\infty, \\infty)$
        `;

      case 'quadratic':
        const vertex = -this.demoParamB / (2 * this.demoParamA);
        const vertexY = this.demoParamA * vertex * vertex + this.demoParamB * vertex;
        return `
- **Vertex**: $(${vertex.toFixed(2)}, ${vertexY.toFixed(2)})$
- **Axis of symmetry**: $x = ${vertex.toFixed(2)}$
- **Opens**: ${this.demoParamA > 0 ? 'upward' : 'downward'}
- **Domain**: $(-\\infty, \\infty)$
        `;

      case 'trigonometric':
        return `
- **Amplitude**: $|${this.demoParamA.toFixed(2)}|$
- **Frequency**: ${Math.abs(this.demoParamB).toFixed(2)}
- **Period**: $\\frac{2\\pi}{${Math.abs(this.demoParamB).toFixed(2)}} = ${(2 * Math.PI / Math.abs(this.demoParamB)).toFixed(2)}$
- **Range**: $[${(-Math.abs(this.demoParamA)).toFixed(2)}, ${Math.abs(this.demoParamA).toFixed(2)}]$
        `;

      case 'exponential':
        return `
- **Base**: $e \\approx 2.718$
- **Growth rate**: ${this.demoParamB.toFixed(2)}
- **Behavior**: ${this.demoParamB > 0 ? 'exponential growth' : 'exponential decay'}
- **Domain**: $(-\\infty, \\infty)$
- **Range**: $(0, \\infty)$ when $a > 0$
        `;

      case 'logarithmic':
        return `
- **Base**: $e$ (natural logarithm)
- **Vertical stretch**: ${this.demoParamA.toFixed(2)}
- **Vertical shift**: ${this.demoParamB.toFixed(2)}
- **Domain**: $(0, \\infty)$
- **Range**: $(-\\infty, \\infty)$
        `;

      default:
        return '';
    }
  }

  // Utility methods
  trackSection(index: number, section: ExampleSection): string {
    return section.id;
  }

  getContainerClass(section: ExampleSection): string {
    let classes = section.options?.containerClass || '';
    if (this.isDarkTheme) {
      classes += ' dark-theme';
    }
    return classes;
  }

  getDemoContainerClass(): string {
    return this.isDarkTheme ? 'demo-container dark-theme' : 'demo-container';
  }

  private updateGlobalStatus(): void {
    const anyProcessing = Array.from(this.sectionProcessing.values()).some(processing => processing);

    if (anyProcessing) {
      this.globalStatus.set('processing');
      this.isProcessing.set(true);
    } else {
      this.globalStatus.set('ready');
      this.isProcessing.set(false);
    }
  }

  // Status helper methods
  globalStatusClass(): string {
    return this.globalStatus();
  }

  globalStatusIcon(): string {
    switch (this.globalStatus()) {
      case 'processing': return '⏳';
      case 'error': return '❌';
      case 'ready':
      default: return '✅';
    }
  }

  // Footer methods
  toggleMetrics(): void {
    this.showMetrics = !this.showMetrics;
    console.log(`📊 Metrics ${this.showMetrics ? 'shown' : 'hidden'}`);
  }

  downloadLogs(): void {
    const logs = {
      timestamp: new Date().toISOString(),
      processingTimes: this.processingTimes,
      componentsCreated: this.componentsCreated,
      sectionStates: Object.fromEntries(this.sectionProcessing),
      performance: {
        fastest: this.fastestRender,
        slowest: this.slowestRender,
        average: this.averageProcessingTime(),
        total: this.processingTimes.length
      }
    };

    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mathjax-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('📥 Logs downloaded successfully');
  }

  resetAllData(): void {
    if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      this.processingTimes = [];
      this.componentsCreated = 0;
      this.totalComponents.set(0);
      this.sectionProcessing.clear();
      this.processingStartTimes.clear();

      this.isDarkTheme = false;
      this.globalComponentsEnabled = true;
      this.showMetrics = false;

      this.demoEquationType = 'quadratic';
      this.demoParamA = 1;
      this.demoParamB = 0;

      document.documentElement.removeAttribute('data-theme');

      console.log('🔄 All data reset');

      // Refresh all content
      this.refreshAllContent();
    }
  }
}
