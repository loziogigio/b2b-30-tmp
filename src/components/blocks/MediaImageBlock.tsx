"use client";

import { useMemo, type CSSProperties } from "react";
import cn from "classnames";
import { computeMediaCardStyle, computeMediaHoverDeclarations, borderRadiusMap } from '@/lib/home-settings/media-card-style';

interface MediaImageStyle {
  borderWidth: number;
  borderColor: string;
  borderStyle: "solid" | "dashed" | "dotted" | "none";
  borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  shadowSize: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
  shadowColor: string;
  backgroundColor: string;
  hoverEffect: "none" | "lift" | "shadow" | "scale" | "border" | "glow";
  hoverScale?: number;
  hoverShadowSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  hoverBackgroundColor?: string;
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
}

export function MediaImageBlock({ config }: MediaImageBlockProps) {
  const {
    imageUrl,
    alt = "Product image",
    title,
    linkUrl,
    openInNewTab = true,
    width = "100%",
    maxWidth = "800px",
    alignment = "center",
    style: incomingStyle
  } = config;

  const defaultStyle: MediaImageStyle = {
    borderWidth: 0,
    borderColor: "#EAEEF2",
    borderStyle: "solid",
    borderRadius: "md",
    shadowSize: "none",
    shadowColor: "rgba(0, 0, 0, 0.15)",
    backgroundColor: "#ffffff",
    hoverEffect: "none",
    hoverScale: 1.02,
    hoverShadowSize: "lg",
    hoverBackgroundColor: ""
  };

  const styleOptions: MediaImageStyle = useMemo(
    () => ({
      ...defaultStyle,
      ...(incomingStyle || {})
    }),
    [incomingStyle]
  );

  const alignmentClasses = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto"
  };

  const borderRadiusValue = borderRadiusMap[styleOptions.borderRadius];
  const cardStyle = useMemo(() => {
    const base = computeMediaCardStyle(styleOptions);
    return {
      ...base,
      borderRadius: borderRadiusValue
    } satisfies CSSProperties;
  }, [styleOptions, borderRadiusValue]);

  const createHash = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  };

  const hoverData = useMemo(() => {
    if (!styleOptions) {
      return { className: "", css: "" };
    }
    const hash = createHash(JSON.stringify(styleOptions));
    const className = `media-image-card-${hash}`;
    const declarations = computeMediaHoverDeclarations(styleOptions);
    const css = declarations.length ? `.${className}:hover { ${declarations.join(" ")} }` : "";
    return { className, css };
  }, [styleOptions]);

  const shouldRenderHoverTint =
    Boolean(styleOptions.hoverBackgroundColor) && styleOptions.hoverEffect !== 'shadow';

  const containerClass = [`my-6`, alignmentClasses[alignment]].filter(Boolean).join(" ");
  const sizeStyle: CSSProperties = {
    width,
    maxWidth: maxWidth === "none" ? undefined : maxWidth
  };

  const imageElement = (
    <>
      <img
        src={imageUrl}
        alt={alt}
        className="block h-auto w-full object-contain"
      />
      {title && (
        <div className="mt-2 text-center">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      )}
    </>
  );

  // If there's a link, wrap the image in an anchor tag
  if (linkUrl) {
    return (
      <div className={containerClass} style={sizeStyle}>
        <a
          href={linkUrl}
          target={openInNewTab ? "_blank" : undefined}
          rel={openInNewTab ? "noopener noreferrer" : undefined}
          className="group block"
        >
          {hoverData.css ? <style dangerouslySetInnerHTML={{ __html: hoverData.css }} /> : null}
          <div
            className={['relative w-full transition-all duration-200', hoverData.className].filter(Boolean).join(' ')}
            style={cardStyle}
          >
            {shouldRenderHoverTint ? (
              <div
                className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ backgroundColor: styleOptions.hoverBackgroundColor, mixBlendMode: 'multiply' }}
              />
            ) : null}
            <div className="relative overflow-hidden" style={{ borderRadius: borderRadiusValue }}>
              {imageElement}
            </div>
          </div>
        </a>
      </div>
    );
  }

  // No link, just show the image
  if (!imageUrl) {
    return (
      <div className="my-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          No image provided. Please configure the media image block.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(containerClass, 'group')} style={sizeStyle}>
      {hoverData.css ? <style dangerouslySetInnerHTML={{ __html: hoverData.css }} /> : null}
      <div
        className={['relative w-full transition-all duration-200', hoverData.className].filter(Boolean).join(' ')}
        style={cardStyle}
      >
        {shouldRenderHoverTint ? (
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ backgroundColor: styleOptions.hoverBackgroundColor, mixBlendMode: 'multiply' }}
          />
        ) : null}
        <div className="relative overflow-hidden" style={{ borderRadius: borderRadiusValue }}>
          {imageElement}
        </div>
      </div>
    </div>
  );
}
