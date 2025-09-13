# Pandoc Utility

## Summary

At a high-level, this entire project is aimed at nicely converting LaTeX documents into a clean and readable format in a front-end web application. The front-end is rendered using the Angular framework, but in order to render the LaTeX document, we must pre-process them using the `pandoc` 
program. The objective of this directory is to take MarkDown files with LaTeX equation support, and pre-process them into their .html counterpart. This .html format can be conveniently read by the mathjax-full npm package which is used in the Angular front-end.

This directory houses markdown files which are enhanced with LaTeX equation support and optionally, .bib references in APA format. For a sample of a markdown file, refer to *./pandoc_util/output1.md* and *./pandoc_util/output2.md*. 
Their outputs are saved in *./src/assets/latex_docs* with a corresponding file named "./src/assets/latex_files.json" to help the Angular front-end application to find these documents. The rendered output is in .html, allowing the npm mathjax-full package to 
nicely render them in the front-end application.
