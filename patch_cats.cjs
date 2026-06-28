const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

// 1. Replace hardcoded cats with dynamicCats
const oldCats = `const cats = ["Food", "Grocery", "Fuel", "Medical", "Shopping", "Travel", "Entertainment", "Education", "Utilities", "Electronics", "Other"];`;
const newCats = `const cats = Array.from(new Set([
    "Food", "Grocery", "Fuel", "Medical", "Shopping", "Travel", "Entertainment", "Education", "Utilities", "Electronics", "Other",
    ...(categoryMaster || []).map(c => c.name),
    form.category
  ])).filter(Boolean);`;

code = code.replace(oldCats, newCats);

// 2. Remove the emoji and replace with [LOCKED]
code = code.replace(
  '?? Locked by Quick-Select',
  'LOCKED BY QUICK-SELECT'
);
// And also check for the quick auto fill emoji which was ? (might also render as ??)
code = code.replace(
  '? QUICK AUTO-FILL (PAST EXPENSES & MASTER DATA)',
  '? QUICK AUTO-FILL (PAST EXPENSES & MASTER DATA)'
);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Successfully patched dynamic categories and removed emojis.');
