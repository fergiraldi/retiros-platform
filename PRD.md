# PRD — Plataforma de Retiros

Documento de produto para geração de specs. Escrito para ser lido por humano e por gerador de specs: o glossário define o vocabulário, as regras de negócio são numeradas (`RN-xxx`) e referenciadas pelos fluxos.

---

## 1. Visão

**SaaS multi-inquilino** para divulgação, inscrição, cobrança e operação de retiros espirituais. Cada denominação — Homens de Fé, Homens Adoradores, Tabor — é um inquilino independente, com suas centrais espalhadas pelo Brasil, sua identidade visual, seu vocabulário e seu recebimento.

Hoje cada central controla seus encontros em planilhas, grupos de WhatsApp e caderno de anotações. O sistema substitui isso por um fluxo único: o encontro é publicado, a pessoa se inscreve e paga pelo site, a coordenação monta grupos e equipe de servição, conduz o evento seguindo o cronograma e fecha a prestação de contas no domingo.

A plataforma se sustenta por **percentual sobre cada inscrição paga**, retido no split do gateway (seção 8.3).

**Não é objetivo:** rede social, streaming de pregações, app nativo, emissão de nota fiscal, contabilidade formal.

---

## 2. Glossário do domínio

Este vocabulário é obrigatório em código, banco e interface.

| Termo | Definição |
|---|---|
| **Inquilino** (ou Denominação) | Organização cliente da plataforma. Ex.: "Homens de Fé", "Homens Adoradores", "Tabor". Tem identidade visual, vocabulário, subdomínio e recebimento próprios. É a fronteira máxima de isolamento de dados. |
| **Operador** | Quem opera a plataforma (você). Único papel que enxerga mais de um inquilino, e ainda assim sem acesso a dado pessoal (RN-005). |
| **Central** | Unidade organizadora de um inquilino, vinculada a uma cidade/UF. Ex.: "Central de Cascavel-PR" da Homens de Fé. Cada central tem sua própria numeração de encontros. Cidades podem ter centrais de denominações diferentes, sem relação entre si. |
| **Identidade** | Registro global mínimo de uma pessoa física (CPF e nome), compartilhado entre inquilinos apenas para reconhecimento. Não carrega dado de contato nem dado sensível. |
| **Encontro** (ou Retiro) | Edição de um retiro promovido por uma central, com número sequencial próprio. Ex.: "2º Encontro Homens de Fé de Cascavel-PR". |
| **Participante** | Pessoa inscrita para viver o encontro pela primeira vez naquela edição. |
| **Servo** | Pessoa que trabalha no encontro. Paga taxa reduzida (alimentação/hospedagem) e é alocada numa área de servição com uma função. |
| **Área de servição** | Frente de trabalho da equipe: secretaria, pregação, apoio, manutenção, capela, cozinha, recepção, música, fotografia. |
| **Função** | Papel dentro da área: coordenador, vice-coordenador ou membro. |
| **Grupo** | Subdivisão dos participantes durante o encontro (nome + cor + servos responsáveis). |
| **Convidador** | Pessoa que convidou o participante. Pode ou não ser servo do encontro. |
| **Etapa do cronograma** | Bloco de tempo do roteiro (ex.: sexta 19:00 — Recepção e credenciamento). |
| **Tarefa da etapa** | Item operacional a executar dentro da etapa (ex.: conferir crachás, guardar malas). |
| **Inscrição** | Vínculo de uma pessoa a um encontro, na condição de participante ou de servo, com sua situação e sua cobrança. |
| **Taxa** | Valor devido pela inscrição. Difere entre participante e servo. |
| **Prestação de contas** | Fechamento financeiro do encontro: receitas arrecadadas × despesas lançadas. |
| **Rótulo** | Como um inquilino nomeia um conceito do domínio na tela. O domínio é fixo no código (`servo`); o rótulo é configurável (`servo`, `obreiro`, `equipe`). |
| **Taxa da plataforma** | Percentual retido pelo operador sobre cada inscrição paga, via split do gateway. |

---

## 3. Atores e permissões

| Ator | Escopo | Pode |
|---|---|---|
| **Visitante** | Público | Ver encontros publicados, abrir ficha de inscrição, pagar, consultar a própria inscrição por token. |
| **Inscrito** | Própria inscrição | Acompanhar situação, refazer pagamento pendente, atualizar dados até o fechamento das inscrições. |
| **Servo** | Encontro em que serve | Ver seu grupo/área, cronograma, lista dos participantes do seu grupo, marcar tarefas da etapa. |
| **Coordenador de área** | Sua área no encontro | Tudo do servo + gerenciar os servos da própria área e lançar despesas da área. |
| **Coordenador do encontro** | Um encontro | Configurar o encontro, aprovar inscrições, montar grupos e equipe, conduzir cronograma, lançar despesas, fechar prestação de contas. |
| **Admin da central** | Todos os encontros da central | Tudo do coordenador + criar encontros, gerir pessoas da central, configurar taxas e credenciais de pagamento. |
| **Admin da denominação** | Todas as centrais do inquilino | Criar/desativar centrais, consolidar indicadores da denominação, configurar marca, rótulos e recebimento. Não altera dado financeiro de central sem registro em auditoria. |
| **Operador** | Todos os inquilinos | Criar/suspender inquilinos, configurar a taxa da plataforma, dar suporte. **Não enxerga dado pessoal de participante** (RN-005). |

**RN-001** — O isolamento tem dois níveis. Nenhuma consulta atravessa a fronteira do **inquilino**, em hipótese alguma. Dentro do inquilino, o dado é isolado por **central**, e o admin da denominação atravessa essa segunda fronteira.
**RN-002** — Uma pessoa pode ter papéis diferentes em encontros diferentes (participante em um, servo em outro).
**RN-003** — A mesma pessoa física pode existir em mais de um inquilino. Cada inquilino tem o **seu** cadastro dela, com seus dados de contato e seus dados sensíveis. O que é compartilhado é apenas a **identidade** (CPF e nome), para reconhecimento.
**RN-004** — Uma conta de usuário pertence a um inquilino. Servir em duas denominações exige dois acessos distintos — não há troca de contexto entre inquilinos numa mesma sessão.
**RN-005** — O operador tem acesso a métricas, faturamento e dados de configuração, **nunca** a nome, contato ou dado sensível de participante. Suporte que exija ver dado real passa por acesso temporário concedido pelo admin da denominação, com prazo, motivo e registro em auditoria.

---

## 4. Entidades

### 4.0 Inquilino
`id`, `nome`, `slug`, `subdominio`, `dominio_proprio`, `logo`, `cores`, `rotulos`, `taxa_plataforma_percentual`, `situacao`, `contrato_aceito_em`

**RN-006** — `slug` é único na plataforma e define o subdomínio (`homens-de-fe.app.com.br`). Domínio próprio é opcional e depende de verificação de DNS.
**RN-007** — Situações do inquilino: `em_implantacao` → `ativo` → `suspenso` → `encerrado`. Inquilino `suspenso` mantém a área pública em modo leitura e bloqueia novas inscrições; nenhum dado é apagado.
**RN-008** — `rotulos` é um mapa de conceito do domínio para o termo de exibição. Chaves fixas no código, valores livres por inquilino.

### 4.1 Central
`id`, `inquilino_id`, `nome`, `cidade`, `uf`, `slug`, `logo`, `contatos`, `ativa`, `config_pagamento`

**RN-009** — `slug` da central é único **dentro do inquilino**. Duas denominações podem ter, cada uma, sua "central de cascavel".

### 4.2 Identidade
Registro global mínimo, compartilhado entre inquilinos.
`id`, `cpf`, `nome_completo`, `data_nascimento`

**RN-010** — CPF é único na plataforma inteira, nesta tabela. É a chave de reconhecimento entre inquilinos.
**RN-011** — A identidade **não** guarda telefone, e-mail, endereço nem dado sensível. Só o suficiente para dizer "essa pessoa já existe".

### 4.3 Pessoa
Cadastro **por inquilino**, vinculado a uma identidade, reaproveitado entre as centrais e os encontros daquele inquilino.
`id`, `inquilino_id`, `identidade_id`, `central_origem_id`, `nome_completo`, `nome_cracha`, `telefone`, `email`, `endereco`, `estado_civil`, `contato_emergencia_nome`, `contato_emergencia_telefone`, `observacoes`

Dados sensíveis (seção 9): `restricao_alimentar`, `condicao_saude`, `medicamentos_uso_continuo`, `religiao_declarada`.

**RN-012** — Uma identidade tem no máximo uma pessoa por inquilino.
**RN-013** — Ao se inscrever, o CPF informado localiza a identidade global. Se ela existir mas não houver pessoa neste inquilino, o cadastro é criado **do zero**, com os dados da ficha. Nada é copiado de outro inquilino, nem o telefone.
**RN-014** — A pessoa é do inquilino, não da central. `central_origem_id` registra onde ela apareceu pela primeira vez, para relatório; não restringe acesso. Quem viveu o encontro em Cascavel e se mudou para Maringá serve lá sem recadastro.

### 4.4 Encontro
`id`, `inquilino_id`, `central_id`, `numero`, `titulo`, `data_inicio`, `data_fim`, `local_nome`, `local_endereco`, `vagas_participantes`, `vagas_servos`, `taxa_participante`, `taxa_servo`, `inscricoes_abrem_em`, `inscricoes_fecham_em`, `situacao`, `texto_divulgacao`, `imagem_capa`, `publicado`

**RN-020** — `numero` é sequencial e único dentro da central, atribuído automaticamente na criação (`MAX(numero) + 1`), com possibilidade de ajuste manual pelo admin da central para acomodar histórico anterior ao sistema.
**RN-021** — Situações do encontro: `rascunho` → `publicado` → `inscricoes_encerradas` → `em_andamento` → `encerrado`. `cancelado` é acessível a partir de qualquer situação anterior a `encerrado`.
**RN-022** — Só encontro `publicado` aparece na agenda pública.

### 4.5 Inscrição
`id`, `inquilino_id`, `central_id`, `encontro_id`, `pessoa_id`, `tipo` (`participante` | `servo`), `situacao`, `convidador_pessoa_id`, `grupo_id`, `area_servicao_id`, `funcao`, `valor_devido`, `data_inscricao`, `data_checkin`, `token_consulta`

**RN-030** — Situações: `pendente_pagamento` → `confirmada` → `presente`. Ramos: `cancelada`, `lista_espera`, `ausente`.
**RN-031** — Uma pessoa tem no máximo uma inscrição ativa (não cancelada) por encontro.
**RN-032** — A inscrição passa a `confirmada` automaticamente quando o pagamento é aprovado (RN-051).
**RN-033** — Se as vagas do tipo estiverem esgotadas, a inscrição entra como `lista_espera` e nenhuma cobrança é gerada. Ao vagar uma posição, a mais antiga da lista é promovida a `pendente_pagamento` e recebe aviso com prazo para pagar.
**RN-034** — `grupo_id` só se aplica a participante; `area_servicao_id` e `funcao` só a servo.
**RN-035** — Inscrição de servo pode ser criada pela coordenação sem passar pelo site público.

### 4.6 Cobrança
`id`, `inquilino_id`, `central_id`, `inscricao_id`, `gateway_id`, `metodo` (`pix` | `cartao_credito`), `parcelas`, `valor`, `taxa_plataforma`, `situacao`, `qr_code_pix`, `link_pagamento`, `expira_em`, `pago_em`, `payload_gateway`

**RN-040** — Métodos aceitos: Pix à vista e cartão de crédito em até 12x, com parcela mínima configurável por central (padrão R$ 50,00).
**RN-041** — Cobrança Pix expira em 24h; expirada, pode ser regerada pelo inscrito enquanto as inscrições estiverem abertas.
**RN-042** — Nunca trafegar nem armazenar dado de cartão. O pagamento com cartão usa checkout/tokenização do gateway.
**RN-043** — Toda cobrança carrega `taxa_plataforma`, calculada no momento da criação a partir do percentual vigente do inquilino e retida pelo split do gateway (seção 8.3). O valor é congelado na cobrança: mudança de percentual não altera cobrança já criada.

### 4.7 Grupo
`id`, `encontro_id`, `nome`, `cor`, `servos_responsaveis[]`

**RN-045** — A distribuição automática de participantes em grupos equilibra a quantidade por grupo e evita colocar no mesmo grupo pessoas com o mesmo convidador e pessoas do mesmo núcleo familiar. A coordenação pode remanejar manualmente.

### 4.8 Área de servição
`id`, `encontro_id`, `nome`, `descricao`, `vagas`, `coordenador_inscricao_id`

**RN-046** — Cada área tem exatamente um coordenador e no máximo um vice.
**RN-047** — Um servo pertence a uma única área por encontro.
**RN-047a** — O inquilino define seu **catálogo padrão de áreas**, herdado por toda central nova. Denominações organizam a equipe de formas diferentes e não cabe fixar a lista no código.

### 4.9 Etapa do cronograma
`id`, `encontro_id`, `dia`, `hora_inicio`, `duracao_minutos`, `titulo`, `descricao`, `area_responsavel_id`, `responsavel_inscricao_id`, `ordem`

### 4.10 Tarefa da etapa
`id`, `etapa_id`, `descricao`, `area_responsavel_id`, `concluida`, `concluida_por`, `concluida_em`

**RN-048** — O cronograma pode ser criado a partir de um **modelo de cronograma**, mantido no nível do inquilino (roteiro oficial da denominação) ou da central (adaptação local).

### 4.11 Despesa
`id`, `encontro_id`, `area_servicao_id`, `categoria`, `descricao`, `valor`, `data`, `forma_pagamento`, `comprovante_url`, `lancada_por`, `aprovada`

Categorias: alimentação, hospedagem, material, transporte, decoração, som/estrutura, saúde, outros.

**RN-049** — Despesa acima de valor configurável exige comprovante anexado.

---

## 5. Fluxos

### F0 — Implantação de um inquilino
1. Operador cria a denominação: nome, slug, subdomínio, percentual da taxa da plataforma.
2. Admin da denominação recebe convite, aceita o contrato e configura marca (logo, cores), rótulos (RN-008) e catálogo padrão de áreas de servição (RN-047a).
3. Conecta a conta de recebimento ao gateway por OAuth (seção 8.3).
4. Cria as centrais e convida os admins de cada uma.
5. Inquilino passa a `ativo` e o subdomínio entra no ar.

**RN-015** — Inquilino só sai de `em_implantacao` com contrato aceito, marca definida e conta de recebimento conectada. Sem recebimento configurado não há como cobrar inscrição, e um subdomínio no ar sem isso frustra a primeira inscrição.

### F1 — Divulgação e inscrição pública
1. Visitante acessa o subdomínio da denominação e vê a agenda dos encontros publicados de todas as centrais dela.
2. Abre a página do encontro: título numerado, datas, local, texto de divulgação, valor e vagas restantes.
3. Clica em inscrever-se e escolhe **participante** ou **servo** (exibidos com os rótulos do inquilino).
4. Preenche a ficha: dados pessoais, contato de emergência, restrição alimentar, condição de saúde, quem o convidou. Servo também escolhe a área de servição pretendida (preferência, não garantia — RN-047 e alocação final são da coordenação).
5. Aceita o termo de uso e o consentimento de dados (RN-090).
6. Sistema localiza a Identidade pelo CPF (RN-010), cria ou reaproveita a Pessoa **deste inquilino** (RN-013) e cria a Inscrição; se há vaga, gera Cobrança; senão, entra em lista de espera (RN-033).
7. Escolhe Pix ou cartão e paga.
8. Recebe confirmação por e-mail/WhatsApp com o **token de consulta** da inscrição.

**RN-016** — Não existe agenda que cruze denominações. Cada inquilino tem a sua, no seu domínio, com a sua marca. Um site nacional agregador seria outro produto.

### F2 — Confirmação do pagamento
1. Gateway envia webhook de mudança de situação.
2. Sistema valida assinatura do webhook e localiza a cobrança pelo `gateway_id`.
3. Aprovado → cobrança `paga`, inscrição `confirmada` (RN-032), notificação enviada.
4. Recusado/expirado → inscrição segue `pendente_pagamento`, inscrito notificado com link para refazer.

**RN-050** — Webhook é idempotente: reprocessar o mesmo evento não altera estado nem duplica notificação.
**RN-051** — Confirmação é sempre disparada pelo webhook, nunca pelo retorno da tela do navegador.
**RN-052** — Cobrança pendente há mais de 72h sem pagamento libera a vaga e joga a inscrição para o fim da lista de espera, após dois avisos.

### F3 — Cancelamento e reembolso
1. Inscrito solicita cancelamento pelo link da inscrição, ou coordenação cancela.
2. Sistema aplica a política de reembolso da central.
3. Reembolso aprovado gera estorno no gateway e registro na prestação de contas.
4. Vaga liberada dispara a promoção da lista de espera (RN-033).

**RN-060** — Política padrão, configurável por central: cancelamento com mais de 15 dias de antecedência devolve 100%; entre 15 e 7 dias, 50%; com menos de 7 dias, sem reembolso.

### F4 — Montagem da equipe e dos grupos
1. Coordenador do encontro define as áreas de servição e suas vagas.
2. Aloca cada servo confirmado em área e função (RN-046, RN-047).
3. Cria os grupos e roda a distribuição automática dos participantes (RN-045).
4. Ajusta manualmente e publica: cada servo passa a ver seu grupo e sua área.

### F5 — Cronograma e condução do evento
1. Coordenação monta o cronograma a partir de um modelo (RN-048) ou do zero.
2. Cada etapa recebe área responsável e suas tarefas operacionais.
3. Durante o encontro, a coordenação enxerga a etapa atual, a próxima e o percentual de tarefas concluídas.
4. Servos marcam suas tarefas como concluídas.

Roteiro típico da primeira noite, usado como modelo de exemplo:

| Dia | Hora | Etapa | Área |
|---|---|---|---|
| Sexta | 19:00 | Recepção e entrega de credenciais | Recepção |
| Sexta | 19:30 | Guarda das malas e acomodação | Apoio |
| Sexta | 20:00 | Apresentação da equipe | Coordenação |
| Sexta | 21:30 | Dinâmica de integração | Apoio |
| Sexta | 22:00 | Pregação de abertura | Pregação |

### F6 — Credenciamento e check-in
1. Sistema gera crachás em PDF (lote ou individual) com nome de crachá, grupo, cor do grupo e QR code da inscrição.
2. Na recepção, a secretaria busca por nome/CPF ou lê o QR code e registra o check-in.
3. Inscrição passa a `presente` e `data_checkin` é gravada.
4. Painel de recepção mostra em tempo real: esperados, presentes, faltantes.

**RN-070** — Check-in só é permitido para inscrição `confirmada`. Inscrição `pendente_pagamento` exige que a secretaria registre o recebimento no ato (dinheiro/pix na hora) antes de liberar.

### F7 — Despesas e prestação de contas
1. Coordenadores de área lançam despesas com comprovante ao longo do encontro.
2. Coordenador do encontro aprova ou devolve cada lançamento.
3. Ao encerrar, o sistema fecha o relatório: receita confirmada por método × despesas por área e categoria × saldo.
4. Relatório exportável em PDF e planilha; encontro passa a `encerrado`.

**RN-080** — Encontro `encerrado` bloqueia novos lançamentos financeiros. Reabertura exige admin da central e fica registrada em auditoria.

---

## 6. Relatórios

- Lista de participantes por grupo (impressão).
- Lista de servos por área e função (impressão).
- Restrições alimentares consolidadas — entregue à cozinha.
- Condições de saúde e contatos de emergência — acesso restrito à coordenação e à área de saúde.
- Situação financeira das inscrições (pagas, pendentes, canceladas).
- Prestação de contas do encontro.
- Painel da central: histórico de encontros, evolução de público, ticket médio.
- Painel da denominação: encontros por central, participantes no período, arrecadação consolidada.
- **Painel do operador**: inquilinos ativos, encontros realizados no período, volume transacionado, taxa da plataforma apurada, saúde das conexões de gateway.

**RN-085** — O painel do operador trabalha exclusivamente com números agregados. Nenhum relatório da plataforma exibe nome, contato ou dado sensível de participante para o operador (RN-005).

---

## 7. Notificações

Canais: e-mail (transacional) e WhatsApp (a definir provedor; na fase 1, link `wa.me` gerado manualmente pela secretaria).

| Gatilho | Destinatário |
|---|---|
| Inscrição criada | Inscrito |
| Pagamento aprovado | Inscrito |
| Pagamento pendente (aviso em 24h e 48h) | Inscrito |
| Promoção da lista de espera | Inscrito |
| Cancelamento e reembolso | Inscrito |
| Lembrete — 7 dias e 1 dia antes | Todos os confirmados |
| Alocação em grupo/área publicada | Servos |

---

## 8. Stack e arquitetura

| Camada | Escolha |
|---|---|
| Front | Angular (SSR na área pública, para indexação da agenda) |
| API | NestJS |
| Banco | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Arquivos | Supabase Storage (comprovantes, imagens de capa, crachás) |
| Hospedagem front | Vercel |
| Hospedagem API | Railway |
| Pagamentos | Mercado Pago — marketplace, com split (Pix + cartão parcelado, webhook) |

### 8.1 Multi-inquilino

**RNF-001** — Schema único, com `inquilino_id` e `central_id` em toda tabela de domínio. O isolamento é imposto por **Row Level Security no Postgres**, não por `where` no código da aplicação. A API conecta com role sem `BYPASSRLS` e define o contexto por transação; query que esquecer o filtro retorna zero linhas em vez de vazar. Validado por teste automatizado no CI.

**RNF-006** — Cada inquilino tem subdomínio próprio (`homens-de-fe.app.com.br`) e, opcionalmente, domínio próprio verificado por DNS. O inquilino da requisição é resolvido pelo host, antes de qualquer consulta.

**RNF-007** — Toda tela e todo texto gerado pelo sistema — inclusive e-mail e PDF de crachá — usa os rótulos do inquilino (RN-008), nunca o nome interno do conceito.

### 8.2 Demais requisitos

**RNF-002** — Área pública responsiva e mobile-first: a maioria das inscrições virá de celular, por link compartilhado em grupo de mensagem.
**RNF-003** — Telas de recepção e de cronograma precisam funcionar com internet instável (retiros costumam ser em chácara/sítio): leitura em cache local e fila de sincronização para check-in.
**RNF-004** — Todo webhook de pagamento é persistido bruto antes de ser processado.
**RNF-005** — Auditoria de alterações em inscrição, cobrança, despesa e prestação de contas: quem, quando, valor antes e depois.

### 8.3 Recebimento e split

O dinheiro da inscrição **nunca passa pela conta do operador**. O inquilino (ou a central, conforme a decisão em aberto nº 2) conecta a própria conta Mercado Pago por OAuth; a plataforma cria o pagamento em nome dessa conta e retém sua taxa como tarifa de aplicação.

**RN-095** — O percentual da taxa é definido por inquilino, no contrato, e vigora a partir da data de configuração. Cobranças já criadas mantêm o valor congelado (RN-043).
**RN-096** — Por padrão, a taxa é absorvida pela denominação: o inscrito paga a taxa do encontro, e a central recebe o valor menos a tarifa. O inquilino pode optar por repassar a taxa ao inscrito, o que aumenta o valor exibido na inscrição — a escolha aparece no extrato dos dois lados.
**RN-097** — Estorno de inscrição devolve proporcionalmente a taxa da plataforma. A plataforma não fica com tarifa de dinheiro que voltou ao inscrito.
**RN-098** — Token OAuth do inquilino é renovado automaticamente antes de expirar. Falha de renovação bloqueia novas cobranças daquele inquilino e alerta operador e admin da denominação **antes** que a primeira inscrição falhe.

---

## 9. LGPD e dados sensíveis

O sistema trata dado pessoal sensível (art. 5º, II da LGPD): convicção religiosa, saúde, restrição alimentar.

**Papéis** — cada inquilino é **controlador** dos dados dos seus participantes. O operador da plataforma é **operador** no sentido da lei: trata dados por conta do inquilino, nos limites do contrato. Isso é o que sustenta RN-005 e RN-085 — o operador não tem interesse próprio nesses dados e por isso não os acessa.

**RN-090** — A ficha de inscrição apresenta finalidade de uso e coleta consentimento explícito, com data, hora e IP registrados. O termo é do inquilino, versionado, e identifica quem é o controlador.
**RN-091** — Campos de saúde e medicamento só são visíveis para coordenação do encontro e área responsável pela saúde. Nunca aparecem em lista impressa geral nem em exportação comum.
**RN-092** — Titular pode solicitar exportação e exclusão dos seus dados pelo link da inscrição. Exclusão preserva o registro financeiro anonimizado, por obrigação de prestação de contas.
**RN-093** — Dado de participante de encontro `encerrado` há mais de 5 anos é anonimizado automaticamente, salvo consentimento de retenção para histórico da central.
**RN-094** — **Nenhum dado pessoal cruza a fronteira do inquilino.** A identidade global (4.2) guarda apenas CPF e nome, e serve exclusivamente para reconhecer que a pessoa já existe na plataforma. Contato, endereço, restrição alimentar, condição de saúde e histórico de participação são do inquilino que os coletou. Denominações são controladores distintos, e compartilhar dado sensível entre elas exigiria base legal própria que não temos.
**RN-094a** — A existência de uma identidade **não** é revelada ao inquilino. A ficha de inscrição nunca preenche campo automaticamente com dado de outro inquilino, nem informa "esta pessoa já participou da Tabor". O reconhecimento é interno, para consistência de CPF.
**RN-099** — Exclusão solicitada pelo titular atinge o cadastro **daquele inquilino**. A identidade global só é apagada quando não resta nenhuma pessoa vinculada a ela em nenhum inquilino.

---

## 10. Fases de entrega

### Fase 1 — Multi-inquilino, divulgação, inscrição e pagamento
Inquilino, Central, Identidade, Pessoa, Encontro, Inscrição, Cobrança. Resolução por subdomínio, marca e rótulos, RLS de dois níveis, onboarding de inquilino com OAuth do gateway. Site público com agenda e página do encontro, ficha de inscrição, Pix e cartão parcelado com split, webhook, lista de espera, consulta da inscrição por token, painel administrativo da central e da denominação, painel do operador. Fluxos F0, F1, F2, F3.

### Fase 2 — Operação do retiro
Grupos, áreas de servição (a partir do catálogo do inquilino), cronograma com tarefas e modelos, crachás com a marca da denominação, check-in, painel de recepção, listas operacionais para impressão, área do servo. Fluxos F4, F5, F6.

### Fase 3 — Financeiro e prestação de contas
Despesas com comprovante, aprovação, fechamento, relatórios exportáveis, painel da central, painel da denominação e faturamento da plataforma. Fluxo F7.

---

## 11. Decisões em aberto

1. Provedor de WhatsApp para notificação automática (fase 2 ou 3).
2. **A conta de recebimento é do inquilino ou da central?** Denominação com centrais em CNPJs distintos precisa de conexão por central; denominação centralizada prefere uma só. A modelagem prevista suporta as duas, mas a decisão define a tela de onboarding e a apuração da taxa.
3. ~~Cadastro nacional de pessoa~~ — **resolvido**: identidade global, cadastro por inquilino (RN-010 a RN-014, RN-094).
4. Encontros mistos ou segmentados por perfil (homens, mulheres, casais, jovens) mudam a ficha de inscrição? Com multi-inquilino isso vira: a ficha é configurável por inquilino, ou fixa com campos opcionais?
5. O crachá tem layout padrão por denominação ou cada central personaliza?
6. Inquilino que sai da plataforma leva os dados para onde? Formato e prazo da exportação de saída precisam estar no contrato.
7. O que acontece com encontros em andamento quando um inquilino é suspenso por inadimplência? Bloquear inscrição é razoável; derrubar a recepção na sexta à noite, não.
