const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Regex to find all bank dropdowns that need optgroup
// Look for selects that map over banks but might not have credit cards or optgroups
const regex = /<select [^>]*value=\{form\.(?:bankId|deductionBank|connectedBank)\|\|""\}[^>]*>[\s\S]*?<\/select>/g;

code = code.replace(regex, (match) => {
  // Extract the onChange, value, and style from the original to keep it roughly intact but we'll override style
  const valueMatch = match.match(/value=\{([^\}]+)\}/);
  const onChangeMatch = match.match(/onChange=\{([^\}]+)\}/);
  
  if (!valueMatch || !onChangeMatch) return match;
  
  const valAttr = valueMatch[1];
  const changeAttr = onChangeMatch[1];
  
  // We want to force optgroup
  return `<select value={${valAttr}} onChange={${changeAttr}} style={{ background: "rgba(0,0,0,0.2)", border: \`1px solid \${COLORS.border}\`, padding: "10px 14px", color: COLORS.text, fontSize: 13, borderRadius: 12, width: "100%", outline: "none" }}>
                  <option value="">— Select Account —</option>
                  <optgroup label="Bank Accounts">
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>`;
});

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully patched all bank dropdowns.');
