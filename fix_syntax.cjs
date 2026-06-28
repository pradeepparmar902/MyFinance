const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Fix the truncated onChange handlers
code = code.replace(/onChange=\{e=>setForm\(\{\.\.\.form,\s*bankId:e\.target\.value\}\s*style=/g, 
  'onChange={e=>setForm({...form, bankId:e.target.value})} style=');

code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,deductionBank:e\.target\.value\}\s*style=/g, 
  'onChange={e=>setForm(p=>({...p, deductionBank:e.target.value}))} style=');

code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,connectedBank:e\.target\.value\}\s*style=/g, 
  'onChange={e=>setForm(p=>({...p, connectedBank:e.target.value}))} style=');

// Since we know the previous replacement might have messed up due to `}`, let's just do a blanket fix for any `onChange={e=>setForm(...} style=`
code = code.replace(/onChange=\{([^}]+?e\.target\.value\s*)\}\s*style=/g, (match, inner) => {
  if (inner.includes('...form') && !inner.includes(')')) return `onChange={${inner}})} style=`;
  if (inner.includes('...p') && !inner.includes('))')) return `onChange={${inner}))} style=`;
  return match;
});

// Let's just fix it manually for the exact ones
code = code.replace(/onChange=\{e=>setForm\(\{\.\.\.form, bankId:e\.target\.value\} style=/g, 'onChange={e=>setForm({...form, bankId:e.target.value})} style=');
code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,deductionBank:e\.target\.value\} style=/g, 'onChange={e=>setForm(p=>({...p, deductionBank:e.target.value}))} style=');
code = code.replace(/onChange=\{e=>setForm\(p=>\(\{\.\.\.p,connectedBank:e\.target\.value\} style=/g, 'onChange={e=>setForm(p=>({...p, connectedBank:e.target.value}))} style=');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed syntax.');
