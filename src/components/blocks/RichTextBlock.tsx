import type { RichTextBlockConfig } from "@/lib/types/blocks";

interface RichTextBlockProps {
  config: RichTextBlockConfig;
}

export function RichTextBlock({ config }: RichTextBlockProps) {
  const { content, width = "contained", textAlign = "left", padding = "medium" } = config;

  const paddingClass = {
    none: "",
    small: "py-4",
    medium: "py-8",
    large: "py-16"
  }[padding];

  const widthClass = width === "full" ? "w-full" : "max-w-4xl mx-auto";
  const textAlignClass = `text-${textAlign}`;

  return (
    <div className={`rich-text-block ${paddingClass}`}>
      <div className={`${widthClass} ${textAlignClass}`}>
        <div
          className="prose prose-sm md:prose-base lg:prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}
