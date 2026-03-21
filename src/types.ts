export interface Member {
  id: string;
  name: string;
  bio: string;
  links: string[];
  videoUrl: string;
  image: string;
  order: number;
}

export interface SiteContent {
  home: {
    title: string;
    slogan: string;
    bgImage: string;
    logo?: string;
  };
  about: {
    history: string;
  };
  contact: {
    title: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    youtube: string;
    instagram: string;
    naverBlog: string;
    naverPlace: string;
  };
}

export interface Performance {
  id: string;
  title: string;
  description: string;
  image: string;
  order: number;
}

export interface GalleryItem {
  id: string;
  imageUrl: string;
  description: string;
  order: number;
}

export interface Partner {
  id: string;
  name: string;
  logo: string;
  description: string;
  order: number;
}
