const fs = require('fs');
let c = fs.readFileSync('src/routes/admin/kitchen.tsx', 'utf8');

const overlay = `
  if (!audioInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white cursor-pointer" onClick={() => { initAudio(); setAudioInitialized(true); }}>
         <div className="text-center">
            <Volume2 size={64} className="mx-auto mb-4 text-primary animate-pulse" />
            <h1 className="text-3xl font-black">Tap to enable kitchen sound</h1>
         </div>
      </div>
    );
  }
`;

c = c.replace(/const \[soundEnabled, setSoundEnabled\] = useState\(true\);/, `const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);`);

c = c.replace(/return \(/, `${overlay}\n\n  return (`);

c = c.replace(/<PinGate>/, `<PinGate onUnlock={() => { initAudio(); setAudioInitialized(true); }}>`);

fs.writeFileSync('src/routes/admin/kitchen.tsx', c);
console.log('Fixed kitchen.tsx audio overlay');
