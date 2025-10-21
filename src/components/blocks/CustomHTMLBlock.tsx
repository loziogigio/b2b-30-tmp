import type { CustomHTMLBlockConfig } from "@/lib/types/blocks";

interface CustomHTMLBlockProps {
  config: CustomHTMLBlockConfig;
}

export function CustomHTMLBlock({ config }: CustomHTMLBlockProps) {
  const { html, containerClass = "" } = config;

  return (
    <div className={`custom-html-block ${containerClass}`}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
