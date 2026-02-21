export interface FilterOption {
  value: string;
  label: string;
  checked: boolean;
}

export interface FilterSection {
  id: string;
  name: string;
  options: FilterOption[];
}

export interface SubCategory {
  name: string;
  href: string;
}

export interface SortOption {
  name: string;
  href: string;
  current: boolean;
}

export interface CategoryProduct {
  id: number | string;
  name: string;
  href: string;
  price: string;
  availability: string;
  imageSrc: string;
  imageAlt: string;
}
