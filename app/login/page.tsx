"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register" | "verify" | "requestReset" | "reset";

type PostResult = {
  res: Response;
  data: Record<string, unknown>;
  rawText: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        const raw = await res.text();
        let data: Record<string, unknown> = {};
        try {
          data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          data = {};
        }

        if (!res.ok || data.ok !== true) {
          const detail =
            (typeof data.error === "string" && data.error) ||
            (raw ? raw.slice(0, 200) : "sem detalhe");
          setInfo(`Banco indisponivel: ${detail}`);
        }
      })
      .catch((e) => {
        const detail = e instanceof Error ? e.message : "erro desconhecido";
        setInfo(`Nao foi possivel validar conexao com o banco: ${detail}`);
      });
  }, []);

  const post = async (url: string, body: Record<string, unknown>): Promise<PostResult> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const rawText = await res.text();
      let data: Record<string, unknown> = {};

      try {
        data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
      } catch {
        data = {};
      }

      return { res, data, rawText };
    } finally {
      clearTimeout(timeout);
    }
  };

  const onLoginOrRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "register" ? { name, email, password } : { email, password };
      const { res, data, rawText } = await post(endpoint, payload);

      if (!res.ok) {
        if (data?.requiresEmailVerification) {
          setInfo(data?.debugCode ? `Codigo de teste: ${String(data.debugCode)}` : "Codigo enviado por email. Verifique para concluir o cadastro.");
          setMode("verify");
          return;
        }

        const apiError = typeof data?.error === "string" ? data.error : "";
        const fallback = rawText ? rawText.slice(0, 160) : "Sem detalhe da API";
        setError(apiError || `Falha ao autenticar (HTTP ${res.status}): ${fallback}`);
        return;
      }

      if (data?.requiresEmailVerification) {
        setInfo(data?.debugCode ? `Codigo de teste: ${String(data.debugCode)}` : "Codigo enviado por email. Verifique para concluir o cadastro.");
        setMode("verify");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      const detail = e instanceof Error ? e.message : "erro desconhecido";
      setError(`Nao foi possivel conectar: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const { res, data, rawText } = await post("/api/auth/verify-email-code", { email, code });
      if (!res.ok) {
        setError((data?.error as string) || `Falha ao verificar codigo (HTTP ${res.status}): ${rawText.slice(0, 120)}`);
        return;
      }
      setInfo("Email verificado com sucesso. Agora faca login.");
      setMode("login");
      setCode("");
      setPassword("");
    } catch (e) {
      const detail = e instanceof Error ? e.message : "erro desconhecido";
      setError(`Nao foi possivel verificar agora: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const onRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const { data } = await post("/api/auth/request-password-reset", { email });
      setInfo(data?.debugCode ? `Codigo de redefinicao (teste): ${String(data.debugCode)}` : "Enviamos um codigo para seu email.");
      setMode("reset");
    } catch (e) {
      const detail = e instanceof Error ? e.message : "erro desconhecido";
      setError(`Nao foi possivel enviar codigo agora: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const { res, data, rawText } = await post("/api/auth/reset-password", { email, code, newPassword });
      if (!res.ok) {
        setError((data?.error as string) || `Falha ao redefinir senha (HTTP ${res.status}): ${rawText.slice(0, 120)}`);
        return;
      }
      setInfo("Senha redefinida com sucesso. Agora faca login.");
      setMode("login");
      setCode("");
      setNewPassword("");
      setPassword("");
    } catch (e) {
      const detail = e instanceof Error ? e.message : "erro desconhecido";
      setError(`Nao foi possivel redefinir senha agora: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-container" style={{ maxWidth: 460 }}>
        <section className="panel section">
          <h1 className="page-title" style={{ fontSize: 34 }}>
            {mode === "register" ? "Criar conta" : mode === "verify" ? "Verificar email" : mode === "requestReset" || mode === "reset" ? "Redefinir senha" : "Entrar"}
          </h1>
          <p className="page-subtitle">Acesso seguro com sessao individual por usuario.</p>

          {(mode === "login" || mode === "register") && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn" onClick={() => setMode("login")}>Login</button>
              <button type="button" className="btn" onClick={() => setMode("register")}>Cadastrar</button>
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <form onSubmit={onLoginOrRegister} style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {mode === "register" && (
                <input className="input" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
              )}
              <input className="input" placeholder="seu@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="input" placeholder="Minimo 6 caracteres" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />

              {mode === "login" && (
                <button
                  type="button"
                  className="btn"
                  style={{ justifySelf: "start", paddingLeft: 0, paddingRight: 0, background: "transparent" }}
                  onClick={() => {
                    setMode("requestReset");
                    setError("");
                    setInfo("");
                    setCode("");
                    setNewPassword("");
                  }}
                >
                  Esqueci a senha
                </button>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
              </button>
            </form>
          )}

          {mode === "verify" && (
            <form onSubmit={onVerify} style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <p className="muted" style={{ margin: 0 }}>
                Passo 2: informe o codigo enviado para {email || "seu email"}.
              </p>
              <input className="input" placeholder="Seu email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="input" placeholder="Codigo de 6 digitos" value={code} onChange={(e) => setCode(e.target.value)} required />
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Aguarde..." : "Concluir cadastro"}</button>
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  setLoading(true);
                  setError("");
                  setInfo("");
                  try {
                    const { data } = await post("/api/auth/request-verification-code", { email });
                    setInfo(data?.debugCode ? `Novo codigo (teste): ${String(data.debugCode)}` : "Novo codigo enviado para seu email.");
                  } catch {
                    setError("Nao foi possivel reenviar codigo agora.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Reenviar codigo
              </button>
            </form>
          )}

          {mode === "requestReset" && (
            <form onSubmit={onRequestReset} style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <input className="input" placeholder="Seu email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Aguarde..." : "Enviar codigo"}</button>
              <button type="button" className="btn" onClick={() => setMode("login")}>Voltar ao login</button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={onResetPassword} style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <input className="input" placeholder="Seu email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="input" placeholder="Codigo recebido" value={code} onChange={(e) => setCode(e.target.value)} required />
              <input className="input" placeholder="Nova senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Aguarde..." : "Redefinir senha"}</button>
              <button type="button" className="btn" onClick={() => setMode("login")}>Voltar ao login</button>
            </form>
          )}

          {info && <p style={{ color: "#2f7f48", marginTop: 10 }}>{info}</p>}
          {error && <p style={{ color: "#a33939", marginTop: 10 }}>{error}</p>}
        </section>
      </div>
    </div>
  );
}
