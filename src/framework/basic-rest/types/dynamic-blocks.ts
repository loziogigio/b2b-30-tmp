// Per-product dynamic-blocks types (b2b-local copy of the canonical commerce-suite
// shape). Kept here because the storefront consumes a loosely-typed API response;
// the shared vinc-pim package is intentionally not modified for this feature.
export type DynamicBlockSection = 1 | 2 | 3 | 4;
export type DynamicBlockColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type BlockElementKind = 'image' | 'video' | '3d' | 'text';
export interface BlockLink { href: string; new_tab: boolean; }
export interface BlockElementBase { id: string; link?: BlockLink; description?: string; }
export interface MediaElement extends BlockElementBase {
  kind: 'image' | 'video' | '3d';
  media: { url: string; cdn_key?: string; is_external_link?: boolean; alt?: string };
}
export interface TextElement extends BlockElementBase { kind: 'text'; text: string; }
export type BlockElement = MediaElement | TextElement;
export interface DynamicBlock {
  id: string; lang: string; title?: string;
  section: DynamicBlockSection; order: number; columns: DynamicBlockColumns;
  is_active: boolean; elements: BlockElement[];
}
export type DynamicBlocks = DynamicBlock[];
