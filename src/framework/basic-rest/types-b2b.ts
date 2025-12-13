export type BannerCardItem = {
  id: number;
  title: string;
  slug: string;
  image: {
    mobile: {
      url: string;
      width: number;
      height: number;
    };
    desktop: {
      url: string;
      width: number;
      height: number;
    };
  };
};

export interface ProductImage {
  id: number;
  thumbnail: string;
  original: string;
}

export interface ProductTag {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: ProductImage;
  gallery: ProductImage[];
  quantity: number;
  sold: number;
  price: number;
  sale_price: number;
  unit: string;
  tag: ProductTag[];
}
