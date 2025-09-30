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
      console.log('🎥 Iniciando scanner...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não está disponível. Verifique se está usando HTTPS.');
      }

      console.log('📱 Solicitando permissão de câmera...');
      
      // Request camera permission with constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      console.log('✅ Permissão de câmera concedida!');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        console.log('📹 Stream de vídeo configurado');
      }

      // Use ZXing library for barcode detection
      console.log('📚 Carregando biblioteca ZXing...');
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const codeReader = new BrowserMultiFormatReader();
      console.log('✅ ZXing carregado com sucesso');
      
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
      console.error('❌ Erro ao iniciar scanner:', error);
      
      let errorMessage = 'Verifique as permissões da câmera';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permissão negada. Por favor, permita o acesso à câmera nas configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Câmera está em uso por outra aplicação.';
        } else if (error.message.includes('HTTPS')) {
          errorMessage = 'O acesso à câmera requer conexão segura (HTTPS).';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Erro ao Aceder à Câmera',
        description: errorMessage,
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
