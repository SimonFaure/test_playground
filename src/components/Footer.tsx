import { useEffect, useState } from 'react';
import { Monitor, Usb } from 'lucide-react';
import { usbReaderService } from '../services/usbReader';

export function Footer() {
  const [computerName, setComputerName] = useState<string>('Unknown');
  const [usbConnected, setUsbConnected] = useState<boolean>(false);
  const [isElectron, setIsElectron] = useState<boolean>(false);

  useEffect(() => {
    if (window.electron) {
      window.electron.getComputerName().then(setComputerName);
    }

    setIsElectron(usbReaderService.isElectron());
  }, []);

  useEffect(() => {
    if (!isElectron) return;

    const checkUsbConnection = async () => {
      try {
        const ports = await usbReaderService.getAvailablePorts();
        setUsbConnected(ports.length > 0);
      } catch (error) {
        setUsbConnected(false);
      }
    };

    checkUsbConnection();
    const interval = setInterval(checkUsbConnection, 3000);

    return () => clearInterval(interval);
  }, [isElectron]);

  return (
    <footer className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 py-4">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center gap-6 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <Monitor size={16} />
            <span>Computer: <span className="text-white font-medium">{computerName}</span></span>
          </div>
          {isElectron && (
            <div className="flex items-center gap-2">
              <Usb size={16} className={usbConnected ? 'text-green-400' : 'text-red-400'} />
              <span>USB: <span className={`font-medium ${usbConnected ? 'text-green-400' : 'text-red-400'}`}>
                {usbConnected ? 'Connected' : 'Disconnected'}
              </span></span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
