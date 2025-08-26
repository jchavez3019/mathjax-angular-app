//mathjax.service.ts
import { Injectable, ComponentRef, Type, inject, EnvironmentInjector, createComponent, ApplicationRef } from '@angular/core';
import {BehaviorSubject, filter, firstValueFrom, Observable, take} from 'rxjs';

declare global {
  interface Window {
    MathJax: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class MathJaxService {

  // Hooks the service into the Angular application's lifecycle.
  private readonly appRef = inject(ApplicationRef);
  // This allows us to dynamically create components/services at runtime, often with the
  // `ViewContainerRef.createComponent` method.
  private readonly injector = inject(EnvironmentInjector);

  private isLoaded$ = new BehaviorSubject<boolean>(false);
  private isLoading = false;
  private registeredComponents = new Map<string, Type<any>>();
  private componentInstances = new Map<string, ComponentRef<any>>();

  constructor() {
    this.loadMathJax();
  }

  /**
   * Subscribe to an observable marking whether the MathJax service has been loaded.
   * @returns An observable of the isLoaded$ subject.
   */
  get mathJaxLoaded$(): Observable<boolean> {
    return this.isLoaded$.asObservable();
  }

  /**
   * Configures MathJax for rendering Latex.
   * @private
   */
  private async loadMathJax(): Promise<void> {
    if (this.isLoading || window.MathJax) {
      if (window.MathJax) {
        this.isLoaded$.next(true);
      }
      return;
    }

    // Mark that we are now loading MathJax
    this.isLoading = true;

    try {
      // Configure MathJax
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
          packages: ['base', 'ams', 'newcommand', 'configmacros', 'action'],
          tags: 'ams',
          tagSide: 'right',
          tagIndent: '0.8em',
          processEscapes: true,
          processEnvironments: true,
          macros: {
            // We can add more macros here
          }
        },
        svg: {
          fontCache: 'global'
        },
        startup: {
          ready: () => {
            window.MathJax.startup.defaultReady();
            console.log('MathJax loaded successfully');
            // Emit a behavior subject that MathJax is now successfully loaded
            this.isLoaded$.next(true);
          }
        }
      };

      // Load MathJax script
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
      script.async = true;
      script.onload = () => {
        console.log('MathJax script loaded');
      };
      script.onerror = (error) => {
        console.error('Failed to load MathJax script:', error);
        this.isLoading = false;
      };

      document.head.appendChild(script);

    } catch (error) {
      console.error('Failed to initialize MathJax:', error);
      this.isLoading = false;
    }
  }

  /**
   * Given an HTML Element, this service will use MathJax v3 to render any Latex existing in the element.
   * @param element - HTML Element in question.
   */
  async renderMath(element: HTMLElement): Promise<void> {

    // If MathJax is still loading, stall.
    if (!this.isLoaded$.value) {
      await firstValueFrom(
        this.isLoaded$.pipe(
          filter(loaded => loaded == true), // filter out emissions that are false
          take(1)                   // we only care about the first `true` emission
        )
      );
    }

    try {

      // Clear any existing MathJax rendering state so that we do not duplicate formulas.
      if (window.MathJax && window.MathJax.typesetClear) {
        window.MathJax.typesetClear([element]);
      }

      // Perform the MathJax rendering call.
      if (window.MathJax && window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([element]);
        console.log('Math rendered successfully');
      }
    } catch (error) {
      console.error('MathJax rendering error:', error);
    }
  }

  /**
   *
   * @param name
   * @param componentType
   */
  registerComponent(name: string, componentType: Type<any>): void {
    this.registeredComponents.set(name, componentType);
    console.log(`Component registered: ${name}`);
  }

  /**
   * Dynamically creates a pre-registered component into a host HTML Element.
   * @param componentName - Name of the pre-registered component that will get generated.
   * @param hostElement - The host HTML Element that will hold the dynamically created component.
   * @param props - When given, additional properties to be set onto the newly generated component.
   */
  createDynamicComponent<T = any>(
    componentName: string,
    hostElement: HTMLElement,
    props?: any
  ): ComponentRef<T> | null {

    // Get the type of the registered component
    const componentType = this.registeredComponents.get(componentName);

    // Throw an error if trying to create a component that has not yet been registered.
    if (!componentType) {
      console.error(`Component ${componentName} not registered`);
      return null;
    }

    try {
      // Create a component using the given HTML Element and get a reference to this component.
      const componentRef = createComponent(componentType, {
        environmentInjector: this.injector,
        hostElement
      }) as ComponentRef<T>;

      // Set the properties of the component if provided.
      if (props && componentRef.instance) {
        for (const [k, v] of Object.entries(props ?? {})) {
          componentRef.setInput?.(k as any, v); // triggers ngOnChanges properly
        }
      }

      // Register the component's view into the root of the application reference so that it may participate in
      // the global change detection.
      this.appRef.attachView(componentRef.hostView);
      // Renders the template into the host element, runs the component's lifecycle hooks (e.g. ngOnInit), and processes
      // bindings.
      componentRef.changeDetectorRef.detectChanges();

      // Store reference for cleanup.
      const instanceId = `${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.componentInstances.set(instanceId, componentRef);
      hostElement.setAttribute('data-component-id', instanceId);

      console.log(`Dynamic component created: ${componentName}`, componentRef.instance);
      return componentRef;
    } catch (error) {
      console.error(`Error creating component ${componentName}:`, error);
      return null;
    }
  }

  /**
   *
   */
  destroyAllComponents(): void {
    this.componentInstances.forEach((componentRef, id) => {
      try {
        // Detach the view of the component from the application and destroy it.
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
      } catch (error) {
        console.error('Error destroying component:', error);
      }
    });
    // Clear the component instance map.
    this.componentInstances.clear();
  }

  /**
   * This method turns placeholder tags (<ng-component>) into real Angular components by:
   * 1. Finding all <ng-component> tags inside a given element.
   * 2. Extracting the name and props.
   * 3. Replacing the tag with a styled <div>.
   * 4. Dynamically creating the Angular component inside that div.
   * 5. Wiring up props, logging success/failure, and leaving behind a fallback error message if creation fails.
   *
   * @param element
   */
  processAngularComponents(element: HTMLElement): void {
    console.log('Processing Angular components in element:', element);

    // Process <ng-component> tags
    const componentTags = element.querySelectorAll('ng-component');
    console.log('Found component tags:', componentTags.length);

    componentTags.forEach((tag: Element, index: number) => {
      const componentName = tag.getAttribute('name');
      const propsStr = tag.getAttribute('props');

      console.log(`Processing component ${index + 1}:`, { componentName, propsStr });

      if (componentName) {
        try {
          // Get the properties of the element into a map.
          const props = propsStr ? JSON.parse(propsStr) : {};
          console.log('Parsed props:', props);

          // Create a container div
          const container = document.createElement('div');
          container.className = 'dynamic-component-container';
          container.style.margin = '16px 0';
          container.style.padding = '8px';
          container.style.border = '1px dashed #ccc';
          container.style.borderRadius = '4px';

          // Replace the tag with the container
          tag.parentNode?.replaceChild(container, tag);
          console.log('Replaced tag with container');

          // Create the component
          const componentRef = this.createDynamicComponent(componentName, container, props);

          if (componentRef) {
            console.log('✅ Component created successfully:', componentName);
          } else {
            console.error('❌ Failed to create component:', componentName);
            container.innerHTML = `<div style="color: red; padding: 8px;">Error: Component "${componentName}" could not be created</div>`;
          }

        } catch (error) {
          console.error('Error processing component tag:', error);
          tag.innerHTML = `<div style="color: red; padding: 8px;">Error: ${componentName} - ${error}</div>`;
        }
      } else {
        console.warn('Component tag missing name attribute:', tag);
      }
    });

    // Also check for any remaining ng-component tags that might not have been processed
    const remainingTags = element.querySelectorAll('ng-component');
    if (remainingTags.length > 0) {
      console.warn('Some ng-component tags were not processed:', remainingTags);
    }
  }
}
