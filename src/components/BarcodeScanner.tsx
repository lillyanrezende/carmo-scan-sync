import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Camera, Keyboard } from "lucide-react";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";

interface BarcodeScannerProps {
  onScanComplete: (code: string) => void;
  onCancel: () => void;
}

export function BarcodeScanner({ onScanComplete, onCancel }: BarcodeScannerProps) {
  const { isScanning, scannedCode, videoRef, startScanner, stopScanner, clearScannedCode } = useBarcodeScanner();
  const [manualCode, setManualCode] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initScanner = async () => {
      if (mounted) {
        try {
          await startScanner();
        } catch (err) {
          console.error('Failed to init scanner:', err);
        }
      }
    };
    
    initScanner();
    
    return () => {
      mounted = false;
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (scannedCode) {
      onScanComplete(scannedCode);
      clearScannedCode();
    }
  }, [scannedCode, onScanComplete, clearScannedCode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanComplete(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {useManualInput ? <Keyboard className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
          <CardTitle>{useManualInput ? "Digitar Código" : "Scanner de Código de Barras"}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!useManualInput ? (
          <>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {isScanning ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  A inicializar câmera...
                </div>
              )}

              {/* Crosshair overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-48 border-2 border-success rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-success" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-success" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-success" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-success" />
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Posicione o código de barras dentro do quadro
            </p>
          </>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Digite o código de barras"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                autoFocus
                className="text-lg"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!manualCode.trim()}>
              Confirmar Código
            </Button>
          </form>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setUseManualInput(!useManualInput);
            if (!useManualInput) {
              stopScanner();
            } else {
              startScanner();
            }
          }}
        >
          {useManualInput ? (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Usar Câmera
            </>
          ) : (
            <>
              <Keyboard className="w-4 h-4 mr-2" />
              Digitar Manualmente
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
