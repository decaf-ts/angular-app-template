const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../src/assets/env.sample.pdm.js');
const targetFile = path.join(__dirname, '../src/assets/env.js');

function copyEnvFile() {
  try {
    const data = fs.readFileSync(sourceFile, 'utf8');
    fs.writeFileSync(targetFile, data, 'utf8');
  } catch (error) {
    console.error('Error on patch pdm env file:', error.message);
  }
}

// Executa a função
copyEnvFile();
