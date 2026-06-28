const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

const targetMemoStart = `const pastCombos = useMemo(() => {`;
const targetMemoEnd = `}, [pastExpenses, companyMaster, categoryMaster]);`;

const startIndex = code.indexOf(targetMemoStart);
const endIndex = code.indexOf(targetMemoEnd) + targetMemoEnd.length;

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find useMemo block");
  process.exit(1);
}

const newMemo = `const pastCombos = useMemo(() => {
    const combos = new Map();

    const addCombo = (prod, cat, brand, plat, store) => {
        if (!prod) return;
        const key = \`\${prod}|\${cat}|\${brand}|\${plat}|\${store}\`.toLowerCase();
        if (!combos.has(key)) {
            const labelParts = [prod, brand, cat, store, plat].filter(Boolean);
            combos.set(key, {
                label: labelParts.join("  ·  "),
                data: { productName: prod, category: cat || "Shopping", companyName: brand, platformName: plat, storeName: store }
            });
        }
    };

    // 1. Synthesize fully connected chains from Master Data
    (companyMaster || []).forEach(comp => {
       (comp.products || []).forEach(prod => {
          // Find platforms that carry this brand
          const platforms = (platformMaster || []).filter(p => (p.brands || []).some(b => b.toLowerCase() === comp.name.toLowerCase()));
          
          if (platforms.length > 0) {
              platforms.forEach(plat => {
                  // Find stores on this platform
                  const stores = (vendorMaster || []).filter(v => v.platform?.toLowerCase() === plat.name.toLowerCase());
                  if (stores.length > 0) {
                      stores.forEach(store => addCombo(prod, comp.category, comp.name, plat.name, store.name));
                  } else {
                      addCombo(prod, comp.category, comp.name, plat.name, "");
                  }
              });
          } else {
              // No platform for this brand, just add the product & brand combo
              addCombo(prod, comp.category, comp.name, "", "");
          }
       });
    });

    // 2. Pull from Category Master (for products without a brand yet)
    (categoryMaster || []).forEach(cat => {
       (cat.products || []).forEach(prod => {
          addCombo(prod, cat.name, "", "", "");
       });
    });

    // 3. Pull from Past Expenses (Ensures actual manual combinations are captured too)
    (pastExpenses || []).forEach(e => {
      addCombo(e.productName, e.cat || e.category || "", e.companyName || "", e.platformName || "", e.storeName || e.vendor || "");
    });

    return Array.from(combos.values());
  }, [pastExpenses, companyMaster, categoryMaster, platformMaster, vendorMaster]);`;

code = code.substring(0, startIndex) + newMemo + code.substring(endIndex);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully applied full chain Quick Select logic.');
