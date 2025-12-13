// utils/transform/cms-b2b-menu.ts

export interface CmsB2BMenuItem {
  name: string;
  label: string | null;
  title: string | null;
  url: string | null;
  parent_menu: string | null;
  is_group: 0 | 1;
  disable: 0 | 1;
  creation?: string;
  order?: number;
  description?: string | null;
  lft?: number;
  rgt?: number;
  old_parent?: string | null;
  category_menu_image?: string | null;
  category_banner_image?: string | null;
  category_banner_image_mobile?: string | null;
}

export type CmsB2BMenuResponseRaw =
  | CmsB2BMenuItem[]
  | { message?: CmsB2BMenuItem[] };

export interface CmsB2BMenu {
  data: CmsB2BMenuItem[];
}

export type CategoryPill = {
  value: string;
  label: string;
  href?: string;
};

export const mapMenuToPills = (items: CmsB2BMenuItem[]): CategoryPill[] => {
  return items.map((i) => {
    let value = i.name;
    if (i.url) {
      try {
        const qs = new URLSearchParams(i.url.split('?')[1]);
        value = qs.get('category') || i.name;
      } catch {
        /* ignore parse errors */
      }
    }
    const label = i.label || i.title || i.name;
    return { value, label, href: i.url || undefined };
  });
};
