const fs = require('fs');
let code = fs.readFileSync('src/routes/admin/menu.tsx', 'utf8');

const pollBlock = `
  useEffect(() => {
    const poll = setInterval(() => {
      // Don't overwrite if typing in progress
      if (!editingId && document.visibilityState === 'visible') {
        fetchMenuItems();
      }
    }, 15000);
    return () => clearInterval(poll);
  }, [editingId]);
`;

code = code.replace(/(const fetchMenuItems = async \(\) => \{[\s\S]*?\};\n\n  useEffect\(\(\) => \{\n    fetchMenuItems\(\);\n  \}, \[\]\);)/, "$1" + pollBlock);

fs.writeFileSync('src/routes/admin/menu.tsx', code);
