## Bateria de testes

### Erro da classe `op.bulk_insert` encontrado durante a execução do workflow de testes

**Causa raiz:** op.bulk_insert vincula parâmetros via psycopg com tipos derivados da definição da tabela auxiliar (sa.column("side", sa.Text())), gerando $4::VARCHAR. O PostgreSQL 16 em modo estrito não aceita cast implícito de varchar para um tipo ENUM customizado.

**Correção:** substituído op.bulk_insert por op.execute(sa.text(...)) com os valores embutidos diretamente no SQL literal. Quando os valores aparecem como literais de string no SQL (não como parâmetros vinculados), o PostgreSQL resolve a conversão implicitamente para o ENUM declarado na coluna — comportamento padrão e confiável para seeds em migrations.

**Efeito colateral:** remoção do import uuid e da função helper _row que ficaram órfãos.

**Lint:** adicionado per-file-ignores para `alembic/versions/*.py` ignorando E501 — migrations frequentemente têm SQL literal com linhas longas e é o padrão correto para esse caso, evitando contorções de formatação no SQL.