# UI/UX Spec Vendly MVP

Documento de referência para migrar o MVP atual do Vendly para uma versão SaaS em Next.js mantendo máxima fidelidade visual e comportamental.

Fonte principal: código atual do MVP (`index.html`, `assets/css/styles.css`, `src/vitrine/modules/*.js`, `src/dashboard/index.html`, `src/dashboard/modules/*.js`, `src/dashboard/modules/cashflow/*.js`). Prints devem ser usados apenas como conferência visual complementar, sem reinterpretar o estilo.

## 1. Visão Geral da Identidade Visual

O Vendly MVP usa uma identidade visual limpa, operacional e direta, baseada em Tailwind via CDN, fonte Inter e componentes de alta legibilidade.

A vitrine tem aparência de loja premium minimalista: fundo cinza muito claro, áreas brancas, header sticky discreto, banner visual grande, hero centralizado e cards de produto com destaque para imagem, preço e ações.

O dashboard tem aparência SaaS operacional densa: sidebar fixa, topbar compacta, cards brancos, bordas claras, sombras sutis, muitos labels pequenos em uppercase, ícones Font Awesome e cores semânticas para status financeiro, estoque e ações.

Princípios visuais atuais:

- Fundo geral claro: `bg-gray-50`.
- Superfícies primárias brancas: `bg-white`.
- Texto principal quase preto: `text-gray-900` / `#111827`.
- Hierarquia por peso tipográfico, uppercase e tracking, não por decoração pesada.
- Bordas claras em praticamente todos os blocos: `border-gray-100`, `border-gray-200`, `#f1f3f5`.
- Sombras suaves: `shadow-sm`, `shadow-xl`, `shadow-2xl` apenas para modais/drawers.
- Interações sutis: hover com leve escurecimento, shadow ou `translateY`.
- Ícones Font Awesome como linguagem visual padrão.

## 2. Paleta de Cores Usada

### Base neutra

- Página: `#f9fafb` (`gray-50`).
- Cards/superfícies: `#ffffff`.
- Texto principal: `#111827` (`gray-900`).
- Texto secundário: `#374151`, `#4b5563`, `#6b7280`.
- Texto auxiliar/muted: `#9ca3af`.
- Bordas leves: `#f3f4f6`, `#f1f3f5`, `#e5e7eb`.
- Fundo de controles: `#f9fafb`, `#f8f9fa`, `#f3f4f6`.

### Primária e destaque

- Primária CSS global da vitrine: `--color-primary: #1e40af`.
- Primária clara: `#3b82f6`.
- Dashboard usa muito indigo: `#4f46e5`, `#6366f1`, `#818cf8`.
- Botões escuros principais da vitrine e modais: `#111827`, hover `#374151`.
- Alguns CTAs dashboard: `#4f46e5`, `#6366f1`, `#2563eb`.

### Semânticas

- Sucesso/entrada/lucro: `#059669`, `#10b981`, `#22c55e`, fundos `#ecfdf5`, `#dcfce7`.
- Erro/saída/perda: `#dc2626`, `#ef4444`, `#f43f5e`, fundos `#fef2f2`, `#fee2e2`.
- Alerta/pendente/estoque baixo: `#d97706`, `#f59e0b`, `#eab308`, fundos `#fffbeb`, `#fef3c7`.
- Azul informativo/patrimônio: `#2563eb`, `#3b82f6`, fundos `#eff6ff`, `#dbeafe`.
- Roxo de métricas/semionovo/filtros: `#7c3aed`, `#6d28d9`, fundos `#faf5ff`.

### Gradientes existentes

Manter gradientes apenas onde já existem:

- Onboarding icon: `linear-gradient(135deg, #111827 0%, #374151 100%)`.
- Cards financeiros cashflow: pequenas barras superiores com gradientes por tipo.
- Botões do cashflow:
  - Entrada: `#059669 -> #10b981`.
  - Saída: `#dc2626 -> #ef4444`.
  - Caixa inicial: `#0d9488 -> #14b8a6`.
- Cards especiais do dashboard: `from-green-50 to-white`, `from-indigo-700 to-blue-800`, `from-gray-900 to-gray-800`.

Não transformar a UI em um tema gradient-heavy. Gradiente é exceção, não regra.

## 3. Tipografia

Fonte padrão:

- `Inter`, com fallback `system-ui, sans-serif`.
- A vitrine configura `fontFamily.sans: ['Inter', 'system-ui', 'sans-serif']`.
- O dashboard importa Inter do Google Fonts com pesos `300,400,500,600,700`.

Pesos recorrentes:

- Texto comum: `400`/`500`.
- Botões: `600`/`700`.
- Labels, chips e badges: `700`, `800`, `900`, frequentemente uppercase.
- KPIs e números importantes: `700`, `800`, `900`.

Tamanhos recorrentes:

- Vitrine hero: `text-4xl sm:text-5xl lg:text-6xl`, `font-bold`, `tracking-tight`.
- Vitrine produto nome: `text-base`, `font-medium`.
- Vitrine preço: `text-2xl`, `font-bold`.
- Dashboard títulos de seção: `text-2xl`, `font-bold` ou `font-extrabold`, `tracking-tight`.
- Dashboard labels pequenos: `text-[8px]`, `text-[9px]`, `text-[10px]`, uppercase, `tracking-wider`/`tracking-widest`.
- Dashboard valores de card: `text-lg`, `text-xl`, `text-2xl` ou `22px` no cashflow.
- Tabelas: `text-sm` no corpo; cabeçalhos `text-[10px] uppercase font-bold/font-black`.

Regras:

- Não trocar a fonte.
- Não aumentar dramaticamente o tamanho geral do dashboard. Ele é propositalmente compacto.
- Preservar uppercase e tracking nos rótulos operacionais.
- Preservar números financeiros em peso alto e cores semânticas.

## 4. Espaçamentos

Escala predominante baseada em Tailwind:

- Containers vitrine: `max-w-7xl`, `px-4 sm:px-6 lg:px-8`.
- Header vitrine: `py-3.5`.
- Hero vitrine: `py-12 sm:py-16`.
- Main vitrine: `py-16`.
- Grid vitrine: `gap-8`.
- Cards vitrine: conteúdo `p-6`, `space-y-4`.
- Dashboard main: `px-4 sm:px-6 lg:px-8 pt-6 pb-12`.
- Dashboard tabs: `space-y-6`.
- Cards dashboard: `p-4`, `p-5`, `p-6`.
- Toolbars: `p-3 sm:p-4`, `gap-3`, `gap-4`.
- Tabelas: cabeçalho `px-6 py-4/5`, linhas `py-3/4`.
- Modais: header/footer `px-5/6 py-3/4`, corpo `p-5/6/8`.

Regras:

- Vitrine deve respirar mais que o dashboard.
- Dashboard deve permanecer denso, com grids compactos e muitos elementos por tela.
- Mobile reduz padding, mas não muda a hierarquia.
- Preservar `safe-area-inset-bottom` nos footers sticky de modais mobile.

## 5. Bordas, Sombras e Radius

Radius recorrente:

- Inputs e botões simples vitrine: `rounded-lg` (`8px`).
- Botão carrinho/header: `rounded-xl` (`12px`).
- Cards vitrine: classe CSS `.product-card` usa `0.75rem`, mas o card renderizado aplica `rounded-2xl`.
- Cards dashboard: geralmente `rounded-xl` ou `rounded-2xl`.
- Cashflow cards: `18px`.
- Modais e drawers: `rounded-2xl`, `rounded-3xl` em alguns modais de dashboard.
- Badges pequenos: `rounded`, `rounded-md`, `rounded-full`.

Bordas:

- Cards e containers: `border border-gray-100/200`.
- Inputs: `border-gray-200` ou `border-gray-100`.
- Estados ativos: borda escura `border-gray-900`, indigo `border-indigo-500`, verde/vermelho/amarelo semântico.
- Cards glass: `border: 1px solid rgba(229, 231, 235, 0.5)`.

Sombras:

- Cards comuns: `shadow-sm`.
- Cards vitrine hover: `hover:shadow-xl`, CSS `0 8px 24px rgba(0,0,0,0.08)`.
- Card-hover genérico: hover `translateY(-8px)` e `0 20px 40px rgba(0,0,0,0.1)`.
- Modais/drawers: `shadow-2xl`.
- Sidebar mobile: `4px 0 24px rgba(0,0,0,.15)`.
- Driver/onboarding: sombras mais fortes, mas só nesses overlays.

## 6. Layout da Vitrine

Estrutura:

1. Header sticky no topo:
   - `bg-white/95`, `backdrop-blur`, borda inferior `border-gray-100`.
   - Container `max-w-7xl`, flex entre nome da loja e ações.
   - Nome `text-xl font-bold text-gray-900`.
   - Botões à direita: comparar, ajuda circular, carrinho quadrado escuro.

2. Banner carousel:
   - Full width, fundo `#111`.
   - Mobile quadrado `aspect-ratio: 1/1`.
   - Desktop altura fixa `400px`.
   - Imagens `object-fit: cover`.
   - Overlay inferior preto translúcido em gradiente.
   - Dots brancos pequenos centralizados.
   - Setas circulares translúcidas com blur.

3. Hero:
   - Fundo branco.
   - Texto centralizado.
   - H2 grande, bold, `tracking-tight`.
   - Palavra "Black" com typewriter.
   - Subtexto cinza.
   - CTA escuro `bg-gray-900`, `rounded-lg`, padding largo.

4. Filtros do catálogo:
   - Uma linha no desktop, coluna no mobile.
   - Search flexível + selects.
   - Inputs brancos, borda `gray-200`, `rounded-lg`, foco com ring `gray-900`.

5. Produtos:
   - Grid: `grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
   - Loading skeleton segue a mesma grade.
   - Cards com imagem quadrada e informações abaixo.

6. Carrinho:
   - Painel lateral fixo à direita, `max-width: 448px`.
   - Overlay `bg-black/40`.
   - Conteúdo em coluna: header, lista com scroll, footer com total e ações.

## 7. Layout do Dashboard

Estrutura principal:

- Sidebar fixa desktop com largura `230px`; colapsada `68px`.
- Main wrapper com margem esquerda `lg:ml-[230px]`, ajustável quando sidebar colapsa.
- Topbar sticky branca, borda inferior `gray-200`.
- Conteúdo principal em `px-4 sm:px-6 lg:px-8 pt-6 pb-12`.
- Tabs principais são conteúdos ocultos/visíveis (`tab-content`) com `space-y-6`.

Sidebar:

- Fundo branco, altura total.
- Navegação agrupada por seções com labels minúsculos uppercase (`text-[9px] font-black tracking-[0.2em]`).
- Itens com ícone e label: `px-3.5 py-2.5 rounded-xl text-sm`.
- Estado inativo: `text-gray-500`, hover `bg-gray-50 text-gray-700`.
- Estado ativo via JS: `text-gray-900 bg-gray-100 font-semibold`.
- Colapsada: só ícones, tooltip escuro ao hover.
- Mobile: sidebar entra da esquerda (`translateX`), ocupa `80vw`, max `300px`, overlay escuro com blur.

Topbar:

- Saudação compacta com ícone em card pequeno branco.
- Filtros globais inline no desktop e em segunda linha no mobile.
- Botão refresh quadrado arredondado.
- Inputs de data compactos.

Áreas principais:

- Vendas/Histórico: KPIs no topo, toolbar premium com busca/filtros/view toggle, tabela ou cards.
- Fluxo de Caixa: renderizado por template modular, com header, ações, chips de período, cards, filtros tipo, resumo e tabela.
- Estoque: KPIs/alertas, busca, filtros, modo lista/grid, tabela responsiva.
- Compras, Fiado, Métricas e Estratégia mantêm o mesmo vocabulário: cards brancos, bordas claras, labels pequenos, ícones.

## 8. Estilo dos Cards

### Vitrine

Card de produto:

- Fundo branco.
- `rounded-2xl`, overflow hidden, borda `gray-100`.
- Hover: sombra maior e leve subida (`hover:-translate-y-1`).
- Imagem em área `aspect-square`, `bg-gray-50`, imagem `w-4/5 h-4/5 object-contain`.
- Badges absolutos no topo/esquina.
- Conteúdo `p-6 space-y-4`.
- Nome `font-medium text-base`.
- Specs em `text-xs text-gray-500`.
- Separador superior antes de preço: `border-t border-gray-100 pt-4`.
- Preço antigo riscado em cinza, preço atual `text-2xl font-bold`.
- Botões em coluna.

### Dashboard

Card padrão:

- `bg-white`, `border border-gray-200/100`, `rounded-xl` ou `rounded-2xl`, `shadow-sm`.
- Padding normalmente `p-4`, `p-5`, `p-6`.
- Label pequeno, uppercase, cinza.
- Valor em `text-lg` a `text-2xl`, peso bold/black.
- Cores semânticas no valor.

Glass card:

- Classe `.glass-card`: branco com `rgba(255,255,255,0.95)`, blur `10px`, borda translúcida.
- Usar em painéis de analytics, KPIs e seções maiores do dashboard.

Cashflow cards:

- `border-radius: 18px`, `padding: 20px`.
- Barra superior de 3px por tipo.
- Ícone pequeno em quadrado `28px`, radius `9px`.
- Label `10px`, `font-weight:800`, uppercase, tracking `0.08em`.
- Valor `22px`, `font-weight:900`.
- Hover leve: borda mais escura, shadow sutil, `translateY(-2px)`.

## 9. Estilo dos Botões

### Primários escuros

Usados na vitrine e modais:

- Fundo `#111827` / `bg-gray-900`.
- Texto branco.
- Hover `#374151` / `bg-gray-800`.
- Radius `rounded-lg`, `rounded-xl` ou `rounded-2xl` conforme contexto.
- Peso `font-semibold`, `font-bold` ou `font-black`.
- Active pode usar `scale(0.98)` ou `active:scale-95`.

### Primários dashboard

- Indigo `bg-indigo-600 hover:bg-indigo-700`, texto branco.
- Radius geralmente `rounded-xl`.
- Ícone + texto com `gap-2`.
- Shadow leve.

### Secundários

- Fundo `bg-gray-100`, texto `gray-700`, hover `bg-gray-200`.
- Ou fundo branco com borda `gray-200`, hover `gray-50`.

### Chips e filtros

- Chips rápidos: pequenos, uppercase, bold/black, radius alto.
- Estado inativo: branco/cinza claro e texto cinza.
- Estado ativo: indigo ou semântico, texto branco, sombra.
- Cashflow chips: `border-radius: 10px`, `font-size: 11px`, ativo `bg #111827`.

### Botões de ícone

- Dimensões fixas frequentes: `w-7 h-7`, `w-8 h-8`, `w-9 h-9`, `w-10 h-10`.
- Radius `rounded-lg`, `rounded-xl` ou `rounded-full`.
- Ícones Font Awesome.
- Cores de ação:
  - Editar: indigo.
  - Excluir: vermelho.
  - Ativar/ver: verde/cinza.
  - Refresh/config: cinza.

## 10. Estilo dos Formulários

Inputs padrão vitrine/login:

- `px-4 py-3`, fundo branco ou `gray-50`.
- Borda `gray-200`.
- `rounded-lg`.
- Foco: `focus:outline-none focus:ring-2 focus:ring-gray-900` na vitrine/login.

Inputs dashboard:

- Compactos, muitas vezes `text-sm` ou `text-xs`.
- `rounded-lg`, `rounded-xl` ou `rounded-2xl`.
- Borda `gray-100/200`.
- Fundo `white`, `gray-50`, ou `gray-50/50`.
- Foco: indigo (`focus:ring-indigo-500` ou ring translúcido `indigo-500/10`).

Labels:

- Formulários simples: `text-xs/text-sm font-semibold text-gray-600`.
- Modais/drawers operacionais: labels absolutos pequenos (`text-[8px] font-black uppercase tracking-widest`) dentro do campo.
- Cashflow: `.cf-label` com `10px`, `font-weight:800`, uppercase, `#9ca3af`.

Validação:

- Erros em boxes `bg-red-50 border-red-100/200 rounded-xl`, texto vermelho.
- Campos inválidos adicionam borda/ring vermelho em alguns fluxos.

Toggles:

- Toggle publicar vitrine: checkbox escondido, trilho `w-11 h-6 bg-gray-200 rounded-full`, knob branco `h-5 w-5`, ativo `bg-indigo-600`.

Uploads/imagens:

- Área de upload com borda tracejada `border-2 border-dashed border-gray-200`, `rounded-2xl`, hover `border-indigo-400 bg-indigo-50/30`.

## 11. Estilo das Tabelas

Tabelas desktop:

- Largura total, `text-left`, `border-collapse`.
- Container branco com borda, radius e overflow hidden.
- Cabeçalho:
  - Fundo `bg-gray-50` ou `bg-gray-50/80`.
  - Texto `text-gray-500` ou `text-gray-400`.
  - `text-[10px] uppercase font-bold/font-black tracking-wider/widest`.
  - Padding `p-4`, `px-6 py-4/5`.
  - Borda inferior `border-gray-100`.
- Corpo:
  - `text-sm`.
  - Linhas separadas por `divide-y divide-gray-100/50`.
  - Hover `bg-gray-50/50` ou `#f8fafc`.
  - Valores financeiros alinhados à direita quando aplicável.
  - Ações centralizadas em botões pequenos de ícone.

Tabelas mobile:

- Cabeçalho oculto.
- `tbody` vira coluna com gap.
- Cada `tr` vira card:
  - Fundo `#f9fafb`.
  - Borda `#e5e7eb`.
  - Radius `14px`.
  - Padding `16px`.
  - Shadow `0 1px 3px rgba(0,0,0,0.04)`.
- Células sem padding de tabela, texto alinhado à esquerda.
- Algumas tabelas usam grid 2 colunas para compactar dados.

## 12. Estilo dos Modais

### Vitrine: detalhe de produto

- Overlay `fixed inset-0 bg-black/50`, `backdrop-filter: blur(4px)`.
- Mobile: modal bottom sheet (`items-end`, `rounded-t-2xl`, largura total).
- Desktop: centralizado, `max-w-4xl`, `md:rounded-2xl`.
- Altura máxima `90dvh`.
- Header fixo com título uppercase pequeno e botão fechar circular.
- Conteúdo scrollável.
- Layout desktop em duas colunas: imagem 50%, informações 50%.
- Footer sticky com ação principal "Eu Quero" e secundária "Comparar"; usa safe area no mobile.

### Vitrine: comparação

- Overlay `bg-black/40`.
- Caixa branca `rounded-2xl shadow-2xl max-w-7xl max-h-[90vh]`.
- Header sticky com título grande e botão fechar.
- Conteúdo em tabela horizontal quando necessário.

### Dashboard: modais centralizados

- Overlay `bg-gray-900/60` ou `rgba(0,0,0,.5/.6)` com blur.
- Caixa branca `rounded-2xl`/`rounded-3xl`, `shadow-2xl`.
- Headers com ícones em quadrados/círculos coloridos.
- Footer com botões lado a lado.
- Corpo com `max-h` e scroll.

### Dashboard: drawers laterais

- Fixos à direita, altura total, `max-w-[340px]`, `max-w-[400px]`, `max-w-lg` ou `max-w-2xl`.
- Fundo branco, `shadow-2xl`.
- Overlay preto leve `bg-black/20` com blur.
- Animação por `translateX(100%)`/`translateX(0)`.
- Usados para filtros, edição de pedido, detalhes de fiado e nova dívida.

### Confirmações

- Caixa pequena `max-w-sm`, `rounded-2xl`, ícone grande circular, texto centralizado.
- Ações em footer separado por borda.
- Excluir usa vermelho forte.

## 13. Comportamento Mobile

Vitrine:

- Header permanece sticky.
- Banner fica quadrado 1:1; desktop volta para 400px de altura.
- Filtros do catálogo empilham em coluna.
- Grid de produtos vira 1 coluna abaixo de `sm`.
- Modal de produto vira bottom sheet com header/footer fixos e conteúdo rolável.
- Carrinho ocupa largura total até `max-width:448px`.
- Toast de comparação aparece como barra fixa no rodapé, com safe area.

Dashboard:

- Sidebar vira drawer lateral, com overlay escuro/blur e scroll lock no body.
- Topbar fica compacta; filtros globais descem para uma segunda linha.
- Cards KPI usam grids `grid-cols-2` em muitos módulos.
- Tabelas viram cards mobile, escondendo `thead`.
- Ações móveis de estoque aparecem no topo do card/linha.
- Drawers continuam laterais quando apropriado, mas ocupam largura total até o max definido.
- Botões de ação precisam manter alvos de toque perto de 40px quando principais.

Breakpoints principais:

- `sm`: 640px.
- `md`: 768px.
- `lg`: 1024px.
- `xl`: 1280px.

## 14. Componentes Reutilizáveis

Componentes a preservar na nova stack:

- `PageShellVitrine`: header sticky + banner + hero + catalog container.
- `ProductCard`: card branco com imagem quadrada, badges, specs, preço, CTA e comparar.
- `ProductModal`: bottom sheet/mobile + modal duas colunas/desktop.
- `CartDrawer`: painel direito com overlay, lista e checkout.
- `CompareModal` e `CompareToast`.
- `DashboardShell`: sidebar responsiva + topbar + content area.
- `SidebarNavItem`: ícone, label, badge opcional, tooltip quando colapsado.
- `DashboardKpiCard`: card branco com label uppercase e valor semântico.
- `GlassCard`: card com fundo branco translúcido e blur.
- `ToolbarPremium`: busca + filtros + view toggle.
- `QuickFilterChip` e `ActiveFilterTag`.
- `TableResponsive`: desktop table, mobile card rows.
- `Drawer`: overlay + painel direito animado.
- `ModalDialog`: overlay blur + caixa central.
- `CashflowCard`, `CashflowChip`, `CashflowActionButton`, `CashflowBadge`.
- `Toast` e `NotificationStack`.
- `SkeletonCard` e shimmer.
- `ImageUploadSlot`.
- `ToggleSwitch`.
- `IconButton`.

## 15. Regras de Responsividade

- Preservar exatamente os pontos de quebra usados pelo Tailwind atual.
- Não transformar dashboard em layout espaçado estilo landing page.
- Não substituir tabelas mobile por tabelas horizontais quando o MVP usa cards.
- Não remover sidebar colapsável no desktop.
- Não remover drawer de sidebar no mobile.
- Não alterar grid da vitrine:
  - 1 coluna mobile.
  - 2 colunas `sm`.
  - 3 colunas `lg`.
  - 4 colunas `xl`.
- Não alterar proporção do banner:
  - Mobile 1:1.
  - Desktop 400px de altura.
- Não alterar proporção da imagem do card de produto:
  - Área quadrada.
  - Imagem `object-contain`, aproximadamente 80% da área.
- Modais de produto devem manter footer de ação sempre visível.
- Preservar safe areas em bottom sheets e barras fixas.

## 16. O Que NÃO Deve Ser Alterado na Migração

Não alterar:

- A fonte Inter.
- A predominância de branco, cinzas claros e texto escuro.
- O header sticky da vitrine.
- O banner carousel e sua proporção mobile/desktop.
- O hero centralizado e sua hierarquia.
- A grade e o formato dos cards de produto.
- O CTA escuro principal da vitrine.
- O comportamento de modal bottom sheet no mobile.
- O carrinho como drawer lateral.
- A sidebar fixa/colapsável do dashboard.
- A topbar sticky compacta do dashboard.
- A densidade operacional do dashboard.
- Os cards brancos/glass com bordas claras e shadows sutis.
- Labels pequenos em uppercase no dashboard.
- Cores semânticas de status financeiro, estoque e alertas.
- Tabelas desktop e transformação para cards no mobile.
- Drawers laterais para filtros/edição/detalhes.
- Modais com overlay escuro + blur.
- Font Awesome como família de ícones visualmente dominante.
- Microinterações existentes: hover, translateY leve, active scale, shimmer, fade/slide.
- Textos e hierarquias visuais que comunicam operação, estoque, vendas e financeiro.

Evitar explicitamente:

- Redesign com nova paleta.
- Tema escuro.
- Gradientes decorativos fora dos pontos já existentes.
- Cards grandes demais ou landing-page style no dashboard.
- Radius drasticamente diferente.
- Sombras mais pesadas em cards comuns.
- Trocar tabelas por layouts novos no desktop.
- Trocar a vitrine para visual marketplace genérico.
- Criar navegação nova ou mudar hierarquia de abas.
- Remover badges/labels/status que hoje ajudam a leitura operacional.

## 17. Checklist Para Validar Fidelidade ao MVP

### Vitrine

- [ ] Header é sticky, branco translúcido, com borda inferior clara.
- [ ] Nome da loja aparece em `text-xl font-bold`.
- [ ] Botão do carrinho é escuro, quadrado arredondado, com badge vermelho.
- [ ] Banner é quadrado no mobile e 400px no desktop.
- [ ] Banner usa `object-cover`, overlay inferior e dots/setas no mesmo estilo.
- [ ] Hero é centralizado, branco, com H1 grande e CTA escuro.
- [ ] Filtros empilham no mobile e ficam em linha no desktop.
- [ ] Grid de produtos segue 1/2/3/4 colunas por breakpoint.
- [ ] Card de produto tem imagem quadrada, produto centralizado, badges absolutos e preço antigo riscado.
- [ ] CTA principal do card usa `.btn-solid`/azul primário global, não um novo estilo.
- [ ] Modal de produto é bottom sheet no mobile e duas colunas no desktop.
- [ ] Footer do modal de produto permanece fixo com "Eu Quero" e "Comparar".
- [ ] Carrinho abre como painel lateral com overlay e footer de total.

### Dashboard

- [ ] Sidebar desktop tem 230px e colapsa para 68px.
- [ ] Sidebar mobile abre da esquerda com overlay escuro/blur.
- [ ] Topbar é sticky, branca e compacta.
- [ ] Conteúdo usa `px-4 sm:px-6 lg:px-8 pt-6 pb-12`.
- [ ] Cards KPI mantêm fundo branco, bordas claras, radius e shadow-sm.
- [ ] Labels do dashboard são pequenos, uppercase e com tracking.
- [ ] Valores financeiros mantêm cores semânticas.
- [ ] Chips ativos/inativos preservam cores, radius e pesos.
- [ ] Tabelas desktop preservam cabeçalho pequeno uppercase e linhas densas.
- [ ] Tabelas mobile viram cards com fundo `#f9fafb`, borda `#e5e7eb`, radius `14px`.
- [ ] Drawers laterais mantêm overlay, shadow-2xl e animação horizontal.
- [ ] Modais centralizados mantêm overlay escuro com blur, radius grande e headers com ícones.
- [ ] Cashflow preserva cards com barra superior colorida de 3px.
- [ ] Estoque preserva lista/grid, badges minúsculos e inputs compactos.
- [ ] Notificações e toasts mantêm canto direito, fundo escuro/branco e animações atuais.

### Geral

- [ ] A fonte final é Inter em todas as telas.
- [ ] Não há troca de paleta visual.
- [ ] Não há aumento excessivo de espaçamentos.
- [ ] Não há mudança de hierarquia visual.
- [ ] Ícones continuam em Font Awesome ou equivalentes visualmente idênticos.
- [ ] Estados hover/active/focus estão presentes e discretos.
- [ ] Skeletons continuam com shimmer cinza.
- [ ] A UI nova parece o mesmo produto, apenas reimplementado em Next.js.

