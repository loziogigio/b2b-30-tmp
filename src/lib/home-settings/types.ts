export interface CompanyBranding {
  title: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface ProductCardStyle {
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  shadowSize: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shadowColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  hoverEffect: 'none' | 'lift' | 'shadow' | 'scale' | 'border' | 'glow';
  hoverScale?: number;
  hoverShadowSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  backgroundColor: string;
  hoverBackgroundColor?: string;
}

export interface HomeSettings {
  branding: CompanyBranding;
  defaultCardVariant: 'b2b' | 'horizontal' | 'compact' | 'detailed';
  cardStyle: ProductCardStyle;
}
