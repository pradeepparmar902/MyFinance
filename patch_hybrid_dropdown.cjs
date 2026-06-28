const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

const targetMemoStart = `const pastCombos = useMemo(() => {`;
const targetMemoEnd = `}, [pastExpenses]);`;

const startIndex = code.indexOf(targetMemoStart);
const endIndex = code.indexOf(targetMemoEnd) + targetMemoEnd.length;

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find useMemo block");
  process.exit(1);
}

const newMemo = `const pastCombos = useMemo(() => {
    const combos = new Map();

    // 1. Pull from Company Master
    (companyMaster || []).forEach(comp => {
       (comp.products || []).forEach(prod => {
          const key = \`\${prod}|\${comp.category || ""}|\${comp.name}||\`.toLowerCase();
          if (!combos.has(key)) {
             combos.set(key, {
                label: [prod, comp.name, comp.category].filter(Boolean).join("  ·  "),
                data: { productName: prod, category: comp.category, companyName: comp.name, platformName: "", storeName: "" }
             });
          }
       });
    });

    // 2. Pull from Category Master
    (categoryMaster || []).forEach(cat => {
       (cat.products || []).forEach(prod => {
          const key = \`\${prod}|\${cat.name}|||\`.toLowerCase();
          if (!combos.has(key)) {
             combos.set(key, {
                label: [prod, cat.name].filter(Boolean).join("  ·  "),
                data: { productName: prod, category: cat.name, companyName: "", platformName: "", storeName: "" }
             });
          }
       });
    });

    // 3. Pull from Past Expenses (Overwrites with more specific location data)
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
            label: labelParts.join("  ·  "),
            data: { productName: e.productName, category: cat || "Shopping", companyName: brand, platformName: plat, storeName: store }
          });
        }
      }
    });
    return Array.from(combos.values());
  }, [pastExpenses, companyMaster, categoryMaster]);`;

code = code.substring(0, startIndex) + newMemo + code.substring(endIndex);

// Update label to reflect master data
code = code.replace(
  '? QUICK AUTO-FILL FROM PAST EXPENSES',
  '? QUICK AUTO-FILL (PAST EXPENSES & MASTER DATA)'
);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully applied hybrid Quick Select logic.');
