import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { LogOut, Camera, Package, History, Wifi, WifiOff } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ProductInfo } from "@/components/ProductInfo";
import { MovementForm } from "@/components/MovementForm";
import { OfflineQueue as OfflineQueueComp } from "@/components/OfflineQueue";
import { OfflineQueue } from "@/lib/offline-queue";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [queueStats, setQueueStats] = useState(OfflineQueue.getStats());

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Update queue stats periodically
    const interval = setInterval(() => {
      setQueueStats(OfflineQueue.getStats());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleScanComplete = (code: string) => {
    setScannedCode(code);
    setShowScanner(false);
    toast({
      title: "Código Lido!",
      description: `${code}`,
    });
  };

  const handleMovementComplete = () => {
    setScannedCode(null);
    setQueueStats(OfflineQueue.getStats());
  };

  if (!user) {
    return null;
  }

  const userName = (user.user_metadata?.nome || user.email?.split("@")[0] || "Utilizador");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sapataria do Carmo</h1>
              <p className="text-sm text-muted-foreground">Olá, {userName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-1 text-sm text-success">
                <Wifi className="w-4 h-4" />
                <span className="hidden sm:inline">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm text-warning">
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        {!scannedCode && !showScanner && (
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                size="lg"
                onClick={() => setShowScanner(true)}
                className="h-24 text-lg"
              >
                <Camera className="w-6 h-6 mr-2" />
                Ler Código de Barras
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/historico")}
                className="h-24 text-lg"
              >
                <History className="w-6 h-6 mr-2" />
                Ver Histórico
              </Button>
            </div>
          </Card>
        )}

        {/* Scanner */}
        {showScanner && (
          <BarcodeScanner
            onScanComplete={handleScanComplete}
            onCancel={() => setShowScanner(false)}
          />
        )}

        {/* Product Info & Movement Form */}
        {scannedCode && !showScanner && (
          <div className="space-y-4">
            <ProductInfo code={scannedCode} />
            <MovementForm
              code={scannedCode}
              userName={userName}
              onComplete={handleMovementComplete}
              onCancel={() => setScannedCode(null)}
            />
          </div>
        )}

        {/* Offline Queue */}
        {queueStats.pendente > 0 && (
          <OfflineQueueComp />
        )}
      </main>
    </div>
  );
}
