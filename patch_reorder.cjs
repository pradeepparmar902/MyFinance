const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// Replace the specific block from "Quick Select" down to "Date + Amount side by side"
const searchBlockStart = `{/* Quick Select */}`;
const searchBlockEnd = `{/* Date + Amount side by side */}`;
const startIndex = code.indexOf(searchBlockStart);
const endIndex = code.indexOf(searchBlockEnd);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find the block");
  process.exit(1);
}

const newBlock = `{/* Quick Select */}
            <div style={{ background: "rgba(108,99,255,0.08)", border: \`1px solid \${COLORS.primary}44\`, borderRadius: 12, padding: "12px 14px", marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: COLORS.primary, display: "block", marginBottom: 5, fontWeight: 700 }}>? QUICK AUTO-FILL FROM PAST EXPENSES</label>
              <input 
                list="quick-select-list" 
                placeholder="Search past products (e.g. Milk, TV...)" 
                value={quickSelectText} 
                onChange={handleQuickSelect} 
                style={{ ...iStyle, borderColor: \`\${COLORS.primary}88\`, background: "rgba(0,0,0,0.2)" }} 
              />
              <datalist id="quick-select-list">
                {pastCombos.map((c, i) => <option key={i} value={c.label} />)}
              </datalist>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>Selecting an item will instantly fill the Product, Brand, Category, Platform, and Store fields below.</div>
            </div>

            {/* Receipt Upload */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>UPLOAD BILL / RECEIPT (optional)</label>
              {receiptPreview ? (
                <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: \`1px solid \${COLORS.border}\` }}>
                  <img src={receiptPreview} alt="receipt" style={{ width: "100%", maxHeight: 130, objectFit: "cover", display: "block" }} />
                  <button onClick={() => { setReceiptPreview(null); setReceiptFile(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 13 }}>?</button>
                  <div style={{ padding: "5px 10px", fontSize: 10.5, color: COLORS.textMuted, background: "rgba(0,0,0,0.5)" }}>{receiptFile?.name}</div>
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 12, border: \`2px dashed rgba(108,99,255,0.25)\`, borderRadius: 10, padding: "13px 14px", cursor: "pointer", background: "rgba(108,99,255,0.04)" }}>
                  <span style={{ fontSize: 22 }}>??</span>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.primary, fontWeight: 500 }}>Upload bill, receipt or invoice</div>
                    <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>JPG, PNG, PDF · Max 10MB</div>
                  </div>
                  <input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} style={{ display: "none" }} />
                </label>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PRODUCT / ITEM NAME</label>
              <input placeholder="e.g. Samsung TV, Grocery items, Petrol..." list="products-list-add" value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} style={iStyle} />
              <datalist id="products-list-add">
                {availableProducts.map((p, i) => <option key={i} value={p} />)}
              </datalist>
            </div>

            {/* Company / Brand */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>COMPANY / BRAND</label>
              <input placeholder="e.g. Nike, Apple, Sony..." list="company-list-add" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} style={iStyle} />
              <datalist id="company-list-add">
                {filteredCompanies.map((c, i) => <option key={i} value={c.name} />)}
              </datalist>
            </div>

            {/* Store / Buyer Name */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>STORE / SELLER NAME *</label>
              <input placeholder="e.g. Amazon, Big Bazaar, Pharmacy..." list="vendors-list-add" value={form.storeName} onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))} style={iStyle} />
              <datalist id="vendors-list-add">
                {filteredVendors.map((v, i) => <option key={i} value={v.name} />)}
              </datalist>
            </div>

            {/* Platform / Mall */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PLATFORM / MALL / LOCATION</label>
              <input placeholder="e.g. Phoenix Mall, Amazon.in..." list="platform-list-add" value={form.platformName} onChange={e => setForm(p => ({ ...p, platformName: e.target.value }))} style={iStyle} />
              <datalist id="platform-list-add">
                {platformMaster?.map((p, i) => <option key={i} value={p.name} />)}
              </datalist>
            </div>

            `;

code = code.substring(0, startIndex) + newBlock + code.substring(endIndex);
fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully reordered fields and fixed Quick Select visibility.');
