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

function isTransientOrDemandError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.status || err.code || err.statusCode;
  return (
    code === 503 ||
    code === 429 ||
    code === 500 ||
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('spikes in demand') ||
    msg.includes('overloaded') ||
    msg.includes('resource has been exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  );
}

export function extractHeuristicallyFromTranscript(
  transcript?: string,
  existingCategories: string[] = []
): ExtractedProductAiResult {
  if (!transcript || !transcript.trim()) {
    return {
      name: 'Novo Produto',
      costPrice: 0,
      salePrice: 0,
      currentStock: 1,
      minStock: 5,
      unit: 'un',
      confidenceNotes: 'Preenchimento padrão. O servidor de IA estava sob alta demanda temporária.',
    };
  }

  const text = transcript.trim();
  let name = '';
  let categoryName = '';
  let costPrice = 0;
  let salePrice = 0;
  let currentStock = 1;
  let minStock = 5;
  let unit = 'un';
  let expirationDate: string | undefined = undefined;
  let barcode: string | undefined = undefined;

  const parseNum = (val: string): number => {
    if (!val) return 0;
    let clean = val.replace(/[^\d,\.]/g, '').trim();
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes('.')) {
      const parts = clean.split('.');
      if (parts[1] && parts[1].length === 3) {
        clean = parts.join('');
      }
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    return parseFloat(clean) || 0;
  };

  // 1. Cost Price (comprei a..., custo..., paguei...)
  const costMatch = text.match(/(?:comprei(?:\s+a)?|custo(?:\s*(?:de|é|foi)?)?|preço\s+de\s+custo|preço\s+de\s+compra|paguei)\s*(?:de)?\s*([0-9\.\s,]+?)(?:\s*(?:kz|kwanzas|kzs|e\s+vou|e\s+vender|,|\.|$))/i);
  if (costMatch && costMatch[1]) {
    costPrice = parseNum(costMatch[1]);
  }

  // 2. Sale Price (vender a..., venda..., preço de venda...)
  const saleMatch = text.match(/(?:vender(?:\s+a)?|vou\s+vender(?:\s+a)?|venda(?:\s*(?:de|é|a)?)?|preço\s+de\s+venda)\s*(?:de)?\s*([0-9\.\s,]+?)(?:\s*(?:kz|kwanzas|kzs|,|\.|$|tenho))/i);
  if (saleMatch && saleMatch[1]) {
    salePrice = parseNum(saleMatch[1]);
  }

  // 3. Current Stock
  const stockMatch = text.match(/(?:tenho|stock\s*(?:actual|atual)?(?:\s*de)?|quantidade(?:\s*de)?)\s*([0-9]+)\s*(latas?|garrafas?|caixas?|pacotes?|unidades?|un|fardos?|sacos?|kg|litros?)?/i);
  if (stockMatch && stockMatch[1]) {
    currentStock = parseInt(stockMatch[1], 10) || 1;
    if (stockMatch[2]) {
      const rawUnit = stockMatch[2].toLowerCase();
      if (rawUnit.startsWith('lata')) unit = 'un';
      else if (rawUnit.startsWith('garrafa')) unit = 'un';
      else if (rawUnit.startsWith('caixa')) unit = 'cx';
      else if (rawUnit.startsWith('pacote')) unit = 'pct';
      else if (rawUnit.startsWith('fardo')) unit = 'fardo';
      else if (rawUnit.startsWith('kg')) unit = 'kg';
      else if (rawUnit.startsWith('litro')) unit = 'l';
    }
  }

  // 4. Min stock
  const minMatch = text.match(/(?:m[íi]nimo|limite(?:\s*m[íi]nimo)?|alerta(?:\s*de)?)\s*(?:de)?\s*([0-9]+)/i);
  if (minMatch && minMatch[1]) {
    minStock = parseInt(minMatch[1], 10) || 5;
  }

  // 5. Expiration date
  const expIsoMatch = text.match(/\b(202[4-9]|203[0-9])[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12][0-9]|3[01])\b/);
  const expPtMatch = text.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/](0?[1-9]|1[0-2])[-/](202[4-9]|203[0-9])\b/);
  const expTextMatch = text.match(/validade\s*(?:(?:é|de|em|até)\s*)?([0-9]{1,2})\s*(?:de)?\s*([a-zçãé]+)\s*(?:de)?\s*(202[4-9]|203[0-9])/i);

  if (expIsoMatch) {
    expirationDate = `${expIsoMatch[1]}-${expIsoMatch[2].padStart(2, '0')}-${expIsoMatch[3].padStart(2, '0')}`;
  } else if (expPtMatch) {
    expirationDate = `${expPtMatch[3]}-${expPtMatch[2].padStart(2, '0')}-${expPtMatch[1].padStart(2, '0')}`;
  } else if (expTextMatch) {
    const day = expTextMatch[1].padStart(2, '0');
    const monthName = expTextMatch[2].toLowerCase();
    const year = expTextMatch[3];
    const monthsMap: Record<string, string> = {
      janeiro: '01', fevereiro: '02', marco: '03', março: '03',
      abril: '04', maio: '05', junho: '06', julho: '07',
      agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
    };
    const month = monthsMap[monthName] || '12';
    expirationDate = `${year}-${month}-${day}`;
  }

  // 6. Category
  const catMatch = text.match(/categoria\s*(?:de|é)?\s*([a-zA-ZÀ-ÿ\s]+?)(?:,|\.|\s+comprei|\s+custo|\s+vender|\s+tenho|$)/i);
  if (catMatch && catMatch[1]) {
    categoryName = catMatch[1].trim();
  } else {
    for (const cat of existingCategories) {
      if (text.toLowerCase().includes(cat.toLowerCase())) {
        categoryName = cat;
        break;
      }
    }
  }

  // 7. Product Name
  let cleanText = text
    .replace(/^(?:cadastrar|registar|adicionar|inserir|novo\s+produto)\s+/i, '')
    .trim();
  
  const cutOffIndex = cleanText.search(/,\s*(?:categoria|comprei|custo|vender|tenho|stock|validade|m[íi]nimo)|(?:\s+categoria\s+)|(?:\s+comprei\s+)/i);
  if (cutOffIndex > 0) {
    name = cleanText.substring(0, cutOffIndex).trim();
  } else {
    const commaIndex = cleanText.indexOf(',');
    if (commaIndex > 0 && commaIndex < 50) {
      name = cleanText.substring(0, commaIndex).trim();
    } else {
      name = cleanText.slice(0, 45).trim();
    }
  }

  name = name.replace(/^[,\.\s]+|[,\.\s]+$/g, '');
  if (!name) name = 'Produto Registado';

  return {
    name,
    categoryName: categoryName || 'Geral',
    costPrice,
    salePrice,
    currentStock,
    minStock,
    unit,
    expirationDate,
    barcode,
    confidenceNotes: 'Dados extraídos diretamente da voz. (Nota: os servidores da IA estavam com alta demanda temporária; confira os valores preenchidos).'
  };
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

  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      if (response.text) {
        return response.text;
      }
    } catch (error: any) {
      console.warn(`Gemini assistant com ${model} encontrou erro:`, error?.message || error);
      if (isTransientOrDemandError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
      break;
    }
  }

  return generateFallbackAnalysis(prompt, businessSummary);
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

export interface ExtractedProductAiResult {
  name?: string;
  categoryName?: string;
  costPrice?: number;
  salePrice?: number;
  currentStock?: number;
  minStock?: number;
  unit?: string;
  barcode?: string;
  expirationDate?: string;
  description?: string;
  confidenceNotes?: string;
}

export async function extractProductFromAudioAndImage(params: {
  audioBase64?: string;
  audioMimeType?: string;
  audioTranscript?: string;
  imageBase64?: string;
  imageMimeType?: string;
  existingCategories?: string[];
}): Promise<ExtractedProductAiResult> {
  const ai = getAiClient();
  const {
    audioBase64,
    audioMimeType = 'audio/webm',
    audioTranscript,
    imageBase64,
    imageMimeType = 'image/jpeg',
    existingCategories = []
  } = params;

  if (!ai) {
    // Fallback if no API key
    return {
      name: audioTranscript ? audioTranscript.slice(0, 40) : 'Produto Registado por Voz',
      costPrice: 0,
      salePrice: 0,
      currentStock: 1,
      minStock: 5,
      unit: 'un',
      confidenceNotes: 'Chave de API Gemini não configurada no servidor. Por favor configure a GEMINI_API_KEY.',
    };
  }

  const promptText = `
Você é o assistente inteligente de cadastro de inventário do VendaFácil SaaS para pequenos e médios retalhistas em Angola e mercados de língua portuguesa.
A sua tarefa é extrair com precisão os dados de um novo produto para o catálogo comercial a partir do áudio fornecido (fala do comerciante) e/ou da imagem capturada pela câmara (embalagem, rótulo, preço, data de validade, código de barras).

Categorias existentes na loja: ${existingCategories.length > 0 ? existingCategories.join(', ') : 'Alimentação, Bebidas, Higiene, Beleza, Farmácia, Limpeza, Vestuário, Eletrónicos, Diversos'}.

Campos a extrair organizados:
1. "name": Nome comercial claro e bem formatado (ex: "Leite Nido 400g", "Óleo alimentar Sol 1L", "Paracetamol 500mg Caixa").
2. "categoryName": A categoria mais apropriada (escolha uma das existentes ou crie uma categoria curta adequada).
3. "costPrice": Preço de compra / custo em Kwanzas (apenas número, ex: 1500). Se não mencionado explicitamente, estime proporcionalmente ou deixe 0.
4. "salePrice": Preço de venda ao público em Kwanzas (apenas número, ex: 2000).
5. "currentStock": Quantidade física em stock actual (número, padrão 1 se não dito).
6. "minStock": Stock mínimo para alerta de reposição (número, padrão 5).
7. "unit": Unidade de medida ("un", "kg", "cx", "pct", "l", etc.).
8. "expirationDate": Data de validade/vencimento no formato "YYYY-MM-DD" (extraia da foto da embalagem ou da fala do comerciante; ex: "2027-05-30"). Se não for encontrada, retorne null.
9. "barcode": Código de barras visível no rótulo ou falado (se legível, senão null).
10. "description": Breve descrição informativa se relevante.
11. "confidenceNotes": Um resumo curto em português do que foi detetado e o que foi preenchido (ex: "Identificado leite em pó pela foto e preço de venda de 3.500 Kz falado no áudio").

Retorne estritamente um objeto JSON com as chaves:
{
  "name": string,
  "categoryName": string,
  "costPrice": number,
  "salePrice": number,
  "currentStock": number,
  "minStock": number,
  "unit": string,
  "expirationDate": string | null,
  "barcode": string | null,
  "description": string,
  "confidenceNotes": string
}
`;

  const parts: any[] = [{ text: promptText }];

  if (audioTranscript) {
    parts.push({ text: `Transcrição preliminar da fala: "${audioTranscript}"` });
  }

  if (audioBase64) {
    const cleanAudio = audioBase64.replace(/^data:audio\/[a-z0-9-+.]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: audioMimeType,
        data: cleanAudio,
      },
    });
  }

  if (imageBase64) {
    const cleanImg = imageBase64.replace(/^data:image\/[a-z0-9-+.]+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: imageMimeType,
        data: cleanImg,
      },
    });
  }

  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Erro ao extrair produto com modelo ${model}:`, err?.message || err);

      if (isTransientOrDemandError(err)) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }

      // If audio payload caused an issue, try without raw audio
      if (audioBase64 && (audioTranscript || imageBase64)) {
        try {
          const simplifiedParts: any[] = [{ text: promptText }];
          if (audioTranscript) simplifiedParts.push({ text: `Transcrição da fala: "${audioTranscript}"` });
          if (imageBase64) {
            const cleanImg = imageBase64.replace(/^data:image\/[a-z0-9-+.]+;base64,/, '');
            simplifiedParts.push({ inlineData: { mimeType: imageMimeType, data: cleanImg } });
          }
          const simplifiedResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: { parts: simplifiedParts },
            config: { responseMimeType: "application/json", temperature: 0.2 }
          });
          const text = simplifiedResponse.text || "{}";
          const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        } catch (innerErr) {
          console.warn('Tentativa com partes simplificadas falhou:', innerErr);
        }
      }
    }
  }

  // If all models failed (e.g. 503 high demand across models or network outage),
  // seamlessly use heuristic extraction from transcript so user is not blocked!
  if (audioTranscript && audioTranscript.trim()) {
    console.warn("Utilizando extração heurística por voz devido a indisponibilidade temporária dos servidores da IA.");
    return extractHeuristicallyFromTranscript(audioTranscript, existingCategories);
  }

  console.error("Erro ao extrair produto via Gemini após tentar modelos alternativos:", lastError);
  throw new Error(`Falha temporária no reconhecimento por IA (servidores com alta procura). Por favor tente novamente dentro de instantes.`);
}

