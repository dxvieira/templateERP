export interface Client {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  defaultTechnicalNote?: string;
  pricingTier?: 'standard' | 'premium' | 'vip';
}
