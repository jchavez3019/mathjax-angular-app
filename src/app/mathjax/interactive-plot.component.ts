// interactive-plot.component.ts
import {
  Component,
  OnInit,
  AfterViewInit,
  Input,
  ViewChild,
  ElementRef,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PlotParams {
  amplitude?: number;
  frequency?: number;
  phase?: number;
  offset?: number;
  type?: 'sine' | 'cosine' | 'tangent' | 'quadratic' | 'cubic';
  color?: string;
  lineWidth?: number;
}

@Component({
  selector: 'app-interactive-plot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interactive-plot.component.html',
  styleUrl: './interactive-plot.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractivePlotComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() title = 'Interactive Mathematical Plot';
  @Input() description = 'Dynamic visualization with customizable parameters';
  @Input() showControls = true;
  @Input() showFunction = true;
  @Input() canvasWidth = 480;
  @Input() canvasHeight = 320;

  @ViewChild('plotCanvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private readonly destroyRef = inject(DestroyRef);

  // Reactive signals
  status = signal<'loading' | 'ready' | 'error'>('loading');
  isLoading = computed(() => this.status() === 'loading');
  pointCount = signal(0);
  lastUpdated = signal('');

  // Plot parameters
  plotType: PlotParams['type'] = 'sine';
  amplitude = 1;
  frequency = 1;
  phase = 0;
  offset = 0;
  coeffA = 1;
  coeffB = 0;

  // Canvas interaction
  showCrosshair = false;
  mouseX = 0;
  mouseY = 0;
  currentX = 0;
  currentY = 0;

  // Plot bounds
  xMin = -2 * Math.PI;
  xMax = 2 * Math.PI;
  yMin = -3;
  yMax = 3;

  private animationFrame: number | null = null;

  ngOnInit(): void {
    console.log('📊 InteractivePlotComponent initialized:', {
      title: this.title,
      description: this.description,
      canvasSize: `${this.canvasWidth}x${this.canvasHeight}`
    });

    this.setupCleanup();
    this.status.set('loading');
  }

  ngAfterViewInit(): void {
    // Small delay to ensure canvas is ready
    setTimeout(() => {
      this.initializeCanvas();
      this.drawPlot();
    }, 100);
  }

  ngOnDestroy(): void {
    this.cancelAnimationFrame();
  }

  private setupCleanup(): void {
    this.destroyRef.onDestroy(() => {
      this.cancelAnimationFrame();
      console.log('🧹 InteractivePlotComponent cleanup completed');
    });
  }

  private cancelAnimationFrame(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private initializeCanvas(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('❌ Failed to get canvas context');
      this.status.set('error');
      return;
    }

    // Set up canvas properties
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    console.log('✅ Canvas initialized successfully');
  }

  private drawPlot(): void {
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      this.status.set('error');
      return;
    }

    this.status.set('loading');

    // Use requestAnimationFrame for smooth rendering
    this.animationFrame = requestAnimationFrame(() => {
      try {
        this.renderPlot(ctx, canvas);
        this.status.set('ready');
        this.lastUpdated.set(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('❌ Plot rendering error:', error);
        this.status.set('error');
      }
    });
  }

  private renderPlot(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    this.drawBackground(ctx, canvas);

    // Draw grid
    this.drawGrid(ctx, canvas);

    // Draw axes
    this.drawAxes(ctx, canvas);

    // Draw function
    this.drawFunction(ctx, canvas);

    // Draw axis labels
    this.drawLabels(ctx, canvas);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.strokeStyle = '#f1f3f4';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);

    const xStep = canvas.width / 20;
    const yStep = canvas.height / 16;

    // Vertical grid lines
    for (let x = 0; x <= canvas.width; x += xStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let y = 0; y <= canvas.height; y += yStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  private drawAxes(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();

    // Draw axis arrows
    this.drawArrow(ctx, canvas.width - 10, centerY, 10, 0);
    this.drawArrow(ctx, centerX, 10, 0, -10);
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number): void {
    const headLength = 8;
    const headAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x, y);
    ctx.moveTo(x, y);
    ctx.lineTo(x - headLength * Math.cos(Math.atan2(dy, dx) - headAngle),
      y - headLength * Math.sin(Math.atan2(dy, dx) - headAngle));
    ctx.moveTo(x, y);
    ctx.lineTo(x - headLength * Math.cos(Math.atan2(dy, dx) + headAngle),
      y - headLength * Math.sin(Math.atan2(dy, dx) + headAngle));
    ctx.stroke();
  }

  private drawFunction(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);

    const points: Array<{x: number, y: number}> = [];
    const step = (this.xMax - this.xMin) / canvas.width;
    let validPointCount = 0;

    // Generate function points
    for (let px = 0; px <= canvas.width; px++) {
      const x = this.xMin + (px / canvas.width) * (this.xMax - this.xMin);
      const y = this.evaluateFunction(x);

      if (isFinite(y)) {
        const canvasY = this.yToCanvas(y, canvas);
        if (canvasY >= 0 && canvasY <= canvas.height) {
          points.push({ x: px, y: canvasY });
          validPointCount++;
        }
      }
    }

    this.pointCount.set(validPointCount);

    // Draw the function curve
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.stroke();
    }
  }

  private drawLabels(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.fillStyle = '#495057';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // X-axis labels
    const xLabels = [-2, -1, 0, 1, 2];
    for (const label of xLabels) {
      if (label === 0) continue;
      const x = centerX + (label / (this.xMax - this.xMin)) * canvas.width * 0.8;
      if (x > 10 && x < canvas.width - 10) {
        ctx.fillText(label.toString(), x, centerY + 20);
      }
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    const yLabels = [-2, -1, 1, 2];
    for (const label of yLabels) {
      const y = centerY - (label / (this.yMax - this.yMin)) * canvas.height * 0.8;
      if (y > 15 && y < canvas.height - 5) {
        ctx.fillText(label.toString(), centerX - 10, y + 4);
      }
    }

    // Origin label
    ctx.textAlign = 'right';
    ctx.fillText('0', centerX - 10, centerY + 15);
  }

  private evaluateFunction(x: number): number {
    switch (this.plotType) {
      case 'sine':
        return this.amplitude * Math.sin(this.frequency * x + this.phase) + this.offset;

      case 'cosine':
        return this.amplitude * Math.cos(this.frequency * x + this.phase) + this.offset;

      case 'tangent':
        const tanValue = Math.tan(this.frequency * x + this.phase);
        return Math.abs(tanValue) > 10 ? NaN : this.amplitude * tanValue + this.offset;

      case 'quadratic':
        return this.coeffA * x * x + this.coeffB * x + this.offset;

      case 'cubic':
        return this.coeffA * x * x * x + this.coeffB * x * x + x + this.offset;

      default:
        return 0;
    }
  }

  private yToCanvas(y: number, canvas: HTMLCanvasElement): number {
    const centerY = canvas.height / 2;
    return centerY - (y / (this.yMax - this.yMin)) * canvas.height * 0.8;
  }

  private canvasToX(canvasX: number, canvas: HTMLCanvasElement): number {
    return this.xMin + (canvasX / canvas.width) * (this.xMax - this.xMin);
  }

  private canvasToY(canvasY: number, canvas: HTMLCanvasElement): number {
    const centerY = canvas.height / 2;
    return -((canvasY - centerY) / (canvas.height * 0.8)) * (this.yMax - this.yMin);
  }

  // Event handlers
  onMouseMove(event: MouseEvent): void {
    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;

    this.currentX = this.canvasToX(this.mouseX, canvas);
    this.currentY = this.canvasToY(this.mouseY, canvas);

    this.showCrosshair = true;
  }

  clearCrosshair(): void {
    this.showCrosshair = false;
  }

  onParameterChange(): void {
    console.log('🎛️ Parameters changed:', {
      type: this.plotType,
      amplitude: this.amplitude,
      frequency: this.frequency,
      coeffA: this.coeffA,
      coeffB: this.coeffB
    });

    this.redraw();
  }

  // Control methods
  redraw(): void {
    console.log('🔄 Redrawing plot...');
    this.drawPlot();
  }

  resetParameters(): void {
    console.log('↻ Resetting parameters...');

    this.amplitude = 1;
    this.frequency = 1;
    this.phase = 0;
    this.offset = 0;
    this.coeffA = 1;
    this.coeffB = 0;
    this.plotType = 'sine';

    this.redraw();
  }

  randomize(): void {
    console.log('🎲 Randomizing parameters...');

    const types: PlotParams['type'][] = ['sine', 'cosine', 'quadratic', 'cubic'];
    this.plotType = types[Math.floor(Math.random() * types.length)];

    if (this.isWaveFunction()) {
      this.amplitude = 0.5 + Math.random() * 2.5;
      this.frequency = 0.5 + Math.random() * 4.5;
      this.phase = Math.random() * 2 * Math.PI;
    } else {
      this.coeffA = -2 + Math.random() * 4;
      this.coeffB = -5 + Math.random() * 10;
    }

    this.offset = -1 + Math.random() * 2;
    this.redraw();
  }

  // Utility methods
  isWaveFunction(): boolean {
    return ['sine', 'cosine', 'tangent'].includes(this.plotType || '');
  }

  isPolynomial(): boolean {
    return ['quadratic', 'cubic'].includes(this.plotType || '');
  }

  statusClass(): string {
    return this.status();
  }

  formatNumber(value: number): string {
    return Math.abs(value) < 0.01 ? '0.00' : value.toFixed(2);
  }

  currentFunction(): string {
    switch (this.plotType) {
      case 'sine':
        return `f(x) = ${this.formatNumber(this.amplitude)}sin(${this.formatNumber(this.frequency)}x)`;

      case 'cosine':
        return `f(x) = ${this.formatNumber(this.amplitude)}cos(${this.formatNumber(this.frequency)}x)`;

      case 'tangent':
        return `f(x) = ${this.formatNumber(this.amplitude)}tan(${this.formatNumber(this.frequency)}x)`;

      case 'quadratic':
        return `f(x) = ${this.formatNumber(this.coeffA)}x² + ${this.formatNumber(this.coeffB)}x`;

      case 'cubic':
        return `f(x) = ${this.formatNumber(this.coeffA)}x³ + ${this.formatNumber(this.coeffB)}x²`;

      default:
        return 'f(x) = 0';
    }
  }

  // Public API methods
  updatePlotType(type: PlotParams['type']): void {
    this.plotType = type;
    this.redraw();
  }

  updateParameters(params: Partial<PlotParams>): void {
    if (params.amplitude !== undefined) this.amplitude = params.amplitude;
    if (params.frequency !== undefined) this.frequency = params.frequency;
    if (params.phase !== undefined) this.phase = params.phase;
    if (params.offset !== undefined) this.offset = params.offset;
    this.redraw();
  }

  getPlotData(): {x: number[], y: number[]} {
    const x: number[] = [];
    const y: number[] = [];
    const steps = 100;

    for (let i = 0; i <= steps; i++) {
      const xVal = this.xMin + (i / steps) * (this.xMax - this.xMin);
      const yVal = this.evaluateFunction(xVal);

      if (isFinite(yVal)) {
        x.push(xVal);
        y.push(yVal);
      }
    }

    return { x, y };
  }
}
