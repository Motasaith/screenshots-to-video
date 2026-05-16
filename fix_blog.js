const fs = require('fs');
let c = fs.readFileSync('src/data/blog.ts', 'utf8');
c = c.replace(/`/g, '\\`');
c = c.replace(/content:\s*\\\\`/g, 'content: `');
c = c.replace(/\\\\`\r?\n\s*\}/g, '`\n}');
c = c.replace(/\\\\`\r?\n\s*\},/g, '`\n  },');
// Also we need to fix ${ because in template literal it tries to interpolate!
c = c.replace(/\$\{/g, '\\${');
fs.writeFileSync('src/data/blog.ts', c);
