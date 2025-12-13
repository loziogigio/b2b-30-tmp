import type { CSSProperties } from 'react';
import type { ProductCardStyle } from '@/hooks/use-home-settings';

const shadowMap: Record<
  Exclude<ProductCardStyle['shadowSize'], 'none'>,
  string
> = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
};

const hoverShadowMap: Record<
  Exclude<ProductCardStyle['hoverShadowSize'], undefined>,
  string
> = {
  sm: shadowMap.sm,
  md: shadowMap.md,
  lg: shadowMap.lg,
  xl: shadowMap.xl,
  '2xl': shadowMap['2xl'],
};

const borderRadiusMap: Record<ProductCardStyle['borderRadius'], string> = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
};

export function computeCardStyle(style: ProductCardStyle): CSSProperties {
  const borderWidth =
    style.borderStyle === 'none' || style.borderWidth <= 0
      ? 0
      : style.borderWidth;

  return {
    borderWidth: `${borderWidth}px`,
    borderStyle: style.borderStyle,
    borderColor:
      style.borderStyle === 'none' ? 'transparent' : style.borderColor,
    borderRadius: borderRadiusMap[style.borderRadius],
    backgroundColor: style.backgroundColor,
    boxShadow:
      style.shadowSize !== 'none'
        ? shadowMap[
            style.shadowSize as Exclude<ProductCardStyle['shadowSize'], 'none'>
          ]
        : 'none',
    transition: 'all 0.2s ease',
  };
}

export function computeHoverDeclarations(style: ProductCardStyle): string[] {
  const declarations: string[] = [];

  switch (style.hoverEffect) {
    case 'lift':
      declarations.push('transform: translateY(-4px);');
      break;
    case 'shadow':
      declarations.push(
        `box-shadow: ${hoverShadowMap[style.hoverShadowSize || 'lg']};`,
      );
      break;
    case 'scale':
      declarations.push(`transform: scale(${style.hoverScale || 1.02});`);
      break;
    case 'border':
      declarations.push(`border-color: ${style.borderColor};`);
      declarations.push('filter: brightness(0.95);');
      break;
    case 'glow':
      declarations.push(`box-shadow: 0 0 25px ${style.shadowColor};`);
      break;
    default:
      break;
  }

  if (style.hoverBackgroundColor && style.hoverEffect !== 'shadow') {
    declarations.push(`background-color: ${style.hoverBackgroundColor};`);
  }

  return declarations;
}
