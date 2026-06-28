function AdminSettingsViewLive({ computedNav, customNav, setCustomNav, vendorMaster = [], setVendorMaster, categoryMaster = [], setCategoryMaster, companyMaster = [], setCompanyMaster, platformMaster = [], setPlatformMaster }) {
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [activeTab, setActiveTab] = useState("navigation");
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: "", category: "", platform: "" });
  const [editingVendorIdx, setEditingVendorIdx] = useState(null);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", products: [] });
  const [editingCategoryIdx, setEditingCategoryIdx] = useState(null);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: "" });
  const [editingCompanyIdx, setEditingCompanyIdx] = useState(null);

  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [platformForm, setPlatformForm] = useState({ name: "" });
  const [editingPlatformIdx, setEditingPlatformIdx] = useState(null);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = collection(db, "users");
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(document => {
        list.push({ id: document.id, ...document.data() });
      });
      list.sort((a, b) => (b.lastUsed?.toMillis() || 0) - (a.lastUsed?.toMillis() || 0));
      setUsersList(list);
    } catch (err) {
      console.error("Error fetching users", err);
    }
    setLoadingUsers(false);
  };

  const handleToggleBlock = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? "unblock" : "block"} this user?`)) return;
    try {
      const uRef = doc(db, "users", userId);
      await updateDoc(uRef, { isBlocked: !currentStatus });
      setUsersList(usersList.map(u => u.id === userId ? { ...u, isBlocked: !currentStatus } : u));
    } catch(err) {
      alert("Failed to update user status: " + err.message);
    }
  };

  const handleDragStart = (e, id) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const currentFullOrder = computedNav.map(item => {
      const existing = customNav.find(c => c.id === item.id);
      return existing ? existing : { ...item };
    });

    const draggedIndex = currentFullOrder.findIndex(c => c.id === draggedItemId);
    const targetIndex = currentFullOrder.findIndex(c => c.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newOrder = [...currentFullOrder];
    const [movedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, movedItem);
    
    setCustomNav(newOrder);
    setDraggedItemId(null);
  };

  const handleUpdate = (id, field, value) => {
    setCustomNav(computedNav.map(item => 
      item.id === id ? { ...item, [field]: value } : { ...item }
    ));
  };

  const handleAddDivider = () => {
    const dividerId = `divider-${Date.now()}`;
    setCustomNav([...computedNav, { id: dividerId, isDivider: true, label: "" }]);
  };

  const handleDeleteDivider = (id) => {
    setCustomNav(computedNav.filter(item => item.id !== id));
  };

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset all navigation settings to default?")) {
      setCustomNav([]);
    }
  }

  // Master Data Handlers
  const handleDeleteVendor = (idx) => {
    if(window.confirm("Delete this vendor?")) {
      const newV = [...vendorMaster];
      newV.splice(idx, 1);
      setVendorMaster(newV);
    }
  };
  const handleDeleteCategory = (idx) => {
    if(window.confirm("Delete this category completely?")) {
      const newC = [...categoryMaster];
      newC.splice(idx, 1);
      setCategoryMaster(newC);
    }
  };

  const handleAddVendor = () => {
    setEditingVendorIdx(null);
    setVendorForm({ name: "", category: "", platform: "" });
    setShowVendorModal(true);
  };

  const handleEditVendor = (idx) => {
    setEditingVendorIdx(idx);
    setVendorForm(vendorMaster[idx]);
    setShowVendorModal(true);
  };

  const handleSaveVendor = () => {
    if(!vendorForm.name) return;
    const isNewCategory = vendorForm.category && !categoryMaster.some(c => c.name.toLowerCase() === vendorForm.category.toLowerCase());
    const isNewPlatform = vendorForm.platform && !platformMaster.some(p => p.name.toLowerCase() === vendorForm.platform.toLowerCase());
    
    if(editingVendorIdx !== null) {
      const newV = [...vendorMaster];
      newV[editingVendorIdx] = vendorForm;
      setVendorMaster(newV);
    } else {
      if(vendorMaster.some(v => v.name.toLowerCase() === vendorForm.name.toLowerCase())) {
        alert("Vendor already exists!");
        return;
      }
      setVendorMaster([...vendorMaster, vendorForm]);
    }

    if (isNewCategory && setCategoryMaster) {
      setCategoryMaster([...categoryMaster, { name: vendorForm.category, products: [] }]);
    }
    if (isNewPlatform && setPlatformMaster) {
      setPlatformMaster([...platformMaster, { name: vendorForm.platform }]);
    }

    setShowVendorModal(false);
  };

  const handleAddCategory = () => {
    setEditingCategoryIdx(null);
    setCategoryForm({ name: "", products: [] });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (idx) => {
    setEditingCategoryIdx(idx);
    setCategoryForm(categoryMaster[idx]);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if(!categoryForm.name) return;
    if(editingCategoryIdx !== null) {
      const newC = [...categoryMaster];
      newC[editingCategoryIdx] = categoryForm;
      setCategoryMaster(newC);
    } else {
      if(categoryMaster.some(c => c.name.toLowerCase() === categoryForm.name.toLowerCase())) {
        alert("Category already exists!");
        return;
      }
      setCategoryMaster([...categoryMaster, { name: categoryForm.name, products: categoryForm.products || [] }]);
    }
    setShowCategoryModal(false);
  };

  const handleDeleteCompany = (idx) => {
    if(window.confirm("Delete this company/brand?")) {
      const newC = [...companyMaster];
      newC.splice(idx, 1);
      setCompanyMaster(newC);
    }
  };
  const handleAddCompany = () => { setEditingCompanyIdx(null); setCompanyForm({ name: "" }); setShowCompanyModal(true); };
  const handleEditCompany = (idx) => { setEditingCompanyIdx(idx); setCompanyForm(companyMaster[idx]); setShowCompanyModal(true); };
  const handleSaveCompany = () => {
    if(!companyForm.name) return;
    if(editingCompanyIdx !== null) { const newC = [...companyMaster]; newC[editingCompanyIdx] = companyForm; setCompanyMaster(newC); }
    else {
      if(companyMaster.some(c => c.name.toLowerCase() === companyForm.name.toLowerCase())) { alert("Company already exists!"); return; }
      setCompanyMaster([...companyMaster, { name: companyForm.name }]);
    }
    setShowCompanyModal(false);
  };

  const handleDeletePlatform = (idx) => {
    if(window.confirm("Delete this platform/location?")) {
      const newP = [...platformMaster];
      newP.splice(idx, 1);
      setPlatformMaster(newP);
    }
  };
  const handleAddPlatform = () => { setEditingPlatformIdx(null); setPlatformForm({ name: "" }); setShowPlatformModal(true); };
  const handleEditPlatform = (idx) => { setEditingPlatformIdx(idx); setPlatformForm(platformMaster[idx]); setShowPlatformModal(true); };
  const handleSavePlatform = () => {
    if(!platformForm.name) return;
    if(editingPlatformIdx !== null) { const newP = [...platformMaster]; newP[editingPlatformIdx] = platformForm; setPlatformMaster(newP); }
    else {
      if(platformMaster.some(p => p.name.toLowerCase() === platformForm.name.toLowerCase())) { alert("Platform already exists!"); return; }
      setPlatformMaster([...platformMaster, { name: platformForm.name }]);
    }
    setShowPlatformModal(false);
  };


  return (
    <div style={{ background:COLORS.bgCard, borderRadius:20, padding:"24px", border:`1px solid rgba(255,255,255,0.05)`, maxWidth:1000, margin:"0 auto" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 20, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12 }}>
        <button 
          onClick={() => setActiveTab("navigation")} 
          style={{ background: "transparent", border: "none", color: activeTab === "navigation" ? COLORS.primary : COLORS.textMuted, fontSize: 16, fontWeight: 700, cursor: "pointer", borderBottom: activeTab === "navigation" ? `2px solid ${COLORS.primary}` : "2px solid transparent", paddingBottom: 4 }}
        >
          Navigation Settings
        </button>
        <button 
          onClick={() => setActiveTab("users")} 
          style={{ background: "transparent", border: "none", color: activeTab === "users" ? COLORS.primary : COLORS.textMuted, fontSize: 16, fontWeight: 700, cursor: "pointer", borderBottom: activeTab === "users" ? `2px solid ${COLORS.primary}` : "2px solid transparent", paddingBottom: 4 }}
        >
          Users & Access
        </button>
        <button 
          onClick={() => setActiveTab("masters")} 
          style={{ background: "transparent", border: "none", color: activeTab === "masters" ? COLORS.primary : COLORS.textMuted, fontSize: 16, fontWeight: 700, cursor: "pointer", borderBottom: activeTab === "masters" ? `2px solid ${COLORS.primary}` : "2px solid transparent", paddingBottom: 4 }}
        >
          Master Data
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "navigation" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>Customize Sidebar Navigation</div>
            <div style={{ fontSize:12, color:COLORS.textMuted }}>Drag to reorder. Toggle visibility or rename labels. Add dividers to group items.</div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {computedNav.map((item, i) => (
              <div 
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                style={{ 
                  display: "flex", alignItems: "center", gap: 16, 
                  background: draggedItemId === item.id ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)", 
                  border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ color: COLORS.textMuted, opacity: 0.5, cursor: "grab" }}>☰</div>
                
                {item.isDivider ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, width: 60 }}>DIVIDER</div>
                    <input 
                      type="text" 
                      value={item.label}
                      onChange={(e) => handleUpdate(item.id, "label", e.target.value)}
                      placeholder="(Optional text)"
                      style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "none", color: COLORS.textMuted, fontSize: 12, padding: "4px 8px", borderRadius: 4, outline: "none" }}
                    />
                  </div>
                ) : item.id !== "admin" ? (
                  <>
                    <div style={{ fontSize: 16, width: 24, textAlign: "center" }}>{item.icon}</div>
                    
                    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <input 
                        type="text" 
                        value={item.label}
                        onChange={(e) => handleUpdate(item.id, "label", e.target.value)}
                        placeholder={item.label}
                        style={{ background: "transparent", border: "none", color: COLORS.text, fontSize: 14, fontWeight: 600, padding: 0, outline: "none" }}
                      />
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>ID: {item.id}</div>
                    </div>
                    
                    <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={item.hidden !== true}
                        onChange={(e) => handleUpdate(item.id, "hidden", !e.target.checked)}
                        style={{ display: "none" }}
                      />
                      <div style={{ 
                        width: 44, height: 24, borderRadius: 12, 
                        background: item.hidden !== true ? COLORS.primary : COLORS.border,
                        position: "relative", transition: "all 0.2s"
                      }}>
                        <div style={{ 
                          width: 20, height: 20, borderRadius: "50%", background: "#fff",
                          position: "absolute", top: 2, left: item.hidden !== true ? 22 : 2,
                          transition: "all 0.2s"
                        }} />
                      </div>
                    </label>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16, opacity: 0.5 }}>
                    <div style={{ fontSize: 16, width: 24, textAlign: "center" }}>{item.icon}</div>
                    <div style={{ flex: 1, color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: COLORS.secondary }}>(Always Visible)</div>
                  </div>
                )}

                {item.isDivider && (
                  <button onClick={() => handleDeleteDivider(item.id)} style={{ background: "transparent", border: "none", color: COLORS.danger, cursor: "pointer", padding: "4px 8px" }}>Del</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button onClick={handleAddDivider} style={{ background: "rgba(255,255,255,0.05)", color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              + Add Divider
            </button>
            <button onClick={handleReset} style={{ background: "transparent", color: COLORS.danger, border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}>
              Reset to Defaults
            </button>
          </div>
        </div>
      ) : activeTab === "users" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>User Access Management</div>
            <div style={{ fontSize:12, color:COLORS.textMuted }}>View all authenticated users and revoke their access if needed.</div>
          </div>
          
          {loadingUsers ? (
            <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted }}>Loading users...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMuted }}>
                    <th style={{ padding: "12px 8px", fontWeight: 600 }}>User ID</th>
                    <th style={{ padding: "12px 8px", fontWeight: 600 }}>Email</th>
                    <th style={{ padding: "12px 8px", fontWeight: 600 }}>Last Active</th>
                    <th style={{ padding: "12px 8px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "12px 8px", fontWeight: 600, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length > 0 ? usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
                      <td style={{ padding: "12px 8px", color: COLORS.textMuted, fontFamily: "monospace" }}>{u.id.substring(0, 8)}...</td>
                      <td style={{ padding: "12px 8px", color: COLORS.text }}>{u.email || "-"}</td>
                      <td style={{ padding: "12px 8px", color: COLORS.textMuted }}>{u.lastUsed ? new Date(u.lastUsed.toMillis()).toLocaleString() : "Never"}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span style={{ padding: "4px 8px", borderRadius: 4, background: u.isBlocked ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)", color: u.isBlocked ? "#EF4444" : "#10B981" }}>
                          {u.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right" }}>
                        <button 
                          onClick={() => handleToggleBlock(u.id, !!u.isBlocked)}
                          style={{ background: u.isBlocked ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", color: u.isBlocked ? "#10B981" : "#EF4444", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                        >
                          {u.isBlocked ? "Unblock" : "Block"}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 30, color: COLORS.textMuted }}>No users found in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>Master Data Management</div>
            <div style={{ fontSize:12, color:COLORS.textMuted }}>Manage your global data catalogs so auto-fill works flawlessly across the app.</div>
          </div>
          
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize:14, color:COLORS.secondary, margin: 0 }}>Categories & Products</h3>
                <button onClick={handleAddCategory} style={{ background: "rgba(108, 99, 255, 0.1)", color: COLORS.primary, border: `1px solid rgba(108, 99, 255, 0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>+ Add Category</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {categoryMaster.map((c, i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <div style={{ fontWeight:700 }}>{c.name}</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => handleEditCategory(i)} style={{ background:"transparent", border:"none", color:COLORS.primary, cursor:"pointer", padding:0, fontSize:14 }} title="Edit Category">Edit</button>
                        <button onClick={() => handleDeleteCategory(i)} style={{ background:"transparent", border:"none", color:COLORS.danger, cursor:"pointer", padding:0, fontSize:14 }} title="Delete Category">Del</button>
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:COLORS.textMuted, display:"flex", flexWrap:"wrap", gap:4 }}>
                      {(c.products || []).map((p, j) => (
                        <span key={j} style={{ background:"rgba(255,255,255,0.1)", padding:"2px 6px", borderRadius:4 }}>{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize:14, color:COLORS.primary, margin: 0 }}>Vendors / Sellers</h3>
                <button onClick={handleAddVendor} style={{ background: "rgba(108, 99, 255, 0.1)", color: COLORS.primary, border: `1px solid rgba(108, 99, 255, 0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>+ Add Vendor</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {vendorMaster.map((v, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:12 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{v.name}</div>
                      <div style={{ fontSize:11, color:COLORS.textMuted }}>{v.category}{v.platform ? ` • ${v.platform}` : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleEditVendor(i)} style={{ background:"transparent", border:"none", color:COLORS.primary, cursor:"pointer", padding:0, fontSize:14 }} title="Edit Vendor">Edit</button>
                      <button onClick={() => handleDeleteVendor(i)} style={{ background:"transparent", border:"none", color:COLORS.danger, cursor:"pointer", padding:0, fontSize:14 }} title="Delete Vendor">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 24 }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize:14, color:COLORS.secondary, margin: 0 }}>Companies & Brands</h3>
                <button onClick={handleAddCompany} style={{ background: "rgba(108, 99, 255, 0.1)", color: COLORS.primary, border: `1px solid rgba(108, 99, 255, 0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>+ Add Brand</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {companyMaster.map((c, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:12 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleEditCompany(i)} style={{ background:"transparent", border:"none", color:COLORS.primary, cursor:"pointer", padding:0, fontSize:14 }}>Edit</button>
                      <button onClick={() => handleDeleteCompany(i)} style={{ background:"transparent", border:"none", color:COLORS.danger, cursor:"pointer", padding:0, fontSize:14 }}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize:14, color:COLORS.primary, margin: 0 }}>Platforms & Malls</h3>
                <button onClick={handleAddPlatform} style={{ background: "rgba(108, 99, 255, 0.1)", color: COLORS.primary, border: `1px solid rgba(108, 99, 255, 0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>+ Add Platform</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {platformMaster.map((p, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:12 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => handleEditPlatform(i)} style={{ background:"transparent", border:"none", color:COLORS.primary, cursor:"pointer", padding:0, fontSize:14 }}>Edit</button>
                      <button onClick={() => handleDeletePlatform(i)} style={{ background:"transparent", border:"none", color:COLORS.danger, cursor:"pointer", padding:0, fontSize:14 }}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showVendorModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>{editingVendorIdx !== null ? "Edit Vendor" : "Add Vendor"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>VENDOR NAME</label>
                <input autoFocus value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>DEFAULT CATEGORY</label>
                <input list="category-list-admin" value={vendorForm.category} onChange={e => setVendorForm({...vendorForm, category: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
                <datalist id="category-list-admin">
                  {categoryMaster.map((c, i) => <option key={i} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PLATFORM / LOCATION</label>
                <input list="platform-list-admin" value={vendorForm.platform || ""} onChange={e => setVendorForm({...vendorForm, platform: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
                <datalist id="platform-list-admin">
                  {platformMaster.map((p, i) => <option key={i} value={p.name} />)}
                </datalist>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowVendorModal(false)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveVendor} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Save Vendor</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>{editingCategoryIdx !== null ? "Edit Category" : "Add Category"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>CATEGORY NAME</label>
                <input autoFocus value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PRODUCTS (COMMA SEPARATED)</label>
                <input value={(categoryForm.products || []).join(", ")} onChange={e => setCategoryForm({...categoryForm, products: e.target.value.split(",").map(p => p.trim()).filter(p => p)})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} placeholder="e.g. Lunch, Dinner, Snacks" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveCategory} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Save Category</button>
            </div>
          </div>
        </div>
      )}

      {showCompanyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>{editingCompanyIdx !== null ? "Edit Brand" : "Add Brand"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>COMPANY / BRAND NAME</label>
                <input autoFocus value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowCompanyModal(false)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSaveCompany} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Save Brand</button>
            </div>
          </div>
        </div>
      )}

      {showPlatformModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d1526", border: `1px solid rgba(108,99,255,0.25)`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 400 }}>
            <h3 style={{ margin: "0 0 16px 0", color: COLORS.text }}>{editingPlatformIdx !== null ? "Edit Platform" : "Add Platform"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textMuted, display: "block", marginBottom: 5 }}>PLATFORM / MALL NAME</label>
                <input autoFocus value={platformForm.name} onChange={e => setPlatformForm({...platformForm, name: e.target.value})} style={{ background: "#1a2236", border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "9px 12px", color: COLORS.text, width: "100%", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowPlatformModal(false)} style={{ background: "transparent", color: COLORS.textMuted, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSavePlatform} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Save Platform</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


