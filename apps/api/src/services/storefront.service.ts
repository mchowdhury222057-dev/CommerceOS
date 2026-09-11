import { normalizeStorefrontLayout, normalizeThemeSettings } from "@commerceos/types";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

// Per Part 6.3/22.4 - every function here is public-read, scoped to a single
// ACTIVE store only. A Pending Setup, Suspended, or Archived store is
// deliberately indistinguishable from "doesn't exist" at this boundary -
// the public storefront never reveals a store's internal lifecycle state.
export async function resolveActiveStore(slug: string) {
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store || store.status !== "APPROVED") {
    throw AppError.notFound(`Store "${slug}" not found`);
  }
  return store;
}

// Per Part 7.3/22.4 - pulls the full theme (colors/fonts/layout controls)
// and section-based layout from the Theme Editor's PUBLISHED version, the
// one source of truth the public Storefront app renders from (Section 27 -
// this is the whole point of the Theme Editor, not just an admin-side
// preview). Falls back to the same defaults the Theme Editor itself seeds
// a brand-new draft with (Section 29), so a store that has never published
// a theme still renders a complete, attractive homepage rather than a
// blank one. normalizeStorefrontLayout/normalizeThemeSettings coerce any
// pre-Theme-Editor-milestone data into the current shape on the way out
// (Section 24) - the public storefront never sees legacy JSON.
export async function getPublicStoreInfo(slug: string) {
  const store = await resolveActiveStore(slug);
  const storefront = await prisma.storefront.findUnique({
    where: { storeId: store.id },
    include: { publishedVersion: true },
  });

  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    theme: normalizeThemeSettings(storefront?.publishedVersion?.themeSettings),
    layout: normalizeStorefrontLayout(storefront?.publishedVersion?.layout),
  };
}

export async function listPublicProducts(storeId: string) {
  return prisma.product.findMany({
    where: { storeId, status: "ACTIVE" },
    include: {
      variants: { where: { isActive: true } },
      category: true,
      images: { orderBy: { displayOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPublicProduct(storeId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId, status: "ACTIVE" },
    include: {
      variants: { where: { isActive: true } },
      category: true,
      images: { orderBy: { displayOrder: "asc" } },
    },
  });
  if (!product) throw AppError.notFound(`Product ${productId} not found`);
  return product;
}

// Per Part 10.1 - no customer account/login exists in V1; a phone number is
// the only "credential." Scoped by (storeId, phone) matching Customer's own
// compound unique key, so a phone number's order history in one store is
// never visible via another store's slug.
export async function lookupOrdersByPhone(storeId: string, phone: string) {
  const customer = await prisma.customer.findUnique({ where: { storeId_phone: { storeId, phone } } });
  if (!customer) return [];

  return prisma.order.findMany({
    where: { customerId: customer.id, storeId },
    include: { items: { include: { product: true, variant: true } } },
    orderBy: { createdAt: "desc" },
  });
}
