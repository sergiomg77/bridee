export interface Dress {
  id: string;
  title: string;
  subtitle: string;
  long_description: string;
  color_name: string;
  color_code: string;
  style_tags: string[];
  image_url: string;
  created_at: string;
}

export interface BoutiqueDress {
  id: string;
  dress_id: string;
  boutique_id: string;
  price: number;
  available_sizes: string[];
  is_active: boolean;
}

export interface DressWithBoutique extends Dress {
  boutique_dresses: BoutiqueDress[];
}
