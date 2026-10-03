// Web Audio API Synths for Sensory Feedback

let sharedCtx: AudioContext | null = null;

export const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!sharedCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedCtx = new AudioContextClass();
    }
  }
  return sharedCtx;
};

export const initAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
};

export const playSuccessChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Play a happy dual-tone chord (C5 + E5)
    const playNote = (freq: number, startTime: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
      
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    };

    playNote(523.25, ctx.currentTime);       // C5
    playNote(659.25, ctx.currentTime + 0.1); // E5
  } catch (e) {
    // Ignore in SSR or if Audio API is blocked
  }
};

export const playCashChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Play a register 'ka-ching' style arpeggio
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    
    // Quick arpeggio up
    osc.frequency.setValueAtTime(783.99, ctx.currentTime);       // G5
    osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.05); // B5
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.1); // E6
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) { }
};

export const playKitchenDing = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Play a sharp service bell ding
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
  } catch (e) { }
};
