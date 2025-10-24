'use client';

import Link from '@components/ui/link';
import Image from 'next/image';
import useWindowSize from '@utils/use-window-size';
import cn from 'classnames';
import { useMemo, type CSSProperties } from 'react';
import { computeMediaCardStyle } from '@/lib/home-settings/media-card-style';

interface BannerProps {
  lang: string;
  banner: any;
  variant?: 'rounded' | 'default';
  effectActive?: boolean;
  className?: string;
  classNameInner?: string;
  forceFullHeight?: boolean;
  noPadding?: boolean;
}

interface CardStyleOptions {
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  shadowSize: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shadowColor: string;
  backgroundColor: string;
  hoverEffect: 'none' | 'lift' | 'shadow' | 'scale' | 'border' | 'glow';
  hoverScale?: number;
  hoverShadowSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hoverBackgroundColor?: string;
}

type NormalizedImage = {
  url: string;
  width: number;
  height: number;
  alt?: string;
};

const FALLBACK_DIMENSIONS = {
  width: 1920,
  height: 1080
};

function normalizeImageSource(image: any, fallbackAlt: string): NormalizedImage | null {
  if (!image) return null;

  if (typeof image === 'string') {
    return {
      url: image,
      width: FALLBACK_DIMENSIONS.width,
      height: FALLBACK_DIMENSIONS.height,
      alt: fallbackAlt
    };
  }

  if (typeof image === 'object') {
    if ('url' in image && typeof image.url === 'string') {
      return {
        url: image.url,
        width: image.width || FALLBACK_DIMENSIONS.width,
        height: image.height || FALLBACK_DIMENSIONS.height,
        alt: image.alt || fallbackAlt
      };
    }

    // Support cases where image object contains nested desktop/mobile
    if ('desktop' in image || 'mobile' in image) {
      const desktopSource = normalizeImageSource(image.desktop, fallbackAlt);
      const mobileSource = normalizeImageSource(image.mobile, fallbackAlt);
      return desktopSource ?? mobileSource;
    }
  }

  return null;
}

function resolveResponsiveImage(banner: any, deviceWidth: number): NormalizedImage | null {
  const title = banner?.title || '';

  const desktopSource =
    normalizeImageSource(banner?.image?.desktop, title) ??
    normalizeImageSource(banner?.imageDesktop, title) ??
    normalizeImageSource(banner?.image, title) ??
    normalizeImageSource(banner?.imageUrl, title);

  const mobileSource =
    normalizeImageSource(banner?.image?.mobile, title) ??
    normalizeImageSource(banner?.imageMobile, title) ??
    normalizeImageSource(banner?.mobileImage, title);

  if (deviceWidth != null && deviceWidth < 480) {
    return mobileSource ?? desktopSource;
  }

  return desktopSource ?? mobileSource;
}

const borderRadiusMap: Record<CardStyleOptions['borderRadius'], string> = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px'
};

const shadowMap: Record<Exclude<CardStyleOptions['shadowSize'], 'none'>, string> = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)'
};

const hoverShadowMap: Record<Exclude<CardStyleOptions['hoverShadowSize'], undefined>, string> = {
  sm: shadowMap.sm,
  md: shadowMap.md,
  lg: shadowMap.lg,
  xl: shadowMap.xl,
  '2xl': shadowMap['2xl']
};

const BannerCard: React.FC<BannerProps> = ({
  lang,
  banner,
  className,
  variant = 'default',
  effectActive = true,
  classNameInner,
  forceFullHeight = false,
  noPadding = false,
}) => {
  const { width } = useWindowSize();
  const { slug, title } = banner;

  const defaultStyle: CardStyleOptions = {
    borderWidth: 0,
    borderColor: 'transparent',
    borderStyle: 'none',
    borderRadius: 'md',
    shadowSize: 'none',
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    backgroundColor: '#ffffff',
    hoverEffect: 'none',
    hoverScale: 1.02,
    hoverShadowSize: 'lg',
    hoverBackgroundColor: ''
  };

  const styleOptions: CardStyleOptions | null = useMemo(() => {
    if (!banner?.cardStyle) return null;
    return {
      ...defaultStyle,
      ...(banner.cardStyle as Partial<CardStyleOptions>)
    };
  }, [banner?.cardStyle]);

  const selectedImage = resolveResponsiveImage(banner, width ?? FALLBACK_DIMENSIONS.width);
  if (!selectedImage?.url) {
    // Nothing to render if image is missing
    return null;
  }

  const cardBaseStyle = useMemo(() => {
    if (!styleOptions) return undefined;
    const base = computeMediaCardStyle(styleOptions);
    return {
      ...base,
      borderRadius: borderRadiusMap[styleOptions.borderRadius]
    } satisfies CSSProperties;
  }, [styleOptions]);

  const hashStyleValue = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  };

  const hoverData = useMemo(() => {
    if (!styleOptions) return { className: '', css: '' };

    const hoverDeclarations: string[] = [];

    // Apply hover effect based on configuration
    if (styleOptions.hoverEffect === 'shadow') {
      // Default shadow: X=3, Y=4, Blur=8, Spread=0, #000000 at 25%
      const shadowValue = styleOptions.hoverShadowSize
        ? hoverShadowMap[styleOptions.hoverShadowSize]
        : '3px 4px 8px 0px rgba(0, 0, 0, 0.25)';

      hoverDeclarations.push(`box-shadow: ${shadowValue} !important;`);
      // Remove border on hover when shadow effect is active
      hoverDeclarations.push('border-width: 0px !important;');
      hoverDeclarations.push('border-style: none !important;');
      hoverDeclarations.push('border-color: transparent !important;');
    }

    const className = `banner-card-style-${hashStyleValue(JSON.stringify(styleOptions))}`;
    const css = hoverDeclarations.length ? `.${className}:hover { ${hoverDeclarations.join(' ')} }` : '';
    return { className, css };
  }, [styleOptions]);

  const shouldRenderHoverTint =
    Boolean(styleOptions?.hoverBackgroundColor) && styleOptions?.hoverEffect !== 'shadow';

  const href =
    banner?.link ??
    banner?.linkUrl ??
    (slug ? `/${lang}${slug}` : undefined);

  const linkProps: Record<string, any> = {};
  if (banner?.openInNewTab) {
    linkProps.target = '_blank';
    linkProps.rel = 'noopener noreferrer';
  }

  const imageNode = (
    <div
      className={cn(
        'relative flex h-full w-full justify-center',
        classNameInner,
        forceFullHeight && 'min-h-full',
        hoverData.className
      )}
      style={cardBaseStyle}
    >
      <div
        className={cn(
          'relative flex h-full w-full justify-center overflow-hidden',
          styleOptions && {
            'rounded-none': styleOptions.borderRadius === 'none',
            'rounded-sm': styleOptions.borderRadius === 'sm',
            'rounded-md': styleOptions.borderRadius === 'md',
            'rounded-lg': styleOptions.borderRadius === 'lg',
            'rounded-xl': styleOptions.borderRadius === 'xl',
            'rounded-2xl': styleOptions.borderRadius === '2xl',
            'rounded-full': styleOptions.borderRadius === 'full',
          }
        )}
      >
        {shouldRenderHoverTint ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{
              backgroundColor: styleOptions?.hoverBackgroundColor,
              mixBlendMode: 'multiply'
            }}
          />
        ) : null}
        <Image
          src={selectedImage.url}
          width={selectedImage.width}
          height={selectedImage.height}
          alt={selectedImage.alt || title || ''}
          quality={100}
          priority
          sizes={forceFullHeight ? '100vw' : undefined}
          className={cn(
            'bg-fill-thumbnail w-full object-center',
            forceFullHeight ? 'object-cover h-full' : 'object-cover',
            variant === 'rounded' && 'rounded-md',
            styleOptions && {
              'rounded-none': styleOptions.borderRadius === 'none',
              'rounded-sm': styleOptions.borderRadius === 'sm',
              'rounded-md': styleOptions.borderRadius === 'md',
              'rounded-lg': styleOptions.borderRadius === 'lg',
              'rounded-xl': styleOptions.borderRadius === 'xl',
              'rounded-2xl': styleOptions.borderRadius === '2xl',
              'rounded-full': styleOptions.borderRadius === 'full',
            }
          )}
          style={{
            borderRadius: styleOptions ? borderRadiusMap[styleOptions.borderRadius] : undefined,
            height: forceFullHeight ? '100%' : undefined,
            width: forceFullHeight ? '100%' : undefined
          }}
        />
        {effectActive && (
          <div className="absolute top-0 block w-1/2 h-full transform -skew-x-12 ltr:-left-full rtl:-right-full z-5 bg-gradient-to-r from-transparent to-white opacity-30 group-hover:animate-shine" />
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('mx-auto w-full', !noPadding && 'p-2.5', className, forceFullHeight && 'h-full')}>
      {hoverData.css ? <style dangerouslySetInnerHTML={{ __html: hoverData.css }} /> : null}
      {href ? (
        <Link
          href={href}
          aria-label={title}
          className={cn('group block', forceFullHeight && 'h-full')}
          {...linkProps}
        >
          {imageNode}
        </Link>
      ) : (
        <div className={cn('group block', forceFullHeight && 'h-full')} aria-label={title}>
          {imageNode}
        </div>
      )}
    </div>
  );
};

export default BannerCard;
