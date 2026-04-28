// types/squad.ts
// Contrato de dados para o módulo ResourceSchedulerV2 — Impacto Digital
// Arquitetura Hexagonal: Domain Layer (Zero dependências externas)

/**
 * Categorias de habilidade disponíveis no chão de fábrica.
 * Cada colaborador pode ter múltiplas skills.
 */
export type SkillCategory =
  | 'serralheria'
  | 'pintura'
  | 'instalacao'
  | 'arte'
  | 'design'
  | 'cnc'
  | 'impressao'
  | 'gestao'
  | 'vendas'
  | 'onboarding';

/**
 * Papel funcional do colaborador dentro da equipe.
 * - lead: Responsável técnico da área
 * - operator: Operador qualificado
 * - apprentice: Em treinamento (vinculado a um mentor via shadowOf)
 */
export type EmployeeRole = 'lead' | 'operator' | 'apprentice';

/**
 * Registro imutável de um colaborador da Impacto.
 */
export interface Employee {
  /** Identificador único (slug lowercase, ex: 'renan') */
  id: string;
  /** Nome de exibição completo */
  name: string;
  /** Iniciais para avatar (2 caracteres, ex: 'RN') */
  initials: string;
  /** Cor do avatar em hex (design system) */
  color: string;
  /** Competências técnicas */
  skills: SkillCategory[];
  /** Papel funcional na equipe */
  role: EmployeeRole;
  /** ID do mentor (somente para apprentice / onboarding) */
  shadowOf?: string;
}

/**
 * Composição de equipe para uma OS.
 */
export interface Squad {
  /** IDs dos membros atribuídos */
  members: string[];
  /** ID do líder operacional */
  lead: string;
  /** Origem da sugestão */
  suggestedBy: 'smart' | 'manual';
}

/**
 * Campos de atribuição persistidos no documento Firestore de cada OS.
 * Estes campos são adicionados ao schema existente de /orders/{orderId}.
 */
export interface TaskAssignment {
  /** Array de Employee IDs atribuídos à OS */
  assigned_to: string[];
  /** Employee ID do operador líder */
  lead_operator: string;
}
