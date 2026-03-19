// Quick script to re-index the dictionary with native scripts
const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Re-indexing Bhutia and Lepcha translations with native scripts...\n');

try {
  const ingestScriptPath = path.join(__dirname, 'chroma_db', 'ingest.py');
  
  console.log('Running ingest.py...');
  const result = execSync(`python "${ingestScriptPath}"`, { 
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ Database re-indexed successfully!');
  console.log('✨ Bhutia (Tibetan script) and Lepcha translations are now ready!');
} catch (error) {
  console.error('❌ Error during re-indexing:', error.message);
}
