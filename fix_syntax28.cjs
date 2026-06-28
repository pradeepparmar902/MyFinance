const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('))}')) {
    // Check if it's one of the valid ones
    if (lines[i].includes('e=>setForm(p=>({...p,')) {
      continue;
    }
    if (lines[i].includes('e=>setRangeFrom(f=>({...f,')) {
      continue;
    }
    if (lines[i].includes('e=>setRangeTo(f=>({...f,')) {
      continue;
    }
    if (lines[i].includes('()=>setFilter(f=>({...f,')) {
      continue;
    }
    if (lines[i].includes('() => setForm(p=>({...p,')) {
      continue;
    }
    
    // Otherwise, replace ALL `))` with `)` at the end of these blocks
    lines[i] = lines[i].replace(/e\.target\.value\)\)\}/g, 'e.target.value)}');
    lines[i] = lines[i].replace(/\+e\.target\.value\)\)\}/g, '+e.target.value)}');
  }
}
fs.writeFileSync('src/FinPilotAI.jsx', lines.join('\n'), 'utf8');
console.log('Fixed line by line.');
