// document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

export interface DocumentMetadata {
  title?: string;
  author?: string;
  date?: string;
  // mathConfig?: MathJaxConfig;
  section?: number;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  constructor(private http: HttpClient) {}

  /**
   * Given a path to an HTML document, return its content and meta-data.
   * @param path - Path to the HTML document.
   */
  loadDocument(path: string): Observable<{ content: string; metadata?: DocumentMetadata }> {
    return this.http.get(path, { responseType: 'text' }).pipe(
      map(content => {
        // Get the text content, and parse its meta-data and pure content (w/o the meta-data).
        const metadata = this.extractMetadata(content);
        const cleanedContent = this.removeMetadataFromContent(content);

        // Return the data in the desired format which is a map.
        return {
          content: cleanedContent,
          metadata
        };
      }),
      catchError(error => {
        console.error(`Failed to load document: ${path}`, error);
        return throwError(() => new Error(`Failed to load document from ${path}: ${error.message || 'Unknown error'}`));
      })
    );
  }

  /**
   * Given the content in an HTML document, extract its meta-data.
   * @param content - Raw string content from an HTML document.
   * @private
   */
  private extractMetadata(content: string): DocumentMetadata | undefined {
    // Try to extract JSON metadata from HTML comments
    const metadataMatch = content.match(/<!--\s*METADATA:(.*?)-->/s);
    if (metadataMatch) {
      try {
        const metadata = JSON.parse(metadataMatch[1].trim());
        console.log('Extracted metadata:', metadata);
        return metadata;
      } catch (error) {
        console.warn('Failed to parse metadata JSON:', error);
      }
    }

    // Try to extract YAML-style frontmatter
    const yamlMatch = content.match(/^---\s*\n(.*?)\n---\s*\n/s);
    if (yamlMatch) {
      try {
        const metadata = this.parseSimpleYaml(yamlMatch[1]);
        console.log('Extracted YAML metadata:', metadata);
        return metadata;
      } catch (error) {
        console.warn('Failed to parse YAML metadata:', error);
      }
    }

    // Try to extract from HTML meta tags
    const htmlMetadata = this.extractHtmlMetadata(content);
    if (htmlMetadata && Object.keys(htmlMetadata).length > 0) {
      return htmlMetadata;
    }

    return undefined;
  }

  /**
   * Removes the meta-data from the content of an HTML document.
   * @param content - Raw string content from an HTML document.
   * @private
   */
  private removeMetadataFromContent(content: string): string {
    // Remove JSON metadata comments
    content = content.replace(/<!--\s*METADATA:.*?-->/s, '');

    // Remove YAML frontmatter
    content = content.replace(/^---\s*\n.*?\n---\s*\n/s, '');

    return content.trim();
  }

  /**
   * Parses the meta-data content into an interpretable interface.
   * @param yamlText
   * @private
   */
  private parseSimpleYaml(yamlText: string): DocumentMetadata {
    const metadata: DocumentMetadata = {};
    const lines = yamlText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Handle special fields
      switch (key.toLowerCase()) {
        case 'title':
          metadata.title = value;
          break;
        case 'author':
          metadata.author = value;
          break;
        case 'date':
          metadata.date = value;
          break;
        case 'section':
          metadata.section = parseInt(value, 10);
          break;
        case 'description':
          metadata.description = value;
          break;
        case 'mathconfig':
          try {
            // metadata.mathConfig = JSON.parse(value);
          } catch {
            console.warn(`Failed to parse mathConfig: ${value}`);
          }
          break;
        default:
          // Store other properties in mathConfig if they look like MathJax settings
          if (['tags', 'tagside', 'tagindent'].includes(key.toLowerCase())) {
            // if (!metadata.mathConfig) metadata.mathConfig = {};
            // (metadata.mathConfig as any)[key] = value;
          }
          break;
      }
    }

    return metadata;
  }

  private extractHtmlMetadata(content: string): DocumentMetadata | undefined {
    const metadata: DocumentMetadata = {};
    let hasMetadata = false;

    // Extract title from HTML title tag
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
      hasMetadata = true;
    }

    // Extract from meta tags
    const metaMatches = content.matchAll(/<meta\s+name="([^"]+)"\s+content="([^"]+)"/gi);
    for (const match of metaMatches) {
      const name = match[1].toLowerCase();
      const content = match[2];

      switch (name) {
        case 'author':
          metadata.author = content;
          hasMetadata = true;
          break;
        case 'date':
          metadata.date = content;
          hasMetadata = true;
          break;
        case 'description':
          metadata.description = content;
          hasMetadata = true;
          break;
        case 'mathjax-section':
          metadata.section = parseInt(content, 10);
          hasMetadata = true;
          break;
      }
    }

    return hasMetadata ? metadata : undefined;
  }

  // Utility method to create a document with embedded metadata
  createDocumentWithMetadata(content: string, metadata: DocumentMetadata): string {
    const metadataComment = `<!-- METADATA:${JSON.stringify(metadata, null, 2)} -->`;
    return `${metadataComment}\n\n${content}`;
  }

  // Method to validate document format
  validateDocument(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for basic structure
    if (!content || content.trim().length === 0) {
      errors.push('Document is empty');
    }

    // Check for unmatched math delimiters
    const dollarSigns = (content.match(/\$/g) || []).length;
    if (dollarSigns % 2 !== 0) {
      errors.push('Unmatched $ delimiters detected');
    }

    const displayMathOpen = (content.match(/\\\[/g) || []).length;
    const displayMathClose = (content.match(/\\\]/g) || []).length;
    if (displayMathOpen !== displayMathClose) {
      errors.push('Unmatched \\[ \\] delimiters detected');
    }

    const inlineMathOpen = (content.match(/\\\(/g) || []).length;
    const inlineMathClose = (content.match(/\\\)/g) || []).length;
    if (inlineMathOpen !== inlineMathClose) {
      errors.push('Unmatched \\( \\) delimiters detected');
    }

    // Check for potential problematic LaTeX commands
    const problematicCommands = [
      '\\input', '\\include', '\\write', '\\immediate', '\\openin', '\\openout'
    ];

    for (const cmd of problematicCommands) {
      if (content.includes(cmd)) {
        errors.push(`Potentially problematic command detected: ${cmd}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Method to preprocess content for better MathJax compatibility
  preprocessContent(content: string): string {
    // Normalize line endings
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Ensure proper spacing around math delimiters
    content = content.replace(/([^\s])\$([^\s])/g, '$1 $$2');
    content = content.replace(/([^\s])\$([^\s])/g, '$1$ $2');

    // Fix common LaTeX issues
    content = content.replace(/\\begin{align\*}/g, '\\begin{align*}');
    content = content.replace(/\\end{align\*}/g, '\\end{align*}');

    // Ensure equations are on their own lines when using display math
    content = content.replace(/([^\n])\\\[/g, '$1\n\\[');
    content = content.replace(/\\\]([^\n])/g, '\\]\n$1');

    return content;
  }

  // Method to extract math expressions for validation
  extractMathExpressions(content: string): { inline: string[]; display: string[] } {
    const inline: string[] = [];
    const display: string[] = [];

    // Extract inline math ($ ... $)
    const inlineMatches = content.matchAll(/\$([^$\n]+)\$/g);
    for (const match of inlineMatches) {
      inline.push(match[1]);
    }

    // Extract inline math (\( ... \))
    const inlineParenMatches = content.matchAll(/\\\(([^)]+)\\\)/g);
    for (const match of inlineParenMatches) {
      inline.push(match[1]);
    }

    // Extract display math (\[ ... \])
    const displayBracketMatches = content.matchAll(/\\\[([^\]]+)\\\]/g);
    for (const match of displayBracketMatches) {
      display.push(match[1]);
    }

    // Extract display math ($$ ... $$)
    const displayDollarMatches = content.matchAll(/\$\$([^$]+)\$\$/g);
    for (const match of displayDollarMatches) {
      display.push(match[1]);
    }

    return { inline, display };
  }
}
