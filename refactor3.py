import re

with open("src/FinPilotAI.jsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Inject dueSubs and state into ExpenseViewLive
expense_view_start = code.find("function ExpenseViewLive({")
state_insert_pos = code.find("const [payingEmi, setPayingEmi] = useState(null);", expense_view_start) + len("const [payingEmi, setPayingEmi] = useState(null);")

states_and_funcs = """
  const [payingSub, setPayingSub] = useState(null);
  const dueSubs = subscriptions ? getDueSubscriptions(subscriptions) : [];

  const handlePaySubConfirm = () => {
    if (!payingSub) return;
    const { sub, date, amount } = payingSub;
    const amt = parseFloat(amount);
    if (amt < 0) {
      alert("Amount cannot be negative.");
      return;
    }
    const exp = {
      id: "e" + Date.now(),
      date: date,
      cat: sub.category || "Subscription",
      icon: sub.icon || "💳",
      color: sub.color || COLORS.primary,
      amount: amt,
      vendor: sub.name,
      notes: "Subscription: " + sub.name + " (" + sub.dueDate + ")"
    };
    setExpenses(prev => [exp, ...prev]);
    setSubscriptions(prev => prev.map(s => {
      if (s.id !== sub.subId) return s;
      return { ...s, payments: [...(s.payments || []), { date: sub.dueDate, amount: amt, expenseId: exp.id }] };
    }));
    setPayingSub(null);
  };
"""
code = code[:state_insert_pos] + states_and_funcs + code[state_insert_pos:]

# 2. Inject UI into Due section
old_due_check = "{dueEMIs.length > 0 && ("
new_due_check = "{(dueEMIs.length > 0 || dueSubs.length > 0) && ("
code = code.replace(old_due_check, new_due_check)

old_due_title = "⚠️ Due EMIs ({dueEMIs.length})"
new_due_title = "⚠️ Due Payments ({dueEMIs.length + dueSubs.length})"
code = code.replace(old_due_title, new_due_title)

# Render dueSubs right after dueEMIs loop
due_emi_end = code.find("            {dueEMIs.map(emi => (")
due_emi_end = code.find("            ))} ", due_emi_end) # Wait, it ends with ))} usually

# Let's use string replacement to inject after dueEMIs.map
old_due_emi_map = """            {dueEMIs.map(emi => ("""

# I will replace the entire dueEMIs block down to its closing tag safely using regex or index.
# Better to find `            ))} \n          </div>\n        </div>`
# Wait! Let's read the current ExpenseViewLive return statement to be exact.
