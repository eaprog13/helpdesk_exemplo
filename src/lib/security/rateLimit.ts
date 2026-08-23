import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const temConfiguracaoUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = temConfiguracaoUpstash
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

const limitadorTaxa = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 pedidos/minuto por identidade
      analytics: true,
      prefix: "vertice-suporte",
    })
  : null;

/**
 * Limita a taxa de pedidos por utilizador/IP para as rotas mais sensíveis
 * (chat → chama LLM paga; criação de clientes). Sem Upstash configurado
 * (ex.: ambiente de desenvolvimento), o limitador fica inativo — nunca
 * bloqueia, mas também nunca finge proteger: ver README para a
 * recomendação de configurar em produção.
 */
export async function verificarLimiteTaxa(identificador: string) {
  if (!limitadorTaxa) {
    return { sucesso: true, limitado: false as const };
  }

  const { success: sucesso, remaining: restantes, reset } = await limitadorTaxa.limit(identificador);
  return { sucesso, limitado: true as const, restantes, reset };
}

const limitadorLogin = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 tentativas/minuto por email+IP
      analytics: true,
      prefix: "vertice-suporte:login",
    })
  : null;

/**
 * Limita tentativas de login (força bruta/credential stuffing) por
 * identidade (ex: `${email}:${ip}`) — janela mais apertada que o limitador
 * genérico acima, de propósito: login é o alvo clássico de força bruta.
 * Mesmo comportamento sem Upstash: fica inativo, nunca bloqueia nem finge
 * proteger.
 */
export async function verificarLimiteLogin(identificador: string) {
  if (!limitadorLogin) {
    return { sucesso: true, limitado: false as const };
  }

  const { success: sucesso, reset } = await limitadorLogin.limit(identificador);
  return { sucesso, limitado: true as const, reset };
}
