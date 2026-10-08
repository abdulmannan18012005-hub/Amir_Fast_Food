const fs = require('fs');
let code = fs.readFileSync('ARCHITECTURE.md', 'utf8');

code = code.replace(/Client Interaction \(3D Menu\)/g, "Client Interaction");
code = code.replace(/Client Delivery Simulator/g, "Client Order Tracker");
code = code.replace(/│   │   ├── 3d\/               # Three.js Canvas & Burger Model Components\n/g, "");
code = code.replace(/│   │   ├── menu\/             # 3D Tilt Cards & Filter Bars/g, "│   │   ├── menu/             # Menu Cards & Filter Bars");
code = code.replace(/│   │   ├── index\.tsx         # Landing Page with 3D Hero/g, "│   │   ├── index.tsx         # Landing Page");
code = code.replace(/│   │   └── chat\.ts           # AmirBot pgvector Semantic Search/g, "│   │   └── chat.ts           # AmirBot Logic");
code = code.replace(/│       └── globals\.css       # Tailwind Directives & 3D CSS Perspectives/g, "│       └── globals.css       # Tailwind Directives");
code = code.replace(/├── public\/                   # 3D GLTF Assets, Audio Chimes, Icons/g, "├── public/                   # Webmanifest, Audio Chimes, Icons");
code = code.replace(/PgVector Semantic Search:/, "Rule-based Agent:");

fs.writeFileSync('ARCHITECTURE.md', code);
