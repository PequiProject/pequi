# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-05-20

Primeira release publicada em `main` (pré-1.0.0). Integra o trabalho acumulado em `development` desde o bootstrap do repositório.

### Added

- Frontend Angular: layout global, menu responsivo, header e notificações (#5, #7)
- Home: calendário semanal, análise da semana e ações rápidas (#6, #8, #4)
- Fluxo de check-in: ranking de sentimentos, seleção de sintomas e detalhes (#9, #12, #14)
- Comunidade: feed e criação de posts (#13)
- Backend FastAPI: stack inicial (PEQ-87), autenticação (PEQ-76) e perfil do paciente (PEQ-77)
- Documentação de agentes, Gitflow, workflows de release e integração SonarCloud (CI)
- `.gitignore` na raiz do monorepo

### Changed

- Versão do pacote `pequi` em `backend/pyproject.toml` definida como `0.0.1`

### Fixed

- Ordem dos steps do check-in (detalhes após intensidade)
- Rota de check-in no card da home
- Catálogo de sintomas no mock alinhado ao esperado
