const fs = require('fs');
let code = fs.readFileSync('src/old_add_modal2.jsx', 'utf8');

// 1. Add Filter logic variables
const filtersLogic = `
  const filteredVendors = form.platformName
    ? (vendorMaster || []).filter(v => v.platform?.toLowerCase() === form.platformName.toLowerCase() || !v.platform)
    : (vendorMaster || []);
    
  const filteredCompanies = form.category
    ? (companyMaster || []).filter(c => c.category?.toLowerCase() === form.category.toLowerCase() || !c.category)
    : (companyMaster || []);

  let availableProducts = [];
  if (form.companyName) {
    const comp = (companyMaster || []).find(c => c.name.toLowerCase() === form.companyName.toLowerCase());
    if (comp && comp.products) availableProducts = [...comp.products];
  }
  if (availableProducts.length === 0 && form.category) {
    const cat = (categoryMaster || []).find(c => c.name.toLowerCase() === form.category.toLowerCase());
    if (cat && cat.products) availableProducts = [...availableProducts, ...cat.products];
  }
  availableProducts = Array.from(new Set(availableProducts));
`;
code = code.replace(
  'const cats = ["Food", "Grocery", "Fuel", "Medical", "Shopping", "Travel", "Entertainment", "Education", "Utilities", "Electronics", "Other"];',
  filtersLogic + '\n  const cats = ["Food", "Grocery", "Fuel", "Medical", "Shopping", "Travel", "Entertainment", "Education", "Utilities", "Electronics", "Other"];'
);

// 2. Update Dropdowns
// Store/Vendor
code = code.replace(
  '{vendorMaster?.map((v, i) => <option key={i} value={v.name} />)}',
  '{filteredVendors.map((v, i) => <option key={i} value={v.name} />)}'
);

// Company/Brand
code = code.replace(
  '{companyMaster?.map((c, i) => <option key={i} value={c.name} />)}',
  '{filteredCompanies.map((c, i) => <option key={i} value={c.name} />)}'
);

// Product Name -> add datalist
const productTarget = `<input placeholder="e.g. Samsung TV, Grocery items, Petrol..." value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} style={iStyle} />`;
const productReplace = `<input placeholder="e.g. Samsung TV, Grocery items, Petrol..." list="products-list-add" value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} style={iStyle} />
              <datalist id="products-list-add">
                {availableProducts.map((p, i) => <option key={i} value={p} />)}
              </datalist>`;
code = code.replace(productTarget, productReplace);


// 3. Update handleSave for Company learning
const handleSaveTarget = `    if (setCompanyMaster && form.companyName) {
      const compExists = companyMaster.some(c => c.name.toLowerCase() === form.companyName.toLowerCase());
      if (!compExists) setCompanyMaster(prev => [...prev, { name: form.companyName }]);
    }`;
const handleSaveReplace = `    if (setCompanyMaster && form.companyName) {
      const compExists = companyMaster.find(c => c.name.toLowerCase() === form.companyName.toLowerCase());
      if (!compExists) {
        setCompanyMaster(prev => [...prev, { name: form.companyName, category: form.category || "", products: form.productName ? [form.productName] : [] }]);
      } else if (form.productName && (!compExists.products || !compExists.products.some(p => p.toLowerCase() === form.productName.toLowerCase()))) {
        setCompanyMaster(prev => prev.map(c => c.name.toLowerCase() === form.companyName.toLowerCase() ? { ...c, products: [...(c.products || []), form.productName] } : c));
      }
    }`;
code = code.replace(handleSaveTarget, handleSaveReplace);

fs.writeFileSync('src/old_add_modal2_patched.jsx', code, 'utf8');
