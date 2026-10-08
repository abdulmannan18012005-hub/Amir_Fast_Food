const fs = require('fs');
let code = fs.readFileSync('src/components/admin/PinGate.tsx', 'utf8');

if (!code.includes('AdminErrorBoundary')) {
  const boundaryCode = `
class AdminErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error("AdminErrorBoundary caught an error", error, info);
    if (error.message.includes('Unauthorized') || error.message.includes('Invalid PIN')) {
      sessionStorage.removeItem('admin_pin');
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      if (this.state.error?.message.includes('Unauthorized') || this.state.error?.message.includes('Invalid PIN')) {
        return null;
      }
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
          <div className="bg-slate-800 p-8 rounded-xl max-w-md text-center shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-red-400">Admin Panel Error</h2>
            <p className="mb-6 text-sm text-slate-300">{this.state.error?.message || 'Something went wrong.'}</p>
            <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
`;
  
  // replace the export function PinGate return
  code = code.replace(/return <>{children}<\/>;/, 'return <AdminErrorBoundary>{children}</AdminErrorBoundary>;');
  
  // Insert AdminErrorBoundary class at the end
  code += boundaryCode;
  
  fs.writeFileSync('src/components/admin/PinGate.tsx', code);
}
