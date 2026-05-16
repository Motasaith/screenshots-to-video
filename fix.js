const fs = require('fs'); let c = fs.readFileSync('src/data/blog.ts', 'utf8'); c = c.replace(/content:\s*\\\/g, 'content: \'); fs.writeFileSync('src/data/blog.ts', c);
