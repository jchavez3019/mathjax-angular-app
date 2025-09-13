const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ---- Load config.json ----
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ config.json not found. Please create it.');
  process.exit(1);
}

// Configuration file for this script
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
// Watch file path for markdown files
const watchDir = config.watchDir || './pandoc_util';
// Path used in this script to save the rendered files
const fullOutputDir = path.join(config.assetsDir, config.outputDir) || './src/assets/';
// Name of the manifest json file
const manifestFileName = config.manifestFileName || 'latex_files.json';
// Manifest json file should always be saved at the './assets' level
const manifestPath = path.join(config.assetsDir, manifestFileName);
// Get the path to the apa.csl file which is used to format .bib references in APA style if a LaTeX document
// has a .bib file accompanying it.
const apaCslPath = path.join(watchDir, 'apa.csl');

console.log(`Watching for changes in: ${watchDir}`);
console.log(`Configured files:`, config.files.map(f => f.source).join(', '));

// ---- Manifest helpers ----
function readManifest() {
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (e) {
      console.warn(`⚠️ Could not parse ${manifestFileName}. Resetting it.`);
    }
  }
  return {
    'files': [],
  };
}

function writeManifest(manifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function updateManifest(newEntry) {
  let manifest = readManifest();
  // Remove existing entry with same file
  manifest.files = manifest.files.filter(f => f.file !== newEntry.file);
  // Save the file path relative to './assets' for easier access in Angular front-end
  newEntry.file = path.join('./assets', config.outputDir, newEntry.file);
  // Push the entry into the manifest
  manifest.files.push(newEntry);
  // Save the output path
  manifest.outputDir = path.join('./assets/', config.outputDir); // relative path for Angular
  // Write the manifest back into the .json
  writeManifest(manifest);
  console.log(`📁 Updated manifest entry: ${newEntry.file}`);
}

// ---- Processing ----
function processMarkdownFile(source, displayName, bibSource) {
  const filePath = path.join(watchDir, source);
  const bibPath = path.join(watchDir, bibSource);
  const baseName = path.basename(source, '.md');
  const outputFile = `${baseName}.html`;
  const outputPath = path.join(fullOutputDir, outputFile);

  let command_args = `--mathjax --from=markdown+raw_html --wrap=none --no-highlight "${filePath}" -o "${outputPath}"`;
  if (bibSource !== '') {
    command_args = ` --csl="${apaCslPath}" --metadata=link-citations=true --citeproc --bibliography="${bibPath}" ` + command_args;
  }

  console.log(`Processing ${filePath}...`);

  exec('pandoc ' + command_args, (error, stdout, stderr) => {
    if (error) {
      console.error(`✗ Error processing ${filePath}:`, error.message);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      return;
    }

    if (stderr) console.warn(`Warning for ${filePath}:`, stderr);

    console.log(`✓ Successfully processed ${filePath} -> ${outputPath}`);
    updateManifest({ file: outputFile, display_name: displayName });
  });
}

// ---- Initial compile ----
function processAllConfiguredFiles() {
  // Delete existing output files and manifest file to prevent duplicates on restart
  if (fs.existsSync(manifestPath)) {
    try {
      const existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (existingManifest.files && Array.isArray(existingManifest.files)) {
        for (const fileEntry of existingManifest.files) {
          const filePath = path.join('./src', fileEntry.file);
          console.log(`Checking to see if ${filePath} exists and should be deleted...`)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted existing output file: ${filePath}`);
          } else {
            console.log(`File ${filePath} did not exist, moving on.`)
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Could not parse existing manifest for cleanup: ${e.message}`);
    }

    fs.unlinkSync(manifestPath);
    console.log(`🗑️ Deleted existing manifest file: ${manifestPath}`);
  }

  for (const f of config.files) {
    const filePath = path.join(watchDir, f.source);
    if (fs.existsSync(filePath)) {
      processMarkdownFile(f.source, f.display_name, f.bibliography_source ?? '');
    } else {
      console.warn(`⚠️ File not found: ${f.source}`);
    }
  }
}

// ---- Watcher ----
fs.watch(watchDir, (eventType, filename) => {
  if (filename && filename.endsWith('.md')) {
    const match = config.files.find(f => f.source === filename);
    if (!match) return; // ignore non-configured files

    console.log(`\nFile ${eventType}: ${filename}`);
    setTimeout(() => {
      const filePath = path.join(watchDir, filename);
      if (fs.existsSync(filePath)) {
        processMarkdownFile(match.source, match.display_name, match.bibliography_source ?? '');
      }
    }, 100);
  }
});

// ---- Run once on startup ----
processAllConfiguredFiles();

process.on('SIGINT', () => {
  console.log('\nStopping markdown watcher...');
  process.exit(0);
});
