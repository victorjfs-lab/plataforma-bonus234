import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function PortalSignup() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      toast({
        title: "Cadastro automatico indisponivel",
        description: "Configure o Supabase para liberar o cadastro real dos alunos.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "Use pelo menos 6 caracteres para o aluno entrar no portal.",
        variant: "destructive",
      });
      return;
    }

    if (password !== passwordConfirm) {
      toast({
        title: "As senhas nao conferem",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Nao foi possivel criar seu cadastro agora.");
      }

      const signInResult = await signIn(email, password);

      if (signInResult.error) {
        toast({
          title: "Cadastro criado",
          description: "Agora entre com seu email e senha para acessar o portal.",
        });
        navigate("/login", { replace: true });
        return;
      }

      toast({
        title: "Conta criada com sucesso",
        description: "Seu acesso foi liberado e voce ja pode publicar seus resultados.",
      });
      navigate("/app/minha-area", { replace: true });
    } catch (error) {
      toast({
        title: "Nao foi possivel criar a conta",
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(16,47,60,0.18),transparent_28%),linear-gradient(180deg,#f5efe5_0%,#f8fbfa_55%,#edf2f1_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <Card className="w-full max-w-[620px] border-border/60 bg-white/92 shadow-xl backdrop-blur">
          <CardHeader className="space-y-4">
            <Button asChild variant="ghost" className="-ml-3 w-fit gap-2 px-3">
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </Button>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <UserRound className="h-5 w-5" />
            </div>
            <CardTitle className="text-3xl">Criar conta na Smart Flow News</CardTitle>
            <CardDescription>
              Cadastro automatico para o aluno entrar no portal e publicar resultados no mural.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    autoComplete="name"
                    className="pl-9"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </div>

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
                    autoComplete="new-password"
                    className="pl-9"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Crie sua senha"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    placeholder="Repita sua senha"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Criando conta..." : "Criar cadastro automatico"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
