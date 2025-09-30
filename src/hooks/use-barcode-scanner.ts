import { useState, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { isEAN, validateEAN } from '@/lib/ean-validator';

export function useBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);

  const startScanner = async () => {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }

      // Use ZXing library for barcode detection
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const codeReader = new BrowserMultiFormatReader();
      
      scannerRef.current = codeReader;

      codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, error) => {
          if (result) {
            const code = result.getText();
            console.log('Barcode detected:', code);
            
            // Validate if it's an EAN
            if (isEAN(code) && !validateEAN(code)) {
              toast({
                title: 'EAN Inválido',
                description: `Checksum incorreto para: ${code}`,
                variant: 'destructive',
              });
              return;
            }

            setScannedCode(code);
            stopScanner();
          }

          if (error && !(error as any).name?.includes('NotFound')) {
            console.error('Scanner error:', error);
          }
        }
      );

    } catch (error) {
      console.error('Failed to start scanner:', error);
      toast({
        title: 'Erro ao Aceder à Câmera',
        description: 'Verifique as permissões da câmera',
        variant: 'destructive',
      });
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (scannerRef.current) {
      scannerRef.current.reset();
      scannerRef.current = null;
    }

    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return {
    isScanning,
    scannedCode,
    videoRef,
    startScanner,
    stopScanner,
    clearScannedCode: () => setScannedCode(null),
  };
}
