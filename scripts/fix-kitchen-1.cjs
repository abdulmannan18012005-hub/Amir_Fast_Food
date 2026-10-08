const fs = require('fs');
let code = fs.readFileSync('src/routes/admin/kitchen.tsx', 'utf8');

// 1a
code = code.replace(/function KitchenKDSRoute\(\) \{[\s\S]*?return \([\s\S]*?<KitchenKDS \/>[\s\S]*?<\/PinGate>\n  \);\n\}/, 
`function KitchenKDSRoute() {
  return (
    <PinGate>
      <KitchenSoundGate>
        <KitchenKDS />
      </KitchenSoundGate>
    </PinGate>
  );
}

function KitchenSoundGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  if (!ready) {
    return (
      <button type="button" onClick={() => { initAudio(); setReady(true); }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white w-full">
        <span className="text-center">
          <Volume2 size={64} className="mx-auto mb-4 text-primary animate-pulse" aria-hidden="true" />
          <span className="block text-3xl font-black">Tap to enable kitchen sound</span>
        </span>
      </button>
    );
  }
  return <>{children}</>;
}`);

code = code.replace(/const \[audioInitialized, setAudioInitialized\] = useState\(false\);\n/, '');

// 1b import
if (!code.includes('getRawSession')) {
  code = code.replace(/import \{ safeJson \} from '\.\.\/\.\.\/lib\/storage';/, "import { safeJson, getRawSession } from '../../lib/storage';");
}

fs.writeFileSync('src/routes/admin/kitchen.tsx', code);
