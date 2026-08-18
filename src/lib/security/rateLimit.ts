import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const temConfiguracaoUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const limitadorTaxa = temConfiguracaoUpstash
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 pedidos/minuto por identidade
      analytics: true,
      prefix: "vertice-suporte",
    })
  : null;

/**
 * Limita a taxa de pedidos por utilizador/IP para as rotas mais sensíveis
 * (chat → chama LLM paga; criação de clientes; login). Sem Upstash
 * configurado (ex.: ambiente de desenvolvimento), o limitador fica
 * inativo — nunca bloqueia, mas também nunca finge proteger: ver
 * README para a recomendação de configurar em produção.
 */
export async function verificarLimiteTaxa(identificador: string) {
  if (!limitadorTaxa) {
    return { sucesso: true, limitado: false as const };
  }

  const { success: sucesso, remaining: restantes, reset } = await limitadorTaxa.limit(identificador);
  return { sucesso, limitado: true as const, restantes, reset };
}
