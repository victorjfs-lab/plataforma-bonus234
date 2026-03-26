import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, LogIn, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { isAuthenticated, isDemoMode, isLoading, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    const nextPath =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/app";
    return <Navigate to={nextPath} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: "Nao foi possivel entrar",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    const nextPath =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/app";

    toast({
      title: "Login realizado",
      description: "Sua Smart Flow News foi aberta com seguranca.",
    });
    navigate(nextPath, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(16,47,60,0.18),transparent_28%),linear-gradient(180deg,#f5efe5_0%,#f8fbfa_55%,#edf2f1_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <Card className="w-full max-w-[560px] border-border/60 bg-white/92 shadow-xl backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <LogIn className="h-5 w-5" />
            </div>
            <CardTitle className="text-3xl">Entrar na Smart Flow News</CardTitle>
            <CardDescription>
              Use suas credenciais para abrir a area do aluno ou o painel administrativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isDemoMode ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
                <p className="font-semibold">Modo demonstracao ativo</p>
                <p>Admin: admin@academia.local / admin123</p>
                <p>Aluno: marina@aluno.local / acesso123</p>
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="pl-9"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="pl-9"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
