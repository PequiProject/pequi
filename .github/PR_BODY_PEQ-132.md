# Pull Request — PEQ-132 | 28-05-2026

## Descrição

Este PR atende a tarefa **[PEQ-132](https://pequi-pds-team.atlassian.net/browse/PEQ-132)**. Resumo das alterações e objetivo do PR: realizar configuração do deploy.

---

## Funcionalidades

- **Resumo:** início do deploy integral.


---

## Melhorias de TUI / UX

- Descrever aqui qualquer melhoria visível para o usuário (front-end, mensagens de erro, contratos Bruno) ou indicar "Não aplicável".

---

## Lógica de Prioridade

---

## Ajustes


---

## Integração

- Jira: [PEQ-132](https://pequi-pds-team.atlassian.net/browse/PEQ-132)

---

## Observações

- Pontos conhecidos e limitações (ex.: fluxo de autenticação stubbed, dependências de outro PR, necessidade de ajustes manuais em migrações).
- Instruções rápidas para testar localmente (ex.: como rodar a suíte ou endpoints principais). Exemplo:

```bash
cd backend
source .venv/bin/activate
scripts/run_tests.sh
```

### Configuração de Deploy / Nginx / Cloudflare / SSL

- **Último commit:** ajustes no arquivo de configuração do servidor reverso em `nginx/nginx.conf` para compatibilizar com o deploy do frontend e proxy reverso. Verifique esse arquivo ao revisar o PR.
- **Objetivo:** expor o ambiente de deploy do frontend via domínio/subdomínio com Cloudflare, garantindo HTTPS válido entre o usuário e o frontend (e entre Cloudflare e a origem, se aplicável).

Passos recomendados para configurar o domínio com Cloudflare:

1. No painel do Cloudflare, adicione o domínio ou subdomínio que irá apontar para o deploy do frontend (ex.: `app.example.com`).
2. Crie o DNS record apropriado:
	- Se o provedor de hosting do frontend fornecer um hostname (Netlify / Vercel / Cloudflare Pages), crie um `CNAME` apontando para esse hostname.
	- Se for necessário apontar para um IP, crie um `A` record para o IP público do servidor onde o `nginx` está configurado.
3. Ative o proxy do Cloudflare (nuvem laranja) para tirar vantagem do CDN e WAF, a menos que haja necessidade explícita de bypass.
4. SSL/TLS:
	- Recomenda-se usar o modo `Full (strict)` no Cloudflare.
	- Para `Full (strict)`, gere um certificado de origem no Cloudflare (Origin Certificate) e instale o `cert` e `key` no servidor de origem onde o `nginx` roda. Configure `nginx` para usar esses arquivos como `ssl_certificate` / `ssl_certificate_key`.
	- Se não puder usar certificados de origem, use um certificado válido emitido por uma CA pública (Let's Encrypt, etc.) e configure o mesmo em `nginx`.
5. Segurança TLS:
	- Habilite TLS 1.2+ e HTTP/2. Considere HSTS se já tiver confiança na configuração.
6. Cache e invalidação:
	- Configure as regras de cache no Cloudflare conforme as necessidades do frontend.
	- Após deploy, faça purge (invalidação) do cache do Cloudflare para servir a versão nova.
7. Testes e verificação:
	- Valide HTTPS: `curl -I https://app.example.com` e verifique certificado e `200`.
	- Verifique cabeçalhos `CF-` e que o tráfego passa pelo Cloudflare.

Exemplo mínimo de trecho `nginx` (adaptar conforme sua configuração):

```
server {
	 listen 443 ssl http2;
	 server_name app.example.com;

	 ssl_certificate /etc/ssl/certs/cloudflare-origin.pem;
	 ssl_certificate_key /etc/ssl/private/cloudflare-origin-key.pem;

	 location / {
		  proxy_pass http://frontend_upstream;
		  proxy_set_header Host $host;
		  proxy_set_header X-Real-IP $remote_addr;
		  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		  proxy_set_header X-Forwarded-Proto $scheme;
	 }
}
```

Observação: adapte os caminhos de certificado e o `proxy_pass` ao seu ambiente. Se o deploy do frontend for em plataforma serverless (ex.: Cloudflare Pages, Vercel, Netlify), prefira apontar com `CNAME` diretamente para o host fornecido pelo provedor e use as funcionalidades de SSL gerenciadas pelo provedor/Cloudflare.


---

## Checklist

- [ ] O código compila sem erros
- [ ] Testes foram adicionados ou atualizados
- [ ] A documentação foi atualizada
- [ ] Revisado por pelo menos um membro da equipe

---