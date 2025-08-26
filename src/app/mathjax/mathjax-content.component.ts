// mathjax-content.component.ts
import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  inject,
  ChangeDetectionStrategy,
  signal,
  AfterViewInit,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MathJaxService } from './mathjax.service';
import {marked} from 'marked';

@Component({
  selector: 'app-mathjax-content',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mathjax-content.component.html',
  styleUrl: './mathjax-content.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MathJaxContentComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {

  // Component inputs
  @Input() content: string = '';
  @Input() enableDynamicComponents: boolean = true;
  @Input() showControls: boolean = false;
  @Input() containerClass: string = '';
  @Input() autoProcess: boolean = true;
  @Input() debounceMs: number = 300;

  // Component outputs
  @Output() contentProcessed = new EventEmitter<void>();
  @Output() componentCreated = new EventEmitter<{name: string, instance: any}>();
  @Output() processingStateChange = new EventEmitter<boolean>();
  @Output() errorOccurred = new EventEmitter<Error>();

  // Gets a reference to an HTML Element with the 'mathContainer' selector
  @ViewChild('mathContainer', { static: true }) mathContainer!: ElementRef<HTMLElement>;

  // Import the MathJaxService
  private readonly mathJaxService = inject(MathJaxService);
  // Gives a hook into the components `ngOnDestroy` phase
  private readonly destroyRef = inject(DestroyRef);

  // Reactive state
  isProcessing = signal<boolean>(false);
  componentCount = signal<number>(0);
  processingStage = signal<'parsing' | 'components' | 'math' | 'complete'>('complete');
  errorMessage = signal<string>('');

  // Internal state
  componentsEnabled = true;
  private lastProcessedContent = '';
  private debounceTimer: any = null;
  private isInitialized = false;

  // Debugging variables
  private readonly useMarked: boolean = false;

  ngOnInit(): void {
    console.log('🚀 MathJaxContentComponent initializing...');
    this.setupDestroyCleanup();
  }

  ngAfterViewInit(): void {
    this.isInitialized = true;
    if (this.content && this.autoProcess) {
      this.processContent();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] && !changes['content'].firstChange && this.isInitialized) {
      if (this.autoProcess) {
        this.debouncedProcessContent();
      }
    }

    if (changes['enableDynamicComponents'] && !changes['enableDynamicComponents'].firstChange) {
      this.componentsEnabled = this.enableDynamicComponents;
      if (this.lastProcessedContent && this.isInitialized) {
        this.processContent();
      }
    }
  }

  /**
   * Cleans up the component right before it is destroyed.
   */
  ngOnDestroy(): void {
    this.clearDebounceTimer();
    this.mathJaxService.destroyAllComponents();
  }

  /**
   * Sets up a method to run after the component is destroyed using `ngOnDestory`.
   * @private
   */
  private setupDestroyCleanup(): void {
    this.destroyRef.onDestroy(() => {
      // Clear the debounce timer a second time for robustness.
      this.clearDebounceTimer();
      console.log('🧹 MathJaxContentComponent cleanup completed');
    });
  }

  /**
   * Clear the debounce timer and set it to null.
   * @private
   */
  private clearDebounceTimer(): void {
    if (this.debounceTimer) {
      // Cancel a timeout that was potentially scheduled prior.
      clearTimeout(this.debounceTimer);
      // Set the debounce timer back to null.
      this.debounceTimer = null;
    }
  }

  /**
   * Schedule the content on the page to be processed after
   * a specified timeout.
   * @private
   */
  private debouncedProcessContent(): void {
    // Reset the timer
    this.clearDebounceTimer();
    // Once the timer times out after debounceMs milliseconds,
    // the content will be processed.
    this.debounceTimer = setTimeout(() => {
      this.processContent();
    }, this.debounceMs);
  }

  /**
   *
   */
  async processContent(): Promise<void> {

    // If the content is null, undefined, or trims to an empty string, clear the content
    // and return as there is nothing to process.
    if (!this.content?.trim()) {
      this.clearContent();
      return;
    }

    // Prevent duplicate processing if the previous content had finished processing
    // and our new content matches our prior content.
    if (this.content === this.lastProcessedContent && !this.isProcessing()) {
      console.log('📋 Content unchanged, skipping processing');
      return;
    }

    // We are in the processing parsing stage. Clear prior errors as well.
    this.setProcessingState(true, 'parsing');
    this.clearError();

    try {

      // Perform some logging describing the content being passed to this MathJax component.
      console.log('🔄 Processing content...', {
        length: this.content.length,
        hasComponents: this.content.includes('<ng-component'),
        componentsEnabled: this.componentsEnabled && this.enableDynamicComponents
      });

      // Clean up previous components
      this.mathJaxService.destroyAllComponents();
      this.componentCount.set(0);

      // Convert markdown to HTML
      let markedParser = await marked(this.content);
      let customParser = await this.convertMarkdownToHtml(this.content);
      const htmlContent = this.useMarked ? markedParser : customParser;

      console.log('📝 Content converted to HTML', {
        usedMarked: this.useMarked,
        markedParser: markedParser,
        customParser: customParser
      });

      // Update DOM safely
      if (this.mathContainer?.nativeElement) {

        // Use innerHTML directly since we control the content generation. Set the HTML Element
        // with the 'mathContainer' tag to have its HTML content be the content we processed
        // from the markdown -> HTML conversion.
        this.mathContainer.nativeElement.innerHTML = htmlContent;
        console.log('📦 HTML content updated in DOM');

        // Process Angular components if enabled. Our MathJaxContentComponent allows for dynamic
        // creation of Angular components in addition to rendering Latex.
        if (this.componentsEnabled && this.enableDynamicComponents) {
          this.setProcessingState(true, 'components');
          await this.processComponents();
        }

        // Render MathJax in the HTML content.
        this.setProcessingState(true, 'math');
        await this.renderMathJax();

        // Save this content as the last processed content.
        this.lastProcessedContent = this.content;

        // Update our internal state to reflect that we have finished processing.
        this.setProcessingState(false, 'complete');

        // Emit that the content has finished processing.
        this.contentProcessed.emit();
        console.log('✅ Content processing completed successfully');
      }

    } catch (error) {
      console.error('❌ Error processing content:', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Set the HTML Element with the 'mathContainer' tag to have empty inner HTML content. Also updates
   * any internal state variables corresponding to the content.
   * @private
   */
  private clearContent(): void {

    if (this.mathContainer?.nativeElement) {
      // If the HTML Element with tag 'mathContainer' exists, then set its inner HTML to empty.
      this.mathContainer.nativeElement.innerHTML = '';
    }
    // Destroy any previously rendered Latex
    this.mathJaxService.destroyAllComponents();
    // Set the number of dynamic components back to 0.
    this.componentCount.set(0);
    // The content is now cleared and empty.
    this.lastProcessedContent = '';
  }

  /**
   * Generates any Angular components that were found during the Markdown -> HTML conversion in the
   * math container.
   * @private
   */
  private async processComponents(): Promise<void> {

    // The math container is undefined/null and therefore does not have inner HTML.
    if (!this.mathContainer?.nativeElement) return;

    try {

      // Using the MathJax service to create the Angular components inside the math container.
      await this.mathJaxService.processAngularComponents(this.mathContainer.nativeElement);

      // Count created components.
      const componentContainers = this.mathContainer.nativeElement.querySelectorAll('.dynamic-component-container');
      const count = componentContainers.length;
      this.componentCount.set(count);

      console.log(`🎯 Component processing complete: ${count} components created`);

      // Emit events for each component
      componentContainers.forEach((container) => {
        const componentName = container.getAttribute('data-component-name');
        if (componentName) {
          this.componentCreated.emit({
            name: componentName,
            instance: null // We don't expose the actual instance for security
          });
        }
      });

    } catch (error) {
      console.error('❌ Component processing failed:', error);
      throw new Error(`Component processing failed: ${error}`);
    }
  }

  /**
   * Uses the MathJax service to render any Latex inside the math container.
   * @private
   */
  private async renderMathJax(): Promise<void> {

    // The math container is null/undefined, return as there is nothing to process.
    if (!this.mathContainer?.nativeElement) return;

    try {
      // Call the service to render the Latex in the HTML Element.
      await this.mathJaxService.renderMath(this.mathContainer.nativeElement);
      console.log('🧮 MathJax rendering completed');
    } catch (error) {
      console.error('❌ MathJax rendering failed:', error);
      throw new Error(`MathJax rendering failed: ${error}`);
    }
  }

  /**
   * Given a string with Markdown content, convert it to a string with HTML content.
   * @param markdown
   * @private
   */
  private convertMarkdownToHtml(markdown: string): string {
    let html = markdown;

    // Escape HTML entities first (except our component tags)
    html = html.replace(/<(?!\/?(ng-component|h[1-6]|p|strong|em|ol|ul|li|br)\b)[^>]*>/gi, (match) => {
      return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    });

    // Convert headers (from most specific to least specific)
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert text formatting
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert lists
    html = html.replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/^[-*+]\s+(.*$)/gim, '<li>$1</li>');

    // Wrap consecutive list items in appropriate tags
    html = html.replace(/(<li>.*<\/li>\s*)+/gs, (match) => {
      const isNumbered = markdown.match(/^\d+\./m);
      const tag = isNumbered ? 'ol' : 'ul';
      return `<${tag}>${match}</${tag}>`;
    });

    // Convert paragraphs (more sophisticated approach)
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inParagraph = false;
    let currentParagraph: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        if (inParagraph) {
          processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
          inParagraph = false;
        }
        continue;
      }

      // Check if line is a block element
      const isBlockElement = /^<(h[1-6]|ol|ul|li|ng-component|div|blockquote)/.test(trimmedLine) ||
        /^<\/(h[1-6]|ol|ul|li|ng-component|div|blockquote)/.test(trimmedLine) ||
        trimmedLine.startsWith('<ng-component');

      if (isBlockElement) {
        // Close current paragraph if open
        if (inParagraph) {
          processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
          inParagraph = false;
        }
        processedLines.push(trimmedLine);
      } else {
        // Add to current paragraph
        currentParagraph.push(trimmedLine);
        inParagraph = true;
      }
    }

    // Close final paragraph if needed
    if (inParagraph && currentParagraph.length > 0) {
      processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
    }

    return processedLines.join('\n');
  }


  /**
   * Sets the processing state of the component and the processing stage (if processing).
   * @param processing - Boolean marking if the component is processing.
   * @param stage - Processing stage. Must be same type as the processingStage signal.
   * @private
   */
  private setProcessingState(
    processing: boolean,
    stage: ReturnType<typeof this.processingStage>
  ): void {
    this.isProcessing.set(processing);
    this.processingStage.set(stage);
    this.processingStateChange.emit(processing);
  }

  /**
   * Updates signals and emitters to describe that an error has occurred during component generation.
   * @param error - Error to parse.
   * @private
   */
  private handleError(error: Error): void {
    this.errorMessage.set(error.message || 'Unknown error occurred');
    this.setProcessingState(false, 'complete');
    this.errorOccurred.emit(error);
    console.error('💥 Processing error:', error);
  }

  // Public methods

  /**
   * Allows the user to manually refresh the content.
   */
  refresh(): void {
    console.log('🔄 Manual refresh triggered');
    // this.lastProcessedContent = ''; // Force reprocessing
    this.clearContent();
    this.processContent();
  }

  /**
   * If the math container allows dynamic Angular component generation, this allows the user
   * to manually turn on/off the generation of these components.
   */
  toggleComponentsEnabled(): void {
    this.componentsEnabled = !this.componentsEnabled;
    console.log(`🔧 Components ${this.componentsEnabled ? 'enabled' : 'disabled'}`);

    if (this.lastProcessedContent) {
      this.processContent();
    }
  }

  /**
   * Clears the error's message.
   */
  clearError(): void {
    this.errorMessage.set('');
  }

  // Status helpers
  /**
   * String describing the status of the component.
   */
  statusClass(): string {
    if (this.hasError()) return 'error';
    if (this.isProcessing()) return 'processing';
    return 'ready';
  }

  /**
   * Returns emoji string to describe the status of the component.
   */
  statusIcon(): string {
    if (this.hasError()) return '❌';
    if (this.isProcessing()) return '⏳';
    return '✅';
  }

  /**
   * String describing the status of the component.
   */
  statusText(): string {
    if (this.hasError()) return 'Error';
    if (this.isProcessing()) return 'Processing';
    return 'Ready';
  }

  /**
   * Returns a string describing the current processing stage of the component.
   */
  loadingMessage(): string {
    switch (this.processingStage()) {
      case 'parsing': return 'Converting content...';
      case 'components': return 'Loading components...';
      case 'math': return 'Rendering mathematics...';
      default: return 'Processing...';
    }
  }

  /**
   * Returns a string describing the current processing stage of the component.
   */
  loadingDetails(): string {
    switch (this.processingStage()) {
      case 'parsing': return 'Converting markdown to HTML';
      case 'components': return `Creating ${this.componentCount()} dynamic components`;
      case 'math': return 'Typesetting mathematical expressions';
      default: return 'Please wait...';
    }
  }

  hasError(): boolean {
    return !!this.errorMessage();
  }

  // Utility methods for external access
  getProcessedContent(): string {
    return this.lastProcessedContent;
  }

  isContentLoaded(): boolean {
    return !!this.lastProcessedContent && !this.isProcessing();
  }

  getComponentElements(): NodeListOf<Element> {
    return this.mathContainer?.nativeElement?.querySelectorAll('.dynamic-component-container') ||
      document.querySelectorAll(''); // Empty NodeList
  }
}
