const fs = require('fs');
let code = fs.readFileSync('src/routes/admin/kitchen.tsx', 'utf8');

// 1. Add Push state and logic
const pushImports = `import { subscribeAdminPushFn, sendTestAdminPushFn, getVapidPublicKeyFn } from '../../server/push';`;
if (!code.includes('subscribeAdminPushFn')) {
  code = code.replace(/(import .*? from 'lucide-react';)/, "$1\n" + pushImports);
}

const pushLogic = `
  const [pushStatus, setPushStatus] = useState<'Checking...' | 'Enabled' | 'Blocked' | 'Not Supported' | 'Alerts not configured'>('Checking...');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('Not Supported');
      return;
    }
    navigator.permissions.query({ name: 'notifications' }).then(status => {
      if (status.state === 'denied') setPushStatus('Blocked');
      else if (status.state === 'granted') setPushStatus('Enabled');
      else setPushStatus('Checking...'); // Actually means 'Promptable'
    });
  }, []);

  const handleEnablePush = async () => {
    if (pushStatus === 'Not Supported' || pushStatus === 'Blocked') return;
    try {
      const { publicKey } = await getVapidPublicKeyFn();
      if (!publicKey) {
        setPushStatus('Alerts not configured');
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setPushStatus('Blocked');
        return;
      }

      const swRegistration = await navigator.serviceWorker.ready;
      let subscription = await swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        });
      }

      const savedPin = getRawSession('admin_pin') || '';
      const res = await subscribeAdminPushFn({ data: { subscription: JSON.parse(JSON.stringify(subscription)), pin: savedPin } });
      if (res.success) {
        setPushStatus('Enabled');
      } else {
        alert('Failed to subscribe on server: ' + res.error);
      }
    } catch (e: any) {
      alert('Failed to enable push: ' + e.message);
    }
  };

  const handleTestPush = async () => {
    try {
      const savedPin = getRawSession('admin_pin') || '';
      await sendTestAdminPushFn({ data: { pin: savedPin } });
    } catch (e: any) {
      alert('Test push failed: ' + e.message);
    }
  };
`;

if (!code.includes('const [pushStatus')) {
  code = code.replace(/(const \[wakeLockEnabled, setWakeLockEnabled\] = useState\(false\);)/, "$1" + pushLogic);
}

// 2. Add Push UI to Header
const pushUI = `
            {pushStatus === 'Enabled' ? (
              <button onClick={handleTestPush} className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 transition-colors flex items-center gap-1.5">
                <BellRing size={14} /> Test Alert
              </button>
            ) : pushStatus === 'Alerts not configured' || pushStatus === 'Not Supported' || pushStatus === 'Blocked' ? (
              <span className="text-xs text-slate-500 px-2">{pushStatus}</span>
            ) : (
              <button onClick={handleEnablePush} className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5">
                <BellRing size={14} /> Enable Alerts
              </button>
            )}
`;

if (!code.includes('handleEnablePush')) {
  code = code.replace(/(<button \s*onClick=\{\(\) => \{\s*sessionStorage\.removeItem\('admin_pin'\);[\s\S]*?<\/button>)/, pushUI);
}

fs.writeFileSync('src/routes/admin/kitchen.tsx', code);
