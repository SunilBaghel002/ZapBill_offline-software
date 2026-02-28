const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint-report.json', 'utf-8'));
const issues = data.filter(d => d.errorCount > 0 || d.warningCount > 0).map(d => {
  const fileName = d.filePath.split('\\').pop();
  const fileMsgs = d.messages.map(m => `Line ${m.line}[${m.severity === 2 ? 'ERROR' : 'WARN'}]: ${m.message} (${m.ruleId})`).join('\n');
  return `\n--- ${fileName} ---\n${fileMsgs}`;
});
fs.writeFileSync('eslint-summary.txt', issues.join('\n'));
console.log('Saved to eslint-summary.txt');
