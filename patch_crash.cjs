const fs = require('fs');
let code = fs.readFileSync('src/FinPilotAI.jsx', 'utf8');

code = code.replace(
  'import { useState, useEffect, useRef, Fragment, Component } from "react";',
  'import { useState, useEffect, useRef, Fragment, Component, useMemo } from "react";'
);

code = code.replace(
  'const pastCombos = React.useMemo(() => {',
  'const pastCombos = useMemo(() => {'
);

fs.writeFileSync('src/FinPilotAI.jsx', code, 'utf8');
console.log('Fixed React.useMemo crash');
