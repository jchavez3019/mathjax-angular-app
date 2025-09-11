const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Directory to watch (current directory)
const watchDir = './pandoc_util';
const outputDir = './src/assets/';

console.log('Watching for markdown file changes...');

// Function to process a single markdown file
function processMarkdownFile(filePath) {
  const fileName = path.basename(filePath, '.md');
  const outputPath = path.join(outputDir, `${fileName}.html`);

  const command = `pandoc --mathjax --from=markdown+raw_html --wrap=none --no-highlight "${filePath}" -o "${outputPath}"`;

  console.log(`Processing ${filePath}...`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`✗ Error processing ${filePath}:`, error.message);
      // Remove output file if it exists but pandoc failed
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      return;
    }

    if (stderr) {
      console.warn(`Warning for ${filePath}:`, stderr);
    }

    console.log(`✓ Successfully processed ${filePath} -> ${outputPath}`);
  });
}

// Function to process all markdown files
function processAllMarkdownFiles() {
  fs.readdir(watchDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    // Filter out all files that are not markdown
    const markdownFiles = files.filter(file => file.endsWith('.md'));
    // Parse each markdown file using pandoc
    markdownFiles.forEach(file => {
      const filePath = path.join(watchDir, file);
      processMarkdownFile(filePath);
    });
  });
}

// Watch for file changes
fs.watch(watchDir, (eventType, filename) => {
  if (filename && filename.endsWith('.md')) {
    console.log(`\nFile ${eventType}: ${filename}`);

    // Small delay to ensure file write is complete
    setTimeout(() => {
      const filePath = path.join(watchDir, filename);

      // Check if file still exists (wasn't deleted)
      if (fs.existsSync(filePath)) {
        processMarkdownFile(filePath);
      }
    }, 100);
  }
});

// Process all existing files on startup
processAllMarkdownFiles();

// Keep the process running
process.on('SIGINT', () => {
  console.log('\nStopping markdown watcher...');
  process.exit(0);
});
