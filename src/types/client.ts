export interface Client {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  defaultTechnicalNote?: string;
  pricingTier?: 'standard' | 'premium' | 'vip';
  /** Criado automaticamente via pedido — cadastro ainda precisa ser completado */
  isIncomplete?: boolean;
}
