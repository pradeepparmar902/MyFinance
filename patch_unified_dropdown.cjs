const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// 1. Pass pastExpenses into AddExpenseModal calls inside ExpenseViewLive and ExpenseView (just in case)
code = code.replace(
  /<AddExpenseModal banks=\{banks\} creditCards=\{creditCards\} vendorMaster=\{vendorMaster\} /g,
  '<AddExpenseModal pastExpenses={expenses} banks={banks} creditCards={creditCards} vendorMaster={vendorMaster} '
);

// 2. Add pastExpenses to AddExpenseModal props
code = code.replace(
  'function AddExpenseModal({ onClose, onSave, initialData, creditCards, banks , vendorMaster, setVendorMaster, categoryMaster, setCategoryMaster , companyMaster, setCompanyMaster, platformMaster, setPlatformMaster}) {',
  'function AddExpenseModal({ pastExpenses, onClose, onSave, initialData, creditCards, banks , vendorMaster, setVendorMaster, categoryMaster, setCategoryMaster , companyMaster, setCompanyMaster, platformMaster, setPlatformMaster}) {'
);

// 3. Compute pastCombos and handle quick selection
const targetUseState = `const [form, setForm] = useState(() => {`;
const insertLogic = `  const [quickSelectText, setQuickSelectText] = useState("");
  const pastCombos = React.useMemo(() => {
    const combos = new Map();
    (pastExpenses || []).forEach(e => {
      if (e.productName) {
        const cat = e.cat || e.category || "";
        const brand = e.companyName || "";
        const plat = e.platformName || "";
        const store = e.storeName || e.vendor || "";
        const key = \`\${e.productName}|\${cat}|\${brand}|\${plat}|\${store}\`.toLowerCase();
        if (!combos.has(key)) {
          const labelParts = [e.productName];
          if (brand) labelParts.push(brand);
          if (cat) labelParts.push(cat);
          if (plat) labelParts.push(plat);
          if (store) labelParts.push(store);
          combos.set(key, {
            label: labelParts.join("  "),
            data: { productName: e.productName, category: cat || "Shopping", companyName: brand, platformName: plat, storeName: store }
          });
        }
      }
    });
    return Array.from(combos.values());
  }, [pastExpenses]);

  const handleQuickSelect = (e) => {
    const val = e.target.value;
    setQuickSelectText(val);
    const match = pastCombos.find(c => c.label === val);
    if (match) {
      setForm(p => ({
        ...p,
        productName: match.data.productName,
        category: match.data.category,
        companyName: match.data.companyName,
        platformName: match.data.platformName,
        storeName: match.data.storeName || p.storeName
      }));
      setQuickSelectText(""); // clear after selection so it doesnt clutter
    }
  };

  const [form, setForm] = useState(() => {`;

code = code.replace(targetUseState, insertLogic);

// 4. Add UI for Quick Select
const uiTarget = `{/* Receipt Upload */}`;
const uiInsert = `{/* Quick Select */}
            {pastCombos.length > 0 && (
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
            )}

            {/* Receipt Upload */}`;

code = code.replace(uiTarget, uiInsert);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Unified Dropdown patched successfully.');
