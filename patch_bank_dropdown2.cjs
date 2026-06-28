const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

const targetStart = `{["UPI", "Debit Card", "Net Banking"].includes(form.paymentMode) && (`;
const targetEndString = `{/* Description */}`;

const startIndex = code.indexOf(targetStart);
const endIndex = code.indexOf(targetEndString, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find block to replace.");
  process.exit(1);
}

const replacement = `{form.paymentMode !== 'Cash' && form.paymentMode !== 'EMI' && (
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 5 }}>SELECT PAYMENT ACCOUNT</label>
                <select 
                  value={form.bankId || form.creditCardId || ""} 
                  onChange={e => {
                    const val = e.target.value;
                    const isCC = creditCards.some(c => c.id === val);
                    setForm(p => ({ ...p, bankId: isCC ? "" : val, creditCardId: isCC ? val : "" }));
                  }} 
                  style={iStyle}
                >
                   <option value="">No Account selected</option>
                   <optgroup label="Bank Accounts">
                     {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                   </optgroup>
                   <optgroup label="Credit Cards">
                     {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </optgroup>
                </select>
              </div>
            )}
            `;

code = code.substring(0, startIndex) + replacement + code.substring(endIndex);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully updated bank account dropdown.');
