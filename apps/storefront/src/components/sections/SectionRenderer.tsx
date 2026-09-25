import type {
  FeaturedCategoriesSectionSettings,
  FeaturedProductsSectionSettings,
  HeroSectionSettings,
  NewsletterSectionSettings,
  Product,
  ProductGridSectionSettings,
  PromoBannerSectionSettings,
  ThemeSection,
  TrustSectionSettings,
} from "../../lib/api-types";
import { Hero } from "./Hero";
import { FeaturedCategories } from "./FeaturedCategories";
import { FeaturedProducts } from "./FeaturedProducts";
import { ProductGrid } from "./ProductGrid";
import { PromoBanner } from "./PromoBanner";
import { TrustSection } from "./TrustSection";
import { Newsletter } from "./Newsletter";

// Per Section 9 - the homepage is built from this ordered, enabled/
// disabled list; this is the ONE switch statement that decides what a
// section type actually renders as, shared by nothing else (the Admin
// Theme Editor's own preview renders its own, simpler mirror of this - see
// that app's StorefrontPreview component).
export function SectionRenderer({
  sections,
  products,
  productsLoading,
  productsError,
  cardStyle,
  selectedCategoryId,
  onSelectCategory,
}: {
  sections: ThemeSection[];
  products: Product[];
  productsLoading: boolean;
  productsError: boolean;
  cardStyle: "minimal" | "bordered" | "shadow";
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}) {
  const filteredProducts = selectedCategoryId ? products.filter((p) => p.category?.id === selectedCategoryId) : products;

  return (
    <>
      {sections
        .filter((section) => section.enabled)
        .map((section) => {
          switch (section.type) {
            case "hero":
              return <Hero key={section.id} settings={section.settings as unknown as HeroSectionSettings} />;
            case "featured-categories":
              return (
                <FeaturedCategories
                  key={section.id}
                  settings={section.settings as unknown as FeaturedCategoriesSectionSettings}
                  products={products}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={onSelectCategory}
                />
              );
            case "featured-products":
              return (
                <FeaturedProducts
                  key={section.id}
                  settings={section.settings as unknown as FeaturedProductsSectionSettings}
                  products={products}
                  isLoading={productsLoading}
                  cardStyle={cardStyle}
                />
              );
            case "product-grid":
              return (
                <ProductGrid
                  key={section.id}
                  settings={section.settings as unknown as ProductGridSectionSettings}
                  products={filteredProducts}
                  isLoading={productsLoading}
                  isError={productsError}
                  cardStyle={cardStyle}
                />
              );
            case "promo-banner":
              return <PromoBanner key={section.id} settings={section.settings as unknown as PromoBannerSectionSettings} />;
            case "trust":
              return <TrustSection key={section.id} settings={section.settings as unknown as TrustSectionSettings} />;
            case "newsletter":
              return <Newsletter key={section.id} settings={section.settings as unknown as NewsletterSectionSettings} />;
            default:
              return null;
          }
        })}
    </>
  );
}
