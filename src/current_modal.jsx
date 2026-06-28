function AddExpenseModal({ onClose, onSave, initialData, creditCards, banks , vendorMaster, setVendorMaster, categoryMaster, setCategoryMaster , companyMaster, setCompanyMaster, platformMaster, setPlatformMaster}) {
  const [step, setStep] = useState(1); // 1=details, 2=warranty
  const [showWarranty, setShowWarranty] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [form, setForm] = useState(() => {
    if (initialData) {
      return {
        ...initialData,
        storeName: initialData.storeName || initialData.vendor || initialData.title || "",
        category: initialData.category || initialData.cat || "Shopping",
        productName: initialData.productName || "",
        companyName: initialData.companyName || "",
        platformName: initialData.platformName || "",
        description: initialData.description || initialData.notes || "",
        paymentMode: initialData.paymentMode || "Net Banking",
        bankId: initialData.bankId || ""
      };
    }
    return {
      storeName: "", date: new Date().toISOString().split("T")[0], category: "Shopping",
      amount: "", productName: "", companyName: "", platformName: "", description: "", paymentMode: "UPI", hasWarranty: false, warrantyData: null,
      bankId: ""
    };
  });

  const iStyle = { background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", caretColor: "#6C63FF" };
  
  const filteredVendors = form.platformName
    ? (vendorMaster || []).filter(v => v.platform?.toLowerCase() === form.platformName.toLowerCase() || !v.platform)
    : (vendorMaster || []);
    
  let filteredCompanies = companyMaster || [];
  if (form.category) {
    filteredCompanies = filteredCompanies.filter(c => c.category?.toLowerCase() === form.category.toLowerCase() || !c.category);
  }
  if (form.platformName) {
    const plat = (platformMaster || []).find(p => p.name.toLowerCase() === form.platformName.toLowerCase());
    if (plat && plat.brands && plat.brands.length > 0) {
      filteredCompanies = filteredCompanies.filter(c => plat.brands.some(b => b.toLowerCase() === c.name.toLowerCase()));
    }
  }

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

  const cats = ["Food", "Grocery", "Fuel", "Medical", "Shopping", "Travel", "Entertainment", "Education", "Utilities", "Electronics", "Other"];
  const payModes = ["UPI", "Cash", "Credit Card", "Debit Card", "Net Banking", "EMI"];

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setReceiptPreview(ev.target.result); setReceiptFile(file); };
    reader.readAsDataURL(file);
  };

  
  const handleSave = () => {
    if (!form.storeName || !form.amount) return;

    if (setVendorMaster && form.storeName) {
      const vendorExists = vendorMaster.some(v => v.name.toLowerCase() === form.storeName.toLowerCase());
      if (!vendorExists) {
        setVendorMaster(prev => [...prev, { name: form.storeName, category: form.category || "Other", platform: form.platformName || "" }]);
      } else if (form.category || form.platformName) {
        setVendorMaster(prev => prev.map(v => v.name.toLowerCase() === form.storeName.toLowerCase() ? { ...v, category: form.category || v.category, platform: form.platformName || v.platform } : v));
      }
    }

    if (setCategoryMaster && form.category) {
      const catExists = categoryMaster.find(c => c.name.toLowerCase() === form.category.toLowerCase());
      if (!catExists) {
        setCategoryMaster(prev => [...prev, { name: form.category, products: form.productName ? [form.productName] : [] }]);
      } else if (form.productName && (!catExists.products || !catExists.products.some(p => p.toLowerCase() === form.productName.toLowerCase()))) {
        setCategoryMaster(prev => prev.map(c => c.name.toLowerCase() === form.category.toLowerCase() ? { ...c, products: [...(c.products || []), form.productName] } : c));
      }
    }

    if (setCompanyMaster && form.companyName) {
      const compExists = companyMaster.find(c => c.name.toLowerCase() === form.companyName.toLowerCase());
      if (!compExists) {
        setCompanyMaster(prev => [...prev, { name: form.companyName, category: form.category || "", products: form.productName ? [form.productName] : [] }]);
      } else if (form.productName && (!compExists.products || !compExists.products.some(p => p.toLowerCase() === form.productName.toLowerCase()))) {
        setCompanyMaster(prev => prev.map(c => c.name.toLowerCase() === form.companyName.toLowerCase() ? { ...c, products: [...(c.products || []), form.productName] } : c));
      }
    }

    if (setPlatformMaster && form.platformName) {
      const platExists = platformMaster.find(p => p.name.toLowerCase() === form.platformName.toLowerCase());
      if (!platExists) {
        setPlatformMaster(prev => [...prev, { name: form.platformName, brands: form.companyName ? [form.companyName] : [] }]);
      } else if (form.companyName && (!platExists.brands || !platExists.brands.some(b => b.toLowerCase() === form.companyName.toLowerCase()))) {
        setPlatformMaster(prev => prev.map(p => p.name.toLowerCase() === form.platformName.toLowerCase() ? { ...p, brands: [...(p.brands || []), form.companyName] } : p));
      }
    }

    const finalCardId = form.paymentMode === 'Credit Card' && !form.creditCardId && creditCards && creditCards.length > 0 ? creditCards[0].id : form.creditCardId;
    onSave({ ...form, amount: parseFloat(form.amount) || 0, creditCardId: finalCardId, receipt: receiptFile });
    onClose();
  };
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: "20px 20px 0 0", padding: "20px 18px 28px", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>➕ Add Expense</div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, width: 30, height: 30, color: COLORS.textMuted, cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Receipt Upload */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>UPLOAD BILL / RECEIPT (optional)</label>
              {receiptPreview ? (
                <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
                  <img src={receiptPreview} alt="receipt" style={{ width: "100%", maxHeight: 130, objectFit: "cover", display: "block" }} />
                  <button onClick={() => { setReceiptPreview(null); setReceiptFile(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 13 }}>✕</button>
                  <div style={{ padding: "5px 10px", fontSize: 10.5, color: COLORS.textMuted, background: "rgba(0,0,0,0.5)" }}>{receiptFile?.name}</div>
                </div>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 12, border: `2px dashed rgba(108,99,255,0.25)`, borderRadius: 10, padding: "13px 14px", cursor: "pointer", background: "rgba(108,99,255,0.04)" }}>
                  <span style={{ fontSize: 22 }}>🧾</span>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.primary, fontWeight: 500 }}>Upload bill, receipt or invoice</div>
                    <div style={{ fontSize: 10.5, color: COLORS.textMuted }}>JPG, PNG, PDF · Max 10MB</div>
                  </div>
                  <input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} style={{ display: "none" }} />
                </label>
              )}
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

            {/* Company / Brand */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>COMPANY / BRAND</label>
              <input placeholder="e.g. Nike, Apple, Sony..." list="company-list-add" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} style={iStyle} />
              <datalist id="company-list-add">
                {filteredCompanies.map((c, i) => <option key={i} value={c.name} />)}
              </datalist>
            </div>

            {/* Product Name */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PRODUCT / ITEM NAME</label>
              <input placeholder="e.g. Samsung TV, Grocery items, Petrol..." list="products-list-add" value={form.productName} onChange={e => setForm(p => ({ ...p, productName: e.target.value }))} style={iStyle} />
              <datalist id="products-list-add">
                {availableProducts.map((p, i) => <option key={i} value={p} />)}
              </datalist>
            </div>

            {/* Date + Amount side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>DATE *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={iStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>AMOUNT (₹) *</label>
                <input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={iStyle} />
              </div>
            </div>

            {/* Category */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>CATEGORY</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))} style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${form.category === c ? COLORS.primary : COLORS.border}`,
                    background: form.category === c ? `${COLORS.primary}22` : "transparent",
                    color: form.category === c ? COLORS.primary : COLORS.textMuted, transition: "all 0.15s"
                  }}>{c}</button>
                ))}
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PAYMENT MODE</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {payModes.map(m => (
                  <button key={m} onClick={() => setForm(p => ({ ...p, paymentMode: m }))} style={{
                    padding: "5px 11px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${form.paymentMode === m ? COLORS.secondary : COLORS.border}`,
                    background: form.paymentMode === m ? `${COLORS.secondary}20` : "transparent",
                    color: form.paymentMode === m ? COLORS.secondary : COLORS.textMuted, transition: "all 0.15s"
                  }}>{m}</button>
                ))}
              </div>
            </div>

                        
            {["UPI", "Debit Card", "Net Banking"].includes(form.paymentMode) && (
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 5 }}>SELECT BANK ACCOUNT</label>
                <select value={form.bankId||""} onChange={e=>setForm(p=>({...p,bankId:e.target.value}))} style={iStyle}>
                   <option value="">No Bank selected</option>
                   {banks.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            
            {form.paymentMode === 'Credit Card' && (
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', marginBottom: 5 }}>SELECT CREDIT CARD *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {creditCards.map(c => (
                    <button key={c.id} onClick={() => setForm(p => ({ ...p, creditCardId: c.id }))} style={{
                      padding: '5px 11px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                      border: `1px solid ${form.creditCardId === c.id ? COLORS.secondary : COLORS.border}`,
                      background: form.creditCardId === c.id ? `${COLORS.secondary}20` : 'transparent',
                      color: form.creditCardId === c.id ? COLORS.secondary : COLORS.textMuted, transition: 'all 0.15s'
                    }}>{c.name}</button>
                  ))}
                </div>
              </div>
            )}
            {/* Description */}
            <div>
              <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>NOTES / DESCRIPTION</label>
              <textarea placeholder="Additional details about this expense..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...iStyle, resize: "none" }} />
            </div>

            {/* Warranty Toggle */}
            <div style={{ background: form.hasWarranty ? "rgba(108,99,255,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${form.hasWarranty ? "rgba(108,99,255,0.3)" : COLORS.border}`, borderRadius: 12, padding: "12px 14px", transition: "all 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: COLORS.text, fontWeight: 500 }}>🛡️ Has Warranty / Guarantee?</div>
                  <div style={{ fontSize: 10.5, color: COLORS.textMuted, marginTop: 2 }}>Enable to save warranty card & period</div>
                </div>
                <button onClick={() => setForm(p => ({ ...p, hasWarranty: !p.hasWarranty }))} style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
                  background: form.hasWarranty ? COLORS.primary : "rgba(255,255,255,0.15)", transition: "background 0.2s"
                }}>
                  <div style={{ position: "absolute", top: 3, left: form.hasWarranty ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </button>
              </div>

              {form.hasWarranty && (
                <button onClick={() => setShowWarranty(true)} style={{
                  marginTop: 10, width: "100%", padding: "9px", borderRadius: 9, border: `1px dashed rgba(108,99,255,0.4)`,
                  background: "transparent", color: COLORS.primary, fontSize: 12, fontWeight: 600, cursor: "pointer"
                }}>
                  {form.warrantyData ? "✓ Warranty saved — Edit details" : "➕ Add warranty card & details"}
                </button>
              )}
              {form.warrantyData && (
                <div style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 11, color: COLORS.textMuted }}>
                  <span>📅 Expires: {form.warrantyData.expiryDate || "—"}</span>
                  <span>· {form.warrantyData.period} {form.warrantyData.unit}</span>
                  <span>· {form.warrantyData.type}</span>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button onClick={handleSave} disabled={!form.storeName || !form.amount} style={{
              width: "100%", padding: "13px", borderRadius: 12, border: "none",
              background: (!form.storeName || !form.amount) ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg, ${COLORS.primary}, #8B5CF6)`,
              color: (!form.storeName || !form.amount) ? COLORS.textMuted : "#fff",
              fontSize: 14, fontWeight: 700, cursor: (!form.storeName || !form.amount) ? "not-allowed" : "pointer",
              transition: "all 0.2s", marginTop: 4
            }}>Save Expense</button>
          </div>
        </div>
      </div>

      {/* Warranty Modal stacked on top */}
      {showWarranty && (
        <WarrantyModal
          productName={form.productName || form.storeName || "Product"}
          onClose={() => setShowWarranty(false)}
          onSave={(wData) => setForm(p => ({ ...p, warrantyData: wData }))}
        />
      )}
    </>
  );
}

// ─── Expense View ─────────────────────────────────────────────────────────────
