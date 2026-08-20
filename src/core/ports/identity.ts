// Port de gestão de identidade (operações administrativas: criar conta,
// definir password, obter email por id). Note-se que "verificar a sessão de
// um pedido HTTP" NÃO está aqui — isso depende inevitavelmente do mecanismo
// de transporte (cookies, headers) e é responsabilidade da camada web
// (src/lib/auth/session.ts), que resolve o UtilizadorAutenticado e só depois
// entrega ao core um objeto simples. Isto mantém o core 100% agnóstico de
// framework.

export interface DadosCriacaoUtilizador {
  email: string;
  palavraPasse: string;
  // Estas chaves (role, full_name, …) mantêm-se em inglês/snake_case por
  // corresponderem literalmente ao que o trigger SQL "handle_new_user"
  // (supabase/schema.sql) lê de raw_user_meta_data — mudar aqui obrigaria a
  // mudar também o SQL.
  metadados: {
    role: "client" | "dev" | "admin";
    full_name: string;
    company_name?: string | null;
    phone?: string | null;
  };
}

export interface FornecedorGestaoIdentidade {
  criarUtilizador(dados: DadosCriacaoUtilizador): Promise<{ id: string }>;
  definirPalavraPasse(idUtilizador: string, novaPalavraPasse: string): Promise<void>;
  obterEmailPorId(idUtilizador: string): Promise<string | null>;
}
