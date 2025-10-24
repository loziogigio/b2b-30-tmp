interface MediaImageConfig {
  imageUrl: string;
  alt?: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  width?: string;
  maxWidth?: string;
  alignment?: "left" | "center" | "right";
}

interface MediaImageBlockProps {
  config: MediaImageConfig;
}

export function MediaImageBlock({ config }: MediaImageBlockProps) {
  const {
    imageUrl,
    alt = "Product image",
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

  // If there's a link, wrap the image in an anchor tag
  if (linkUrl) {
    return (
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
    );
  }

  // No link, just show the image
  return (
    <div className={containerClass} style={{ width, maxWidth: maxWidth === "none" ? undefined : maxWidth }}>
      {imageElement}
    </div>
  );
}
