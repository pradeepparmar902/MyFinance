# Refactor Subs
import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update routing
old_routing = """      case "subscriptions":return <SubscriptionsView />;"""
new_routing = """      case "subscriptions":return <SubscriptionsView subscriptions={subscriptions} setSubscriptions={setSubscriptions} categoryMaster={categoryMaster} />;"""
code = code.replace(old_routing, new_routing)

old_exp_route = """      case "expenses":     return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} categoryMaster={categoryMaster} vendorMaster={vendorMaster} setCategoryMaster={setCategoryMaster} setVendorMaster={setVendorMaster} assets={assets} setAssets={setAssets} />;"""
new_exp_route = """      case "expenses":     return <ExpenseViewLive expenses={expenses} setExpenses={setExpenses} categoryMaster={categoryMaster} vendorMaster={vendorMaster} setCategoryMaster={setCategoryMaster} setVendorMaster={setVendorMaster} assets={assets} setAssets={setAssets} subscriptions={subscriptions} setSubscriptions={setSubscriptions} />;"""
code = code.replace(old_exp_route, new_exp_route)

# 2. Update SubscriptionsView signature
old_sub_sig = """function SubscriptionsView() {"""
new_sub_sig = """function SubscriptionsView({ subscriptions, setSubscriptions, categoryMaster }) {"""
code = code.replace(old_sub_sig, new_sub_sig)

# 3. Update ExpenseViewLive signature
old_exp_sig = """function ExpenseViewLive({ expenses, setExpenses, filter, categoryMaster = [], vendorMaster = [], setCategoryMaster, setVendorMaster, assets = [], setAssets }) {"""
new_exp_sig = """function ExpenseViewLive({ expenses, setExpenses, filter, categoryMaster = [], vendorMaster = [], setCategoryMaster, setVendorMaster, assets = [], setAssets, subscriptions = [], setSubscriptions }) {"""
code = code.replace(old_exp_sig, new_exp_sig)

with open("src/FinPilotAI.jsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Done")
