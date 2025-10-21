import type { SpacerBlockConfig } from "@/lib/types/blocks";

interface SpacerBlockProps {
  config: SpacerBlockConfig;
}

export function SpacerBlock({ config }: SpacerBlockProps) {
  const { height, unit = "px" } = config;

  return <div className="spacer-block" style={{ height: `${height}${unit}` }} />;
}
