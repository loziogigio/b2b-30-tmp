"use client";

import React from 'react';
import SectionHeader from '@components/common/section-header';

interface MediaImageStyle {
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  paddingX?: number;
  paddingY?: number;
  backgroundColor?: string;
  customCSS?: string; // For expert users
}

interface MediaImageConfig {
  imageUrl: string;
  alt?: string;
  title?: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  width?: string;
  maxWidth?: string;
  alignment?: "left" | "center" | "right";
  style?: MediaImageStyle;
}

interface MediaImageBlockProps {
  config: MediaImageConfig;
  lang?: string;
}

const borderRadiusMap = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px'
};

export function MediaImageBlock({ config, lang = 'it' }: MediaImageBlockProps) {
  const {
    imageUrl,
    alt = "Product image",
    title,
    linkUrl,
    openInNewTab = true,
    width = "100%",
    maxWidth = "800px",
    alignment = "center",
    style
  } = config;

  const defaultStyle: MediaImageStyle = {
    borderWidth: 0,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 'lg',
    paddingX: 0,
    paddingY: 0,
    backgroundColor: 'transparent',
    customCSS: ''
  };

  const styleOptions = { ...defaultStyle, ...(style || {}) };

  if (!imageUrl) {
    return (
      <div className="my-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          No image provided. Please configure the media image block.
        </p>
      </div>
    );
  }

  const alignmentClasses = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto"
  };

  // Build inline styles from style options
  const containerStyle: React.CSSProperties = {
    borderWidth: styleOptions.borderWidth ? `${styleOptions.borderWidth}px` : '0',
    borderColor: styleOptions.borderColor,
    borderStyle: styleOptions.borderStyle === 'none' ? 'none' : styleOptions.borderStyle,
    borderRadius: borderRadiusMap[styleOptions.borderRadius || 'lg'],
    paddingLeft: styleOptions.paddingX ? `${styleOptions.paddingX}px` : '0',
    paddingRight: styleOptions.paddingX ? `${styleOptions.paddingX}px` : '0',
    paddingTop: styleOptions.paddingY ? `${styleOptions.paddingY}px` : '0',
    paddingBottom: styleOptions.paddingY ? `${styleOptions.paddingY}px` : '0',
    backgroundColor: styleOptions.backgroundColor,
    width,
    maxWidth: maxWidth === "none" ? undefined : maxWidth,
  };

  const imageElement = (
    <img
      src={imageUrl}
      alt={alt}
      className="h-auto w-full object-contain transition-transform duration-300 hover:scale-[1.02]"
      style={{
        borderRadius: borderRadiusMap[styleOptions.borderRadius || 'lg']
      }}
    />
  );

  const containerClass = `my-6 ${alignmentClasses[alignment]} overflow-hidden`;

  const contentBlock = linkUrl ? (
    <>
      {styleOptions.customCSS && <style dangerouslySetInnerHTML={{ __html: styleOptions.customCSS }} />}
      <div className={containerClass} style={containerStyle}>
        <a
          href={linkUrl}
          target={openInNewTab ? "_blank" : undefined}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
          className="block"
        >
          {imageElement}
        </a>
      </div>
    </>
  ) : (
    <>
      {styleOptions.customCSS && <style dangerouslySetInnerHTML={{ __html: styleOptions.customCSS }} />}
      <div className={containerClass} style={containerStyle}>
        {imageElement}
      </div>
    </>
  );

  // If there's a title, wrap with section header
  if (title) {
    return (
      <div className="mb-8 lg:mb-10 xl:mb-12">
        <div className="mb-5 md:mb-6">
          <SectionHeader sectionHeading={title} className="mb-0" lang={lang} />
        </div>
        {contentBlock}
      </div>
    );
  }

  // No title, just return the content
  return contentBlock;
}
