import { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';

export function Footer() {
  const [computerName, setComputerName] = useState<string>('Unknown');

  useEffect(() => {
    if (window.electron) {
      window.electron.getComputerName().then(setComputerName);
    }
  }, []);

  return (
    <footer className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 py-4">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Monitor size={16} />
          <span>Computer: <span className="text-white font-medium">{computerName}</span></span>
        </div>
      </div>
    </footer>
  );
}
