import type { CommunityPost } from '../models/community.models';

export const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: '1',
    authorName: 'Maria S.',
    authorInitials: 'MS',
    title: 'Primeira semana de tratamento',
    description:
      'Estou no início do tratamento e queria compartilhar como me sinto. Alguns dias são mais difíceis, mas estou tentando manter a rotina.',
    categories: ['relato'],
    categoryLabels: ['Relato'],
    timeLabel: 'Há 2 horas',
    supportCount: 12,
    isSupported: false,
    commentCount: 4,
    comments: [
      {
        id: 'c1',
        authorName: 'Ana P.',
        authorInitials: 'AP',
        content: 'Força! Você não está sozinha nessa jornada.',
        timeLabel: 'Há 1 hora',
      },
      {
        id: 'c2',
        authorName: 'João R.',
        authorInitials: 'JR',
        content: 'Também passei por isso no começo. Vai melhorar!',
        timeLabel: 'Há 45 min',
        replies: [
          {
            id: 'c2r1',
            authorName: 'Maria S.',
            authorInitials: 'MS',
            content: 'Obrigada pelo acolhimento!',
            timeLabel: 'Há 30 min',
          },
        ],
      },
      {
        id: 'c4',
        authorName: 'Participante anônimo',
        authorInitials: '??',
        content: 'Prefiro não me identificar, mas quero dizer que admirei sua coragem.',
        timeLabel: 'Há 20 min',
        isAnonymous: true,
      },
    ],
  },
  {
    id: '2',
    authorName: 'Carlos M.',
    authorInitials: 'CM',
    title: 'Dúvida sobre efeitos colaterais',
    description:
      'Alguém já sentiu formigamento nas mãos durante o tratamento? É normal ou devo procurar o médico?',
    categories: ['duvida'],
    categoryLabels: ['Dúvida'],
    timeLabel: 'Há 5 horas',
    supportCount: 8,
    isSupported: true,
    commentCount: 1,
    comments: [
      {
        id: 'c3',
        authorName: 'Dra. Lucia (voluntária)',
        authorInitials: 'DL',
        content:
          'Formigamento pode ocorrer, mas vale conversar com seu médico na próxima consulta.',
        timeLabel: 'Há 3 horas',
      },
    ],
  },
  {
    id: '3',
    authorName: 'Fernanda L.',
    authorInitials: 'FL',
    title: 'Mensagem de apoio para quem precisa',
    description:
      'Se você está passando por um dia difícil, saiba que essa comunidade está aqui por você. Respire fundo, um passo de cada vez.',
    categories: ['apoio'],
    categoryLabels: ['Apoio'],
    timeLabel: 'Ontem',
    supportCount: 24,
    isSupported: false,
    commentCount: 0,
    comments: [],
  },
];
