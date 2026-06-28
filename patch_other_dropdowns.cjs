const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Patch Subscriptions
const subStart = `                <select value={form.bankId||""} onChange={e=>setForm({...form, bankId:e.target.value})} style={{ background: "#1a2236", border: \`1px solid \${COLORS.border}\`, padding: "9px 12px", color: COLORS.text, fontSize: 13, borderRadius: 9, width: "100%", outline: "none" }}>`;
const subOldOptions = `                  <option value="">Select Bank Account</option>
                  {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>`;
const subNewOptions = `                  <option value="">— Select Account —</option>
                  <optgroup label="Bank Accounts">
                    {(banks||[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                  <optgroup label="Credit Cards">
                    {(creditCards||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>`;
code = code.replace(subStart + '\n' + subOldOptions, subStart + '\n' + subNewOptions);


// Patch EMI
const emiStart = `                  <select value={form.deductionBank||""} onChange={e=>setForm(p=>({...p,deductionBank:e.target.value}))} style={{ background:"#0d1526", border:\`1px solid \${COLORS.border}\`, borderRadius:8, padding:"9px 12px", color:COLORS.text, fontSize:13, outline:"none" }}>`;
const emiOldOptions = `                    <option value="">— Select Account —</option>
                    {(banks||[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                    {(creditCards||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>`;
const emiNewOptions = `                    <option value="">— Select Account —</option>
                    <optgroup label="Bank Accounts">
                      {(banks||[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                    </optgroup>
                    <optgroup label="Credit Cards">
                      {(creditCards||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  </select>`;
code = code.replace(emiStart + '\n' + emiOldOptions, emiStart + '\n' + emiNewOptions);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully patched Subscriptions and EMI dropdowns.');
