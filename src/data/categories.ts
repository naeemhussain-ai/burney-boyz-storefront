export interface Category {
  slug: string;
  name: string;
  description: string;
  image: string;
}

export const categories: Category[] = [
  {
    slug: "electronics-gadgets",
    name: "Electronics & Gadgets",
    description: "Smart tech, audio, and trending gadgets for everyday life.",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "home-kitchen",
    name: "Home & Kitchen",
    description: "Clever home upgrades and kitchen essentials.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    description: "Skincare, grooming, and self-care must-haves.",
    image: "https://images.unsplash.com/photo-1522335789203-aaa2f6df0a87?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "fashion-accessories",
    name: "Fashion & Accessories",
    description: "On-trend pieces that turn heads.",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "fitness-outdoors",
    name: "Fitness & Outdoors",
    description: "Gear up for workouts, adventures, and everything between.",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "pet-supplies",
    name: "Pet Supplies",
    description: "Treats, toys, and essentials your pets will love.",
    image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80",
  },
];
