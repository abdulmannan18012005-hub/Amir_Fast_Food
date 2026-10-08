const fs = require('fs');
let code = fs.readFileSync('src/routes/admin/kitchen.tsx', 'utf8');

// 1a: KitchenKDSRoute
code = code.replace(/function KitchenKDSRoute\(\) \{[\s\S]*?<PinGate[\s\S]*?<\/PinGate>\n  \);\n\}/, 
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

// connState
code = code.replace(/const \[connState, setConnState\] = useState\<'Live' \| 'Reconnecting\.\.\.' \| 'Offline'\>\('Live'\);/, "const [connState, setConnState] = useState<'Live' | 'Reconnecting...' | 'Offline' | 'Live (Polling)'>('Live');");

// 1b: safeJson import
if (!code.includes('getRawSession')) {
  code = code.replace(/import \{ safeJson \} from '\.\.\/\.\.\/lib\/storage';/, "import { safeJson, getRawSession } from '../../lib/storage';");
}

// 1c: XSS in print
if (!code.includes('const esc = (s: unknown)')) {
  code = code.replace(/const handlePrint = \(order: any\) => \{/, 
`const handlePrint = (order: any) => {
    const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
`);
  // Manual safe replace for specific variables in handlePrint only
  code = code.replace(/\$\{order\.customer_name\}/g, '${esc(order.customer_name)}');
  code = code.replace(/\$\{order\.customer_phone\}/g, '${esc(order.customer_phone)}');
  code = code.replace(/\$\{order\.delivery_address\}/g, '${esc(order.delivery_address)}');
  code = code.replace(/\$\{item\.name\}/g, '${esc(item.name)}');
  code = code.replace(/\$\{variant\.name\}/g, '${esc(variant.name)}');
}

fs.writeFileSync('src/routes/admin/kitchen.tsx', code);
