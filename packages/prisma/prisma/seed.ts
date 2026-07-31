// Demo/dev-only seed data. Never run against a production database - it
// upserts a fixed Master Administrator and Store Owner with known
// passwords printed to stdout, which is only acceptable for local
// development per SRS Part 27's budget/tooling assumptions.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/client/index.js";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

const MASTER_ADMIN_EMAIL = "admin@commerceos.dev";
const MASTER_ADMIN_PASSWORD = "AdminPass123!";
const STORE_OWNER_EMAIL = "owner@demostore.dev";
const STORE_OWNER_PASSWORD = "OwnerPass123!";

interface SeedVariant {
  sku: string;
  attributes: Record<string, string>;
  stock: number;
}

interface SeedProduct {
  name: string;
  description: string;
  basePrice: number;
  slug: string;
  variants: SeedVariant[];
}

// Matches the original milestone's seed style: a small, varied catalog
// including one deliberately low-stock variant so the low-stock badge and
// the risk-adjacent Dashboard views have something to actually show.
const PRODUCTS: SeedProduct[] = [
  {
    name: "Classic Cotton T-Shirt",
    description: "A soft, breathable everyday t-shirt.",
    basePrice: 590,
    slug: "classic-cotton-tshirt",
    variants: [
      { sku: "TSHIRT-S-BLK", attributes: { size: "S", color: "Black" }, stock: 25 },
      { sku: "TSHIRT-M-BLK", attributes: { size: "M", color: "Black" }, stock: 40 },
      { sku: "TSHIRT-L-BLK", attributes: { size: "L", color: "Black" }, stock: 15 },
    ],
  },
  {
    name: "Denim Jacket",
    description: "A durable, classic-fit denim jacket.",
    basePrice: 2490,
    slug: "denim-jacket",
    variants: [
      { sku: "JACKET-M-BLU", attributes: { size: "M", color: "Blue" }, stock: 10 },
      { sku: "JACKET-L-BLU", attributes: { size: "L", color: "Blue" }, stock: 8 },
    ],
  },
  {
    name: "Canvas Tote Bag",
    description: "A sturdy canvas tote for everyday carry.",
    basePrice: 390,
    slug: "canvas-tote-bag",
    variants: [{ sku: "TOTE-ONE-NAT", attributes: { size: "One Size", color: "Natural" }, stock: 60 }],
  },
  {
    name: "Leather Wallet",
    description: "A slim bifold wallet in genuine leather.",
    basePrice: 890,
    slug: "leather-wallet",
    // Intentionally below the default lowStockThreshold (5) - exercises
    // the ProductStockLow path (Part D.3.2) once an order confirms against it.
    variants: [{ sku: "WALLET-ONE-BRN", attributes: { size: "One Size", color: "Brown" }, stock: 3 }],
  },
];

async function main() {
  console.log("Seeding CommerceOS demo data...\n");

  const [masterAdminPasswordHash, storeOwnerPasswordHash] = await Promise.all([
    bcrypt.hash(MASTER_ADMIN_PASSWORD, BCRYPT_ROUNDS),
    bcrypt.hash(STORE_OWNER_PASSWORD, BCRYPT_ROUNDS),
  ]);

  // Master Administrator - platform-wide, storeId is null (Part 4/20.1).
  await prisma.user.upsert({
    where: { email: MASTER_ADMIN_EMAIL },
    update: { passwordHash: masterAdminPasswordHash, role: "MASTER_ADMIN", status: "ACTIVE", storeId: null },
    create: {
      email: MASTER_ADMIN_EMAIL,
      name: "Master Admin",
      passwordHash: masterAdminPasswordHash,
      role: "MASTER_ADMIN",
      status: "ACTIVE",
      storeId: null,
    },
  });

  // Demo store + its Storefront container (Part 7.1 - a Store always has
  // exactly one Storefront, created alongside it per D.2.1's real flow).
  const store = await prisma.store.upsert({
    where: { slug: "demo-store" },
    update: {},
    create: { name: "Demo Store", slug: "demo-store", status: "ACTIVE" },
  });

  await prisma.storefront.upsert({
    where: { storeId: store.id },
    update: {},
    create: { storeId: store.id },
  });

  const storeOwner = await prisma.user.upsert({
    where: { email: STORE_OWNER_EMAIL },
    update: { passwordHash: storeOwnerPasswordHash, role: "STORE_OWNER", status: "ACTIVE", storeId: store.id },
    create: {
      email: STORE_OWNER_EMAIL,
      name: "Demo Store Owner",
      passwordHash: storeOwnerPasswordHash,
      role: "STORE_OWNER",
      status: "ACTIVE",
      storeId: store.id,
    },
  });

  const category = await prisma.category.upsert({
    where: { storeId_slug: { storeId: store.id, slug: "general" } },
    update: {},
    create: { storeId: store.id, name: "General", slug: "general" },
  });

  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { storeId_slug: { storeId: store.id, slug: p.slug } },
      update: {},
      create: {
        storeId: store.id,
        name: p.name,
        description: p.description,
        categoryId: category.id,
        basePrice: p.basePrice,
        images: [],
        status: "ACTIVE",
        slug: p.slug,
      },
    });

    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { stock: v.stock },
        create: { productId: product.id, sku: v.sku, attributes: v.attributes, stock: v.stock },
      });
    }
  }

  console.log("Seed complete.\n");
  console.log("================ LOGIN CREDENTIALS ================");
  console.log("Master Administrator  ->  apps/admin-panel  (http://localhost:5173)");
  console.log(`  Email:    ${MASTER_ADMIN_EMAIL}`);
  console.log(`  Password: ${MASTER_ADMIN_PASSWORD}`);
  console.log();
  console.log("Store Owner           ->  apps/store-dashboard  (http://localhost:5174)");
  console.log(`  Email:    ${STORE_OWNER_EMAIL}`);
  console.log(`  Password: ${STORE_OWNER_PASSWORD}`);
  console.log(`  Store:    ${store.name} (slug: ${store.slug}, id: ${store.id})`);
  console.log();
  console.log(`Seeded ${PRODUCTS.length} products for user ${storeOwner.email}.`);
  console.log("=====================================================");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
