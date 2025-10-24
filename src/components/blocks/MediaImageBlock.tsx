"use client";

import SectionHeader from '@components/common/section-header';

interface MediaImageConfig {
  imageUrl: string;
  alt?: string;
  title?: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  width?: string;
  maxWidth?: string;
  alignment?: "left" | "center" | "right";
}

interface MediaImageBlockProps {
  config: MediaImageConfig;
  lang?: string;
}

export function MediaImageBlock({ config, lang = 'it' }: MediaImageBlockProps) {
  const {
    imageUrl,
    alt = "Product image",
    title,
    linkUrl,
    openInNewTab = true,
    width = "100%",
    maxWidth = "800px",
    alignment = "center"
  } = config;

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

  const imageElement = (
    <img
      src={imageUrl}
      alt={alt}
      className="h-auto rounded-lg shadow-lg transition-transform duration-300 hover:scale-[1.02]"
      style={{
        width,
        maxWidth: maxWidth === "none" ? undefined : maxWidth
      }}
    />
  );

  const containerClass = `my-6 ${alignmentClasses[alignment]}`;

  const contentBlock = linkUrl ? (
    <div className={containerClass} style={{ width, maxWidth: maxWidth === "none" ? undefined : maxWidth }}>
      <a
        href={linkUrl}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        className="block"
      >
        {imageElement}
      </a>
    </div>
  ) : (
    <div className={containerClass} style={{ width, maxWidth: maxWidth === "none" ? undefined : maxWidth }}>
      {imageElement}
    </div>
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
