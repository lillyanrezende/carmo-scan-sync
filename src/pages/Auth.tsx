import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Package } from "lucide-react";
import { z } from "zod";

// Validation schemas
const emailSchema = z.string().email("Email inválido").max(255, "Email demasiado longo");
const passwordSchema = z.string().min(8, "Password deve ter pelo menos 8 caracteres").max(72, "Password demasiado longa");
const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome demasiado longo");

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email
      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        toast({
          title: "Email inválido",
          description: emailValidation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      // Validate password
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast({
          title: "Password inválida",
          description: passwordValidation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      if (isSignUp) {
        // Validate name for signup
        const nameValidation = nameSchema.safeParse(nome);
        if (!nameValidation.success) {
          toast({
            title: "Nome inválido",
            description: nameValidation.error.errors[0].message,
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: emailValidation.data,
          password: passwordValidation.data,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              nome: nameValidation.data,
            },
          },
        });

        if (error) {
          // Handle specific error cases
          if (error.message.includes("already registered")) {
            throw new Error("Este email já está registado. Por favor, faça login.");
          }
          throw error;
        }

        toast({
          title: "Conta criada!",
          description: "A fazer login...",
        });

        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailValidation.data,
          password: passwordValidation.data,
        });

        if (error) {
          // Handle specific error cases
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Email ou password incorretos.");
          }
          throw error;
        }

        toast({
          title: "Login bem-sucedido!",
        });

        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Erro de autenticação",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-2">
            <Package className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Sapataria do Carmo
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Criar nova conta" : "Entre com as suas credenciais"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="João Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required={isSignUp}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A processar...
                </>
              ) : isSignUp ? (
                "Criar Conta"
              ) : (
                "Entrar"
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline"
                disabled={isLoading}
              >
                {isSignUp
                  ? "Já tem conta? Faça login"
                  : "Não tem conta? Registe-se"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
