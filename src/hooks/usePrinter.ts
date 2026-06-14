import { useState, useCallback, useRef } from 'react';
import { PrinterService, getPrinterService, PrinterConfig, PrinterStatus, PrintResult } from '../services/printer-service';

/**
 * usePrinter Hook
 * 
 * Manages printer state and operations.
 * Usage:
 *   const { status, connect, disconnect, print, isConnecting } = usePrinter();
 *   await connect({ type: 'network', ipAddress: '192.168.1.100' });
 */
export function usePrinter() {
  const [status, setStatus] = useState<PrinterStatus>({
    connected: false,
    type: 'disconnected' as any,
    deviceName: 'No Printer',
    status: 'offline',
    paperStatus: 'out'
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastResult, setLastResult] = useState<PrintResult | null>(null);
  const printerRef = useRef<PrinterService | null>(null);

  const getPrinter = useCallback((): PrinterService => {
    if (!printerRef.current) {
      printerRef.current = getPrinterService();
    }
    return printerRef.current;
  }, []);

  const connect = useCallback(async (config: Partial<PrinterConfig>) => {
    setIsConnecting(true);
    try {
      const printer = getPrinter();
      const success = await printer.connect(config);
      setStatus(printer.getStatus());
      return success;
    } finally {
      setIsConnecting(false);
    }
  }, [getPrinter]);

  const disconnect = useCallback(() => {
    const printer = getPrinter();
    printer.disconnect();
    setStatus(printer.getStatus());
  }, [getPrinter]);

  const refreshStatus = useCallback(() => {
    const printer = getPrinter();
    setStatus(printer.getStatus());
  }, [getPrinter]);

  return {
    status,
    isConnecting,
    lastResult,
    connect,
    disconnect,
    refreshStatus,
    isConnected: status.connected,
    getPrinter
  };
}

export default usePrinter;
