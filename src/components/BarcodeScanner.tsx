import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";

interface BarcodeScannerProps {
  onScanComplete: (code: string) => void;
  onCancel: () => void;
}

export function BarcodeScanner({ onScanComplete, onCancel }: BarcodeScannerProps) {
  const { isScanning, scannedCode, videoRef, startScanner, stopScanner } = useBarcodeScanner();

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  useEffect(() => {
    if (scannedCode) {
      onScanComplete(scannedCode);
    }
  }, [scannedCode, onScanComplete]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <CardTitle>Scanner de Código de Barras</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
        >
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      <CardContent>
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

        <p className="text-center text-sm text-muted-foreground mt-4">
          Posicione o código de barras dentro do quadro
        </p>
      </CardContent>
    </Card>
  );
}
