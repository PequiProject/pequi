type ValidationErrorItem = {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
};

type ApiErrorBody = {
  detail?: string | ValidationErrorItem[];
  message?: string;
};

const FIELD_LABELS: Record<string, string> = {
  email: 'E-mail',
  username: 'Nome de usuário',
  password: 'Senha',
  full_name: 'Nome completo',
  identifier: 'E-mail ou nome de usuário',
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const httpError = error as { error?: ApiErrorBody; status?: number };

  if (httpError.status === 0) {
    return 'Não foi possível conectar ao servidor. Verifique se a API está rodando.';
  }

  const body = httpError.error;
  if (!body) {
    return fallback;
  }

  if (typeof body.detail === 'string') {
    return translateKnownDetail(body.detail, fallback);
  }

  if (typeof body.message === 'string' && body.message.trim()) {
    return translateKnownDetail(body.message, body.message);
  }

  if (Array.isArray(body.detail) && body.detail.length > 0) {
    return formatValidationErrors(body.detail);
  }

  return fallback;
}

function translateKnownDetail(detail: string, fallback: string): string {
  const normalized = detail.trim();
  if (!normalized) return fallback;

  const known: Record<string, string> = {
    'Internal server error': 'Erro interno do servidor. Tente novamente em instantes.',
    'Invalid credentials': 'E-mail ou senha inválidos.',
    'User is inactive': 'Usuário inativo.',
    'Unable to register with these credentials.': 'Não foi possível cadastrar com estes dados.',
    'Username already taken.': 'Este nome de usuário já está em uso.',
  };

  return known[normalized] ?? normalized;
}

function formatValidationErrors(items: ValidationErrorItem[]): string {
  const messages = items.map(formatValidationError).filter(Boolean);
  return messages[0] ?? 'Dados inválidos. Revise os campos e tente novamente.';
}

function formatValidationError(item: ValidationErrorItem): string {
  const field = item.loc?.filter((part) => part !== 'body').pop()?.toString() ?? '';
  const label = FIELD_LABELS[field] ?? (field || 'Campo');
  const msg = stripValueErrorPrefix(item.msg ?? '');

  if (msg.includes('nome de usuário')) {
    return msg;
  }

  switch (item.type) {
    case 'missing':
      return `${label}: campo obrigatório.`;
    case 'string_too_short':
      return `${label}: valor muito curto.`;
    case 'string_too_long':
      return `${label}: valor muito longo.`;
    case 'value_error':
      if (field === 'email') {
        return 'Informe um e-mail válido.';
      }
      if (msg) {
        return msg;
      }
      return `${label}: valor inválido.`;
    default:
      if (msg) {
        return msg;
      }
      return `${label}: valor inválido.`;
  }
}

function stripValueErrorPrefix(message: string): string {
  return message.replace(/^Value error,\s*/i, '').trim();
}
