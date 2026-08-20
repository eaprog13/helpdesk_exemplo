// Port de armazenamento de ficheiros (hoje: logótipos das empresas
// clientes). Trocar de Supabase Storage para S3, Cloudinary, etc. é
// escrever um novo adaptador que implemente este contrato — nada no core
// ou nas rotas muda.

export interface FicheiroParaCarregar {
  conteudo: Buffer;
  tipoConteudo: string;
  /** Extensão sem ponto, ex: "png", "svg". Usada para dar nome ao ficheiro guardado. */
  extensao: string;
}

export interface RepositorioArmazenamento {
  /** Guarda o logótipo do cliente e devolve o URL público para o mostrar na UI. */
  carregarLogotipoCliente(idCliente: string, ficheiro: FicheiroParaCarregar): Promise<string>;

  /** Guarda um anexo de ticket (bucket privado) e devolve o caminho interno de armazenamento. */
  carregarAnexoTicket(idTicket: string, ficheiro: FicheiroParaCarregar): Promise<string>;

  /** URL temporário (assinado) para aceder a um anexo de ticket previamente guardado. */
  obterUrlAnexoTicket(caminho: string): Promise<string>;
}
