// services/squadService.ts
// Motor de Atribuição Inteligente — Impacto Digital
// Arquitetura Hexagonal: Application Service (depende apenas do Domain Layer)

import { Employee, Squad, SkillCategory } from '../types/squad';

// ─── REGISTRO DE COLABORADORES (Matriz de Competências) ─────────────────────

export const EMPLOYEE_REGISTRY: readonly Employee[] = [
  {
    id: 'renan',
    name: 'Renan',
    initials: 'RN',
    color: '#EAB308',
    skills: ['serralheria'],
    role: 'lead',
  },
  {
    id: 'gabriel',
    name: 'Gabriel',
    initials: 'GB',
    color: '#3B82F6',
    skills: ['serralheria', 'cnc', 'impressao'],
    role: 'operator',
  },
  {
    id: 'marcelo',
    name: 'Marcelo',
    initials: 'MC',
    color: '#8B5CF6',
    skills: ['pintura', 'instalacao'],
    role: 'operator',
  },
  {
    id: 'julio',
    name: 'Júlio',
    initials: 'JL',
    color: '#06B6D4',
    skills: ['pintura', 'instalacao'],
    role: 'operator',
  },
  {
    id: 'tony',
    name: 'Tony',
    initials: 'TN',
    color: '#D946EF',
    skills: ['arte', 'design'],
    role: 'lead',
  },
  {
    id: 'lucas',
    name: 'Lucas',
    initials: 'LC',
    color: '#F97316',
    skills: ['arte', 'design'],
    role: 'operator',
  },
  {
    id: 'eldinho',
    name: 'Eldinho',
    initials: 'EL',
    color: '#10B981',
    skills: ['gestao', 'vendas'],
    role: 'lead',
  },
  {
    id: 'alemao',
    name: 'Alemão',
    initials: 'AL',
    color: '#F43F5E',
    skills: ['gestao', 'vendas'],
    role: 'operator',
  },
  {
    id: 'amanda',
    name: 'Amanda',
    initials: 'AM',
    color: '#EC4899',
    skills: ['gestao', 'vendas'],
    role: 'operator',
  },
  {
    id: 'kaique',
    name: 'Kaique',
    initials: 'KQ',
    color: '#A3E635',
    skills: ['onboarding', 'instalacao'],
    role: 'apprentice',
    shadowOf: 'julio',
  },
] as const;

// ─── MAPEAMENTO DE STATUS → SKILLS ─────────────────────────────────────────

const STATUS_SKILL_MAP: Record<string, SkillCategory[]> = {
  'Serralheria':              ['serralheria'],
  'Pintura':                  ['pintura'],
  'Instalação':               ['instalacao', 'pintura'],
  'Arte':                     ['arte', 'design'],
  'Impressão':                ['cnc', 'impressao'],
  'Acabamento':               ['pintura', 'serralheria'],
  'Serralheria + Instalação': ['serralheria', 'instalacao'],
  'Arte + Impressão':         ['arte', 'impressao'],
};

// ─── QUERIES (Port de Leitura) ──────────────────────────────────────────────

/**
 * Retorna um colaborador pelo ID.
 * @throws se o ID não existir no registro
 */
export function getEmployeeById(id: string): Employee | undefined {
  return EMPLOYEE_REGISTRY.find(e => e.id === id);
}

/**
 * Retorna todos os colaboradores que possuem pelo menos uma das skills indicadas.
 */
export function getEmployeesBySkill(skill: SkillCategory): Employee[] {
  return EMPLOYEE_REGISTRY.filter(e => e.skills.includes(skill));
}

/**
 * Retorna todos os colaboradores (para listagem completa no SquadSelector).
 */
export function getAllEmployees(): readonly Employee[] {
  return EMPLOYEE_REGISTRY;
}

// ─── SMART SQUAD ENGINE ─────────────────────────────────────────────────────

/**
 * Gera uma sugestão de squad otimizada para um determinado tipo de serviço.
 *
 * Regras:
 * 1. Mapeia o status da OS para skills necessárias
 * 2. Filtra colaboradores que possuem pelo menos uma skill compatível
 * 3. Prioriza colaboradores com role 'lead' para liderança
 * 4. Adiciona sombras de onboarding automaticamente
 *    (Se Marcelo ou Júlio estão no squad, Kaique entra como sombra)
 *
 * @param taskStatus - Status da OS (ex: 'Serralheria', 'Instalação')
 * @returns Squad com membros sugeridos e líder identificado
 */
export function getOptimizedSquad(taskStatus: string): Squad {
  const requiredSkills = STATUS_SKILL_MAP[taskStatus] || [];

  if (requiredSkills.length === 0) {
    // Status desconhecido → retorna squad vazio (manual assignment)
    return { members: [], lead: '', suggestedBy: 'smart' };
  }

  // Filtra candidatos que possuem pelo menos uma das skills necessárias
  const candidates = EMPLOYEE_REGISTRY.filter(emp =>
    emp.skills.some(skill => requiredSkills.includes(skill)) &&
    emp.role !== 'apprentice' // Aprendizes são adicionados separadamente
  );

  if (candidates.length === 0) {
    return { members: [], lead: '', suggestedBy: 'smart' };
  }

  // Identifica o lead: prioriza quem tem role 'lead', senão pega o primeiro
  const leadCandidate = candidates.find(c => c.role === 'lead') || candidates[0];
  const memberIds = candidates.map(c => c.id);

  // Regra de Onboarding: Se Marcelo ou Júlio estão no squad, 
  // Kaique entra automaticamente como sombra
  const hasOnboardingMentor = memberIds.includes('marcelo') || memberIds.includes('julio');
  if (hasOnboardingMentor && !memberIds.includes('kaique')) {
    memberIds.push('kaique');
  }

  return {
    members: memberIds,
    lead: leadCandidate.id,
    suggestedBy: 'smart',
  };
}

/**
 * Gera sugestão combinada quando a OS possui múltiplos estágios.
 * Ex: "Serralheria + Instalação" → Renan + Marcelo + Kaique
 */
export function getOptimizedSquadMulti(statuses: string[]): Squad {
  const allMembers = new Set<string>();
  let bestLead = '';

  for (const status of statuses) {
    const partial = getOptimizedSquad(status);
    partial.members.forEach(m => allMembers.add(m));
    if (!bestLead && partial.lead) bestLead = partial.lead;
  }

  return {
    members: Array.from(allMembers),
    lead: bestLead,
    suggestedBy: 'smart',
  };
}
