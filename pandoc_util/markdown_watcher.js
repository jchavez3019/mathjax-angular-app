const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ---- Load config.json ----
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ config.json not found. Please create it.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const watchDir = config.watchDir || './pandoc_util';
const fullOutputDir = path.join(config.assetsDir, config.outputDir) || './src/assets/';
const manifestFileName = config.manifestFileName || 'latex_files.json';
const manifestPath = path.join(fullOutputDir, manifestFileName);

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
  return {};
}

function writeManifest(manifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function updateManifest(newEntry) {
  let manifest = readManifest();
  // Remove existing entry with same file
  manifest.files = manifest.files.filter(f => f.file !== newEntry.file);
  manifest.files.push(newEntry);
  manifest.outputDir = path.join('./assets/', config.outputDir); // relative path for Angular
  writeManifest(manifest);
  console.log(`📁 Updated manifest entry: ${newEntry.file}`);
}

// ---- Processing ----
function processMarkdownFile(source, displayName) {
  const filePath = path.join(watchDir, source);
  const baseName = path.basename(source, '.md');
  const outputFile = `${baseName}.html`;
  const outputPath = path.join(fullOutputDir, outputFile);

  const command = `pandoc --mathjax --from=markdown+raw_html --wrap=none --no-highlight "${filePath}" -o "${outputPath}"`;

  console.log(`Processing ${filePath}...`);

  exec(command, (error, stdout, stderr) => {
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
  for (const f of config.files) {
    const filePath = path.join(watchDir, f.source);
    if (fs.existsSync(filePath)) {
      processMarkdownFile(f.source, f.display_name);
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
        processMarkdownFile(match.source, match.display_name);
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
