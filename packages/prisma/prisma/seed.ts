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

const DEMO_CUSTOMERS = [
  { name: "Fatima Rahman", phone: "01711000001" },
  { name: "Arif Hossain", phone: "01711000002" },
  { name: "Nusrat Jahan", phone: "01711000003" },
  { name: "Kamal Uddin", phone: "01711000004" },
];

// Orders per day, oldest (13 days ago) to newest (today) - deliberately
// includes zero-order days so the Dashboard's sales trend chart (Part
// 18.1) demonstrably renders a 0 bar rather than a gap, not just a
// monotonic-looking bar chart that could hide a missing-day bug.
const ORDER_COUNTS_BY_DAY = [2, 1, 3, 0, 2, 4, 1, 3, 2, 0, 3, 2, 4, 2];

// Per SRS Part 18.1 - populates the demo store with enough Order history
// that the Dashboard's sales trend chart, revenue KPI, and pending-COD KPI
// all show real (not all-zero) data out of the box. Skipped if this store
// already has orders, so re-running the seed never piles up duplicates.
async function seedDemoOrders(storeId: string, products: Array<{ id: string; basePrice: number; variants: Array<{ id: string }> }>) {
  const existingCount = await prisma.order.count({ where: { storeId } });
  if (existingCount > 0) return;

  const deliveryArea = await prisma.deliveryArea.upsert({
    where: { storeId_name: { storeId, name: "Dhaka Metro" } },
    update: {},
    create: { storeId, name: "Dhaka Metro", deliveryCharge: 60 },
  });

  const customers = await Promise.all(
    DEMO_CUSTOMERS.map((c) =>
      prisma.customer.upsert({
        where: { storeId_phone: { storeId, phone: c.phone } },
        update: {},
        create: { storeId, name: c.name, phone: c.phone },
      }),
    ),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let orderCount = 0;
  for (let dayIndex = 0; dayIndex < ORDER_COUNTS_BY_DAY.length; dayIndex++) {
    const daysAgo = ORDER_COUNTS_BY_DAY.length - 1 - dayIndex;
    const isRecent = daysAgo <= 1; // today/yesterday - still awaiting COD confirmation

    for (let i = 0; i < ORDER_COUNTS_BY_DAY[dayIndex]; i++) {
      const createdAt = new Date(today);
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(9 + ((orderCount * 3) % 10), (orderCount * 17) % 60, 0, 0);

      const customer = customers[orderCount % customers.length];
      const product = products[orderCount % products.length];
      const variant = product.variants[orderCount % product.variants.length];
      const quantity = 1 + (orderCount % 3);
      const total = product.basePrice * quantity + deliveryArea.deliveryCharge.toNumber();

      const status = isRecent ? (orderCount % 2 === 0 ? "PENDING" : "CONFIRMED") : orderCount % 5 === 0 ? "CANCELLED" : "DELIVERED";
      const isPaid = status === "DELIVERED";

      const order = await prisma.order.create({
        data: {
          storeId,
          customerId: customer.id,
          status,
          paymentMethod: "CASH_ON_DELIVERY",
          codConfirmedByCall: !isRecent,
          deliveryAddress: "House 12, Road 5, Dhanmondi, Dhaka",
          deliveryAreaId: deliveryArea.id,
          isPaid,
          total,
          createdAt,
          updatedAt: createdAt,
          items: {
            create: [{ productId: product.id, variantId: variant.id, quantity, unitPrice: product.basePrice }],
          },
        },
      });

      await prisma.orderStatusHistory.create({
        data: { orderId: order.id, status: order.status, note: null, createdAt },
      });

      orderCount++;
    }
  }

  console.log(`Seeded ${orderCount} demo orders across the last ${ORDER_COUNTS_BY_DAY.length} days.`);
}

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

  const productRecords: Array<{ id: string; basePrice: number; variants: Array<{ id: string }> }> = [];
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
        status: "ACTIVE",
        slug: p.slug,
      },
    });

    const variants: Array<{ id: string }> = [];
    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { stock: v.stock },
        create: { productId: product.id, sku: v.sku, attributes: v.attributes, stock: v.stock },
      });
      variants.push({ id: variant.id });
    }
    productRecords.push({ id: product.id, basePrice: p.basePrice, variants });
  }

  await seedDemoOrders(store.id, productRecords);

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
