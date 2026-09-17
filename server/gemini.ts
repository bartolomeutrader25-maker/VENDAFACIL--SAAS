import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface BusinessDataSummary {
  companyName: string;
  currency: string;
  totalSalesToday: number;
  totalSalesMonth: number;
  totalSalesLastMonth: number;
  totalProfitMonth: number;
  totalExpensesMonth: number;
  bestSellingProducts: { name: string; quantity: number; revenue: number; profit: number }[];
  lowSellingProducts: { name: string; stock: number; soldQty: number }[];
  lowStockProducts: { name: string; currentStock: number; minStock: number; unit: string }[];
  pendingReceivables: { customerName: string; pendingAmount: number; dueDate: string }[];
  totalReceivables: number;
  recentSalesCount: number;
  topCustomers: { name: string; totalSpent: number; purchasesCount: number }[];
  expensesByCategory: Record<string, number>;
}

export async function askBusinessAssistant(
  prompt: string,
  businessSummary: BusinessDataSummary,
  chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return generateFallbackAnalysis(prompt, businessSummary);
  }

  const systemInstruction = `
Você é o "Assistente IA VendaFácil", um consultor financeiro e especialista em gestão de pequenos e médios negócios (minimercados, boutiques, lojas de conveniência, restaurantes, farmácias em Angola e mercados em geral).
A moeda padrão é ${businessSummary.currency} (Kwanzas - Kz).

Você tem acesso exclusivo e restrito aos dados reais da empresa "${businessSummary.companyName}".
Nunca misture ou invente dados de outras empresas.

Resumo atual dos dados do negócio:
- Empresa: ${businessSummary.companyName}
- Moeda: ${businessSummary.currency}
- Vendas de Hoje: ${businessSummary.totalSalesToday.toLocaleString('pt-PT')} ${businessSummary.currency}
- Vendas deste Mês: ${businessSummary.totalSalesMonth.toLocaleString('pt-PT')} ${businessSummary.currency}
- Vendas do Mês Anterior: ${businessSummary.totalSalesLastMonth.toLocaleString('pt-PT')} ${businessSummary.currency}
- Lucro Estimado no Mês: ${businessSummary.totalProfitMonth.toLocaleString('pt-PT')} ${businessSummary.currency}
- Despesas no Mês: ${businessSummary.totalExpensesMonth.toLocaleString('pt-PT')} ${businessSummary.currency}
- Total a Receber (Fiado/Crédito pendente): ${businessSummary.totalReceivables.toLocaleString('pt-PT')} ${businessSummary.currency}
- Produtos mais vendidos: ${JSON.stringify(businessSummary.bestSellingProducts)}
- Produtos com stock baixo (precisam reposição): ${JSON.stringify(businessSummary.lowStockProducts)}
- Produtos com menor saída: ${JSON.stringify(businessSummary.lowSellingProducts)}
- Clientes que mais compram: ${JSON.stringify(businessSummary.topCustomers)}
- Despesas por categoria: ${JSON.stringify(businessSummary.expensesByCategory)}
- Contas a receber pendentes: ${JSON.stringify(businessSummary.pendingReceivables)}

Diretrizes:
1. Responda em português (de forma clara, profissional, objetiva e motivadora).
2. Seja direto, fornecendo números concretos e dicas práticas de ação (ex: quais produtos repor com urgência, como cobrar fiado com elegância, oportunidades de aumentar a margem).
3. Use formatação limpa com tópicos curtos e destaques numéricos em negrito.
4. Mantenha as respostas concisas e fáceis de ler no telemóvel.
5. Você também é o Guia Especialista de Boas-Vindas do VendaFácil SaaS. Se o utilizador perguntar como usar qualquer função (cadastrar produto, fazer primeira venda no PDV, cadastrar clientes, gerir fiados com WhatsApp, abrir/fechar caixa, relatórios), forneça uma explicação passo a passo acolhedora, clara e prática.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Não foi possível obter uma resposta detalhada no momento.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return generateFallbackAnalysis(prompt, businessSummary);
  }
}

function generateFallbackAnalysis(prompt: string, summary: BusinessDataSummary): string {
  const p = prompt.toLowerCase();
  const curr = summary.currency;

  if (p.includes("registar produto") || p.includes("cadastrar produto") || p.includes("primeiro produto") || p.includes("adicionar produto")) {
    return `📦 **Como Registar o Seu Primeiro Produto (Passo a Passo):**\n\n1. **Aceda ao Menu Produtos:** No menu lateral ou inferior, clique em **Produtos**.\n2. **Clique em '+ Novo Produto':** Abre o formulário de cadastro rápido.\n3. **Preencha os Dados:**\n   • **Nome:** Ex: *Arroz Tio Lucas 25kg* ou *Coca-Cola Lata*\n   • **Preço de Venda:** O valor cobrado ao cliente (ex: 2.500 ${curr})\n   • **Preço de Custo:** O que pagou ao fornecedor (ex: 1.800 ${curr}) — assim o sistema calcula o seu **lucro líquido real** automaticamente!\n   • **Stock Atual & Mínimo:** Quantas unidades tem na loja e quando deve ser avisado para repor.\n   • **Código de Barras:** Digite, gere automaticamente ou bipe com a câmara do telemóvel.\n4. **Clique em 'Guardar':** Pronto! O produto fica logo disponível no PDV para vender em menos de 10 segundos.`;
  }

  if (p.includes("fazer venda") || p.includes("primeira venda") || p.includes("como vender") || p.includes("pdv") || p.includes("realizar venda")) {
    return `🛒 **Como Realizar a Primeira Venda no PDV (Passo a Passo):**\n\n1. **Abra o PDV:** Clique no botão verde de destaque **'+ Nova Venda (PDV)'** no topo ou no menu.\n2. **Selecione os Produtos:** Toque na imagem/nome do produto ou digite no campo de busca/código de barras. O produto é somado ao carrinho instantaneamente.\n3. **Selecione o Cliente (Opcional):** Pode ser uma *Venda Rápida ao Balcão* (sem cliente) ou escolher um cliente cadastrado.\n4. **Escolha a Forma de Pagamento:**\n   • **Dinheiro:** Digite o valor entregue e o sistema dá o troco exato na hora.\n   • **Multicaixa TPA / Express:** Registo imediato do comprovativo.\n   • **Fiado:** Caso o cliente tenha limite de crédito aprovado.\n5. **Finalizar Venda:** O recibo é gerado com formatação térmica para impressão e pode ser **enviado diretamente pelo WhatsApp** do cliente com 1 clique!`;
  }

  if (p.includes("cadastrar cliente") || p.includes("novo cliente") || p.includes("adicionar cliente")) {
    return `👥 **Como Cadastrar Clientes (Passo a Passo):**\n\n1. **Aceda ao Menu Clientes:** Clique em **Clientes** no menu lateral ou de gestão.\n2. **Clique em '+ Novo Cliente':**\n3. **Preencha:**\n   • **Nome Completo**\n   • **Telefone / WhatsApp:** Muito importante para poder partilhar faturas, recibos e lembretes amigáveis de fiado.\n   • **Limite de Fiado (Kz):** Defina o valor máximo que este cliente pode levar a crédito sem pagar na hora.\n4. **Guardar:** A partir daqui, ao fazer uma venda no PDV, basta começar a digitar o nome dele para associar a compra ao histórico do cliente!`;
  }

  if (p.includes("como funciona o fiado") || p.includes("fiado") || p.includes("cobrar")) {
    return `💳 **Como Funciona a Gestão de Fiado no VendaFácil:**\n\n1. **Venda a Fiado:** No PDV, escolha o cliente e selecione o método de pagamento **Fiado**. O stock é abatido normalmente e a conta fica pendente.\n2. **Acompanhar Dívidas:** No menu **Fiado / A Receber**, vê todos os clientes devedores, total pendente e prazos de vencimento.\n3. **Cobrança WhatsApp:** Em cada conta pendente, há um botão verde **WhatsApp** que já monta uma mensagem educada com o valor devido pronta para enviar.\n4. **Amortização / Pagamento:** Quando o cliente trouxer o dinheiro (mesmo que seja parcial), clique em **Registar Pagamento** para abater a dívida.`;
  }

  if (p.includes("caixa") || p.includes("abrir caixa") || p.includes("fechar caixa")) {
    return `💼 **Como Funciona o Controlo de Caixa Diário:**\n\n1. **Abertura do Dia:** Ao começar o dia, informe o fundo de maneio inicial (troco em notas na gaveta).\n2. **Movimentações Automáticas:** Todas as vendas em dinheiro, TPA e despesas lançadas alimentam o saldo do caixa em tempo real.\n3. **Fechamento Cego:** No final do expediente, o operador conta as notas físicas e insere o valor. O sistema compara com o esperado pelo sistema e aponta qualquer sobra ou quebra de caixa.`;
  }

  if (p.includes("navegar") || p.includes("menu") || p.includes("como funciona") || p.includes("ajuda")) {
    return `🧭 **Como Navegar no VendaFácil SaaS:**\n\n• **Dashboard:** Resumo executivo, faturamento do dia, lucros e gráficos.\n• **Vendas (PDV):** Balcão de venda rápida de alta velocidade.\n• **Produtos & Stock:** Cadastro de itens, preços de custo/venda e alertas de reposição.\n• **Clientes & Fiado:** Carteira de compradores e cobrança por WhatsApp.\n• **Caixa & Despesas:** Entradas diárias e custos operacionais.\n• **Relatórios:** Margem de lucro líquido e produtos mais rentáveis.\n• **Assistente IA 🤖:** Estou sempre aqui para analisar os seus números e tirar dúvidas!`;
  }

  if (p.includes("quanto vendi") || p.includes("vendas este mês") || p.includes("venda")) {
    return `📊 **Vendas da ${summary.companyName}:**\n\n• **Vendas de Hoje:** ${summary.totalSalesToday.toLocaleString('pt-PT')} ${curr}\n• **Total deste Mês:** ${summary.totalSalesMonth.toLocaleString('pt-PT')} ${curr}\n• **Mês Anterior:** ${summary.totalSalesLastMonth.toLocaleString('pt-PT')} ${curr}\n\n💡 *Dica:* O seu ritmo atual indica uma boa movimentação. Mantenha o controlo diário no caixa!`;
  }

  if (p.includes("lucro") || p.includes("mais lucro") || p.includes("margem")) {
    const top = summary.bestSellingProducts[0];
    return `💰 **Análise de Lucro:**\n\n• **Lucro Total no Mês:** ${summary.totalProfitMonth.toLocaleString('pt-PT')} ${curr}\n• **Produto mais lucrativo:** ${top ? `${top.name} (gerou ${top.profit.toLocaleString('pt-PT')} ${curr} em lucro)` : 'Sem dados suficientes'}\n\n💡 *Recomendação:* Foque em manter disponibilidade constante dos produtos com maior margem unitária.`;
  }

  if (p.includes("repor") || p.includes("stock") || p.includes("baixo")) {
    if (summary.lowStockProducts.length === 0) {
      return `✅ **Stock Saudável:** Todos os seus produtos estão acima do nível mínimo de stock configurado.`;
    }
    const items = summary.lowStockProducts
      .map(p => `• **${p.name}:** Restam apenas ${p.currentStock} ${p.unit} (Mínimo: ${p.minStock} ${p.unit})`)
      .join('\n');
    return `⚠️ **Produtos com Stock Baixo para Reposição:**\n\n${items}\n\n🛒 *Ação recomendada:* Faça o pedido aos fornecedores para evitar ruptura de stock.`;
  }

  if (p.includes("receber") || p.includes("fiado") || p.includes("dívida")) {
    return `💳 **Contas a Receber (Fiado):**\n\n• **Total Pendente:** ${summary.totalReceivables.toLocaleString('pt-PT')} ${curr}\n• **Clientes pendentes:** ${summary.pendingReceivables.length} contas em aberto\n\n📲 *Dica VendaFácil:* Use o botão de partilha WhatsApp no módulo de Fiado para enviar lembretes amigáveis de pagamento aos seus clientes.`;
  }

  if (p.includes("gastei") || p.includes("despesa")) {
    return `📉 **Despesas do Mês:**\n\n• **Total de Despesas:** ${summary.totalExpensesMonth.toLocaleString('pt-PT')} ${curr}\n• **Lucro Líquido Estimado:** ${(summary.totalProfitMonth - summary.totalExpensesMonth).toLocaleString('pt-PT')} ${curr}\n\n💡 Monitore principalmente custos recorrentes (energia, transporte e salários) para maximizar o resultado líquido.`;
  }

  return `🤖 **Análise do Seu Negócio (${summary.companyName}):**\n\n• **Vendas do Mês:** ${summary.totalSalesMonth.toLocaleString('pt-PT')} ${curr}\n• **Lucro Estimado:** ${summary.totalProfitMonth.toLocaleString('pt-PT')} ${curr}\n• **Despesas:** ${summary.totalExpensesMonth.toLocaleString('pt-PT')} ${curr}\n• **Valores a Receber:** ${summary.totalReceivables.toLocaleString('pt-PT')} ${curr}\n• **Produtos em Alerta de Stock:** ${summary.lowStockProducts.length} itens\n\nO seu negócio está ativo e com dados organizados. Como posso ajudar com mais detalhes?`;
}
