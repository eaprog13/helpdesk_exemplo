"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/server";
import { verificarLimiteLogin } from "@/lib/security/rateLimit";
import { loginSchema } from "@/lib/validation";
import { obterContentor } from "@/composition/container";
import { iniciarNovaConversa } from "@/core/services/chatService";

export type ActionState = { status: "idle" | "error"; message?: string };

async function obterIp() {
  const cabecalhos = await headers();
  return cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
}

/**
 * Login como server action — antes corria inteiramente no browser
 * (LoginForm chamava supabase.auth.signInWithPassword diretamente), o que
 * significava que o limitador de tentativas da app nunca chegava a correr
 * para o login: um atacante podia sempre chamar o Supabase Auth
 * diretamente, ignorando por completo a nossa app. Movido para aqui para
 * que verificarLimiteLogin (por email+IP) entre mesmo antes de tentar
 * autenticar — mesmo padrão usado em gestor_financeiro/gestor_investimento.
 */
export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const ip = await obterIp();
  const { sucesso } = await verificarLimiteLogin(`${parsed.data.email}:${ip}`);
  if (!sucesso) {
    return { status: "error", message: "Demasiadas tentativas. Tenta de novo daqui a um minuto." };
  }

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Detalhe completo só no servidor (nunca no ecrã, para não revelar a
    // utilizadores mal-intencionados se um email existe ou não) — mas é
    // exatamente o que precisamos para diagnosticar (ver logs do Vercel).
    console.error("[login] Supabase respondeu com erro:", error.status, error.message);

    if (error.message?.toLowerCase().includes("email not confirmed")) {
      return {
        status: "error",
        message: "O email ainda não está confirmado no Supabase (Authentication → Users → confirmar manualmente).",
      };
    }
    return { status: "error", message: "Email ou password incorretos. Verifique as credenciais recebidas por email." };
  }

  // Cada login arranca com uma conversa em branco — as anteriores não se
  // perdem, ficam acessíveis em "Histórico". Só para clientes: staff
  // (admin/dev) nunca usa o chat (ver /api/chat/conversas — mesmo filtro,
  // reaplicado aqui agora que a chamada é direta ao serviço em vez de um
  // pedido HTTP interno ao próprio endpoint). Não bloqueia o login se
  // falhar (ex.: hiccup de rede).
  try {
    const dependencias = obterContentor();
    const perfil = await dependencias.perfis.obterPorId(data.user.id);
    if (perfil?.role === "client") {
      await iniciarNovaConversa(dependencias, data.user.id);
    }
  } catch (erroConversa) {
    console.error("[login] não foi possível iniciar nova conversa:", erroConversa);
  }

  // "//evil.com" também começa por "/" mas os browsers tratam-no como URL
  // absoluto (protocol-relative) — sem este segundo teste, um link
  // "/login?redirectTo=//evil.com" seria um open redirect após o login.
  const redirectTo = formData.get("redirectTo");
  const destinoSeguro =
    typeof redirectTo === "string" && redirectTo.startsWith("/") && !redirectTo.startsWith("//");
  redirect(destinoSeguro ? redirectTo : "/");
}
