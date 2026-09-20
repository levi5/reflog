import type { DocsContent, FigureLabels } from "./types"

export const docsPtFigureLabels: FigureLabels = {
  merge: "merge",
  resolve: "resolver",
  done: "continuar",
  type: "tipo",
  scope: "escopo",
  subject: "descrição",
  template: "template",
  message: "mensagem",
  rebase: "rebase",
  linear: "histórico linear",
}

export const docsPtContent: DocsContent = {
  intro: "Guia rápido do Reflog com exemplos. Abra um repositório para começar — ou use o terminal:",
  sections: [
    {
      id: "open",
      title: "Abrir um repositório",
      steps: [
        "Clique na pasta na barra superior ou use Procurar para escolher a pasta do repo.",
        "Repos recentes aparecem na tela de boas-vindas para acesso rápido.",
        "Para clonar, informe a URL e a pasta de destino na mesma barra.",
      ],
      code: "reflog /caminho/do/repo",
    },
    {
      id: "conflicts",
      title: "Resolver conflitos",
      steps: [
        "Com conflito ativo, o app abre a aba Merge sozinho.",
        "Escolha o arquivo na lateral e use Aceitar Atual, Recebida ou Ambas por hunk.",
        "Salve o arquivo, marque como resolvido e finalize em Continuar Merge.",
      ],
      code: "git merge feature/login",
      figure: "merge",
    },
    {
      id: "rebase",
      title: "Git Rebase e Rebase Interativo",
      steps: [
        "O que é Rebase: o Git Rebase move a base de partida da sua branch atual para a ponta de outra branch (ex.: main), reaplicando seus commits um a um com novos hashes SHA-1 para criar um histórico perfeitamente linear.",
        "Diferença entre Rebase e Merge: o merge junta duas branches criando um commit extra de bifurcação (diamond merge), enquanto o rebase transplanta os commits no topo da branch base sem gerar nós ou commits de junção vazios.",
        "Rebase Interativo (git rebase -i): permite organizar e higienizar seu histórico antes de publicar alterações. Você pode usar pick (manter commit), squash / fixup (combinar com commit anterior), reword (editar mensagem), edit (pausar para modificar código) ou drop (excluir commit).",
        "Resolução de conflitos durante o rebase: quando ocorrem conflitos, o rebase pausa a execução. Resolva os trechos conflitantes pelo hunk editor na aba Merge e continue com 'git rebase --continue' (ou cancele a operação com 'git rebase --abort').",
        "Rebase no Reflog: na aba Merge, ative a faixa Rebase Interativo para alternar visualmente as ações de cada commit (pick, drop, squash, reword...), acionar o Auto-Squash e executar o rebase diretamente pela interface.",
        "Regra de ouro do Rebase: nunca rebaseie branches públicas compartilhadas em que outras pessoas baseiam seu trabalho. Faça rebase somente em branches de feature locais antes de abrir pull request ou integrar na main.",
      ],
      code: "git rebase main\n# ou rebase interativo dos últimos 3 commits:\ngit rebase -i HEAD~3",
      figure: "rebase",
    },
    {
      id: "staging",
      title: "Staging e commit",
      steps: [
        "Na aba Staging, selecione o arquivo e veja o diff por hunk.",
        "Use Stage hunk para subir só parte do arquivo; Discard hunk desfaz o trecho.",
        "Monte a mensagem no builder (tipo, escopo, descrição) e confirme com Ctrl+Enter.",
        "Ative Sign-off (-s) ou assinatura GPG (-S) ao expandir corpo/rodapé.",
        "Adicione co-autores e escolha templates Markdown com variáveis automáticas.",
        "Na aba de histórico, reescreva a mensagem de um commit com amend.",
      ],
      code: "feat(api): adiciona resolvedor de conflitos",
      figure: "commit",
    },
    {
      id: "templates",
      title: "Templates e Presets de Commit",
      steps: [
        "Aba Templates dividida em três seções: Templates, Presets e Commits (Preferências).",
        "Modelos embutidos: Conventional Commits padrão canônico e Jira Issue, além de templates Markdown salvos em .reflog/templates/.",
        "Editor completo com preview em tempo real e chips de variáveis: {{header}}, {{type}}, {{scope}}, {{subject}}, {{body}}, {{footer}}, {{branch}}, etc.",
        "Aba Presets: crie, edite com preenchimento automático e exclua presets rápidos de tipo e escopo.",
        "Aba Commits: configure Modo Estrito (exigência de tipo conventional), ícones/emojis por tipo e selecione o template ativo.",
      ],
      code: "---\nname: conventional\ntype: feat\n---\n{{header}}\n\n{{#body}}{{body}}\n\n{{/body}}{{#footer}}{{footer}}{{/footer}}",
      figure: "template",
    },
    {
      id: "automations",
      title: "Automações e Ações Rápidas",
      steps: [
        "Crie receitas com passos condicionais se/então/senão: branch existe, tag existe, árvore limpa, submodule pronto ou comando ok.",
        "Ative o switch 'Ações rápidas' em qualquer receita para adicionar um botão instantâneo no drawer lateral Quick Actions.",
        "O drawer Quick Actions (ícone do raio na barra superior) permite filtrar, navegar via teclado (↑, ↓, Enter) e rodar comandos em 1 clique.",
        "Cada receita seleciona seu repositório de destino; use {{variaveis}} e configure atalhos rápidos.",
        "Revise a prévia na modal com alerta de passos perigosos e acompanhe o log por alvo em tempo real.",
        "Exporte e importe receitas em TOML/JSON para sincronizar e compartilhar com seu time.",
      ],
      code: "se branch-existe release → checkout release senão checkout -b release",
    },
    {
      id: "monitors",
      title: "Monitores de Repositório",
      steps: [
        "Na aba Monitores, configure blocos de vigilância contínua para acompanhar o estado do projeto.",
        "Acompanhe alterações pendentes (status --short), branch atual (branch --show-current) e commits recentes (log -5).",
        "Crie blocos visuais customizados com comandos Git executados automaticamente.",
      ],
      code: "git status --short && git branch --show-current",
    },
    {
      id: "tags",
      title: "Tags e versões",
      steps: [
        "Na aba Staging → Tags, o app sugere patch, minor e major a partir da última tag.",
        "Clicar na sugestão já preenche o nome da tag anotada e a mensagem.",
        "Sem tags anteriores, ele sugere começar por v0.1.0.",
      ],
      code: "v1.2.3 → v1.2.4 · v1.3.0 · v2.0.0",
    },
    {
      id: "branches",
      title: "Branches e remotos",
      steps: [
        "Crie, renomeie e delete branches na aba Branches; Fetch faz prune.",
        "Digite o nome da branch e clique em Executar para deletar.",
        "No banner de merge, marque Squash para juntar sem commitar ou No-ff.",
        "Gerencie remotos e veja ahead/behind na barra de status.",
      ],
      code: "git fetch --all --prune",
    },
    {
      id: "blame",
      title: "Blame",
      steps: [
        "Na aba Blame, filtre qualquer arquivo rastreado do repo.",
        "Cada linha mostra commit, autor e data — passe o mouse para ver o resumo.",
        "O código tem syntax highlight automático pela extensão do arquivo.",
      ],
    },
    {
      id: "visualize",
      title: "Visualize Playground e Animações",
      steps: [
        "Grafo interativo desenha a árvore de commits com lanes coloridas, junções de merge e marcador HEAD.",
        "Navegação fluida: arraste para pan, scroll para zoom e busca por mensagem, autor ou hash.",
        "Animações dinâmicas a cada ação: pulso radiante (ripple) nos novos nós, arestas animadas tracejadas, salto suave no HEAD e banner informativo flutuante de ação.",
        "Console Git com modo terminal (autocomplete, histórico de comandos) e modo blocos visuais por categoria.",
        "Comandos perigosos (merge, push, reset, rebase…) solicitam confirmação prévia para segurança.",
      ],
      code: "checkout -b feature/login",
    },
    {
      id: "profiles",
      title: "Perfis Git",
      steps: [
        "Em Configurações → Identidade, cadastre perfis com nome, e-mail e emoji.",
        "Troque de conta pelo seletor na barra superior ou com Alt+P.",
        "O perfil ativo aparece na barra de status e é aplicado no user.name/user.email.",
      ],
    },
    {
      id: "themes",
      title: "Temas",
      steps: [
        "Em Configurações → Interface, escolha entre Escuro, Claro, Glass escuro e Glass claro.",
        "Os temas glass usam blur e translucidez sobre o papel de parede.",
      ],
    },
    {
      id: "notifications",
      title: "Notificações e Toasts",
      steps: [
        "Sistema unificado de notificações Toast com feedbacks de sucesso, carregamento, alerta e erro.",
        "Erros críticos de sistema (Fatal Error) são destacados com prioridade máxima e botão de tentar novamente.",
      ],
    },
    {
      id: "shortcuts",
      title: "Atalhos e indicadores",
      steps: [
        "Ctrl+Enter faz o commit, Ctrl+K foca a busca, Alt+P troca de perfil.",
        "Abas com pendências mostram badge com contagem; conflitos ficam em vermelho.",
        "A barra superior mostra pill de conflito ou de arquivos não commitados.",
        "A barra de status mostra merge, avisos, arquivos alterados e perfil ativo.",
      ],
    },
    {
      id: "submodules",
      title: "Submodules",
      steps: [
        "A aba Automações lista os submodules com estado: ok, divergente, conflito ou não iniciado.",
        "Abra um submodule para agir dentro dele com todas as telas do app.",
        "Rode update ou foreach direto no submodule pelo console do Visualize.",
      ],
      code: "submodule foreach 'git pull origin master'",
    },
  ],
}
