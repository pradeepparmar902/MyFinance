const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.split('onChange={e=>f.set(+e.target.value}))} style={iStyle}/>').join('onChange={e=>f.set(+e.target.value)} style={iStyle}/>');
code = code.split('onChange={e=>f.set(+e.target.value)))} style={iStyle}/>').join('onChange={e=>f.set(+e.target.value)} style={iStyle}/>');

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed f.set literally.');
