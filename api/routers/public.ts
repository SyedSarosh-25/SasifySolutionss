import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { Category, InventoryItem, Product, ProductPlan, SiteSetting, ThirdPartyProduct, clean, cleanMany } from "../mongo/models";
import { publicSettingsRecord, publicSiteSettingsRecord } from "../lib/site-settings-security";
import { toCustomerDirectProduct, toCustomerThirdPartyProduct } from "../lib/public-third-party-catalog";

async function categoryMap() {
  const categories = cleanMany(await Category.find().lean());
  return new Map(categories.map((category: any) => [category.id, category]));
}

export const publicRouter = createRouter({
  search: publicQuery
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      await connectDb();
      const categories = await categoryMap();
      const products = cleanMany(await Product.find({
        status: "active",
        name: { $regex: input.query, $options: "i" },
      }).limit(10).lean());

      return products.map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        categoryName: categories.get(product.categoryId)?.name ?? "Uncategorized",
        shortDescription: product.shortDescription,
      }));
    }),

  productList: publicQuery
    .input(z.object({
      categoryId: z.number().optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      await connectDb();
      const filter: Record<string, unknown> = { status: "active" };
      if (input?.categoryId) filter.categoryId = input.categoryId;

      const categories = await categoryMap();
      const products = cleanMany(await Product.find(filter)
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 20)
        .lean());

      return Promise.all(products.map(async (product: any) => {
        const cheapestPlan = clean(await ProductPlan.findOne({ productId: product.id, isActive: true }).sort({ id: 1 }).lean()) as any;
        const category = categories.get(product.categoryId);
        return {
          ...product,
          categoryName: category?.name ?? "Uncategorized",
          categorySlug: category?.slug ?? "",
          startingPrice: cheapestPlan?.salePrice ?? cheapestPlan?.price ?? "0",
          deliveryTime: cheapestPlan?.deliveryTime ?? "N/A",
        };
      }));
    }),

  productBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      await connectDb();
      const product = clean(await Product.findOne({ slug: input.slug, status: "active" }).lean()) as any;
      if (!product) return null;

      const category = clean(await Category.findOne({ id: product.categoryId }).lean()) as any;
      const plans = cleanMany(await ProductPlan.find({ productId: product.id, isActive: true }).sort({ id: 1 }).lean());
      const relatedProducts = cleanMany(await Product.find({
        categoryId: product.categoryId,
        status: "active",
        id: { $ne: product.id },
      }).limit(3).lean());

      const related = relatedProducts.map((item: any) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        shortDescription: item.shortDescription,
        categoryName: category?.name ?? "Uncategorized",
      }));

      return {
        ...product,
        categoryName: category?.name ?? "Uncategorized",
        categorySlug: category?.slug ?? "",
        plans,
        related,
      };
    }),

  categoryList: publicQuery.query(async () => {
    await connectDb();
    return cleanMany(await Category.find().sort({ id: 1 }).lean());
  }),

  thirdPartyProductList: publicQuery.query(async () => {
    await connectDb();
    const allProducts = cleanMany(await ThirdPartyProduct.find().sort({ updatedAt: -1 }).lean()) as any[];
    const products = allProducts.filter((product) => product.status === "active");
    const originalPriceByDuplicate = new Map<string, any>();
    for (const product of allProducts) {
      const originalPriceUsd = Number(product.originalPriceUsd || 0);
      const originalDisplayAmount = Number(product.originalPriceDisplayAmount || 0);
      if (originalPriceUsd > 0 || originalDisplayAmount > 0) {
        originalPriceByDuplicate.set(product.duplicateKey, product);
      }
    }
    const cheapest = new Map<string, any>();
    for (const product of products) {
      const existing = cheapest.get(product.duplicateKey);
      if (!existing || Number(product.sourcePriceUsd) < Number(existing.sourcePriceUsd)) {
        cheapest.set(product.duplicateKey, product);
      }
    }
    const thirdParty = [...cheapest.values()].map((product) =>
      toCustomerThirdPartyProduct(product, originalPriceByDuplicate.get(product.duplicateKey) ?? product)
    );

    const directProducts = cleanMany(await Product.find({ status: "active" }).lean()) as any[];
    const direct = await Promise.all(directProducts.map(async (product: any) => {
      const category = clean(await Category.findOne({ id: product.categoryId }).lean()) as any;
      const plan = clean(await ProductPlan.findOne({ productId: product.id, isActive: true }).sort({ id: 1 }).lean()) as any;
      if (!plan) return null;
      const availableStock = product.fulfillmentType === "whatsapp_activation"
        ? 0
        : await InventoryItem.countDocuments({
            productId: product.id,
            status: "available",
            $or: [{ planId: plan.id }, { planId: null }, { planId: { $exists: false } }],
          });
      return toCustomerDirectProduct({
        product,
        plan,
        categoryName: category?.name ?? "Digital Tools",
        availableStock,
      });
    }));

    return [...thirdParty, ...direct.filter(Boolean)];
  }),

  categoryBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      await connectDb();
      const category = clean(await Category.findOne({ slug: input.slug }).lean()) as any;
      if (!category) return null;

      const products = cleanMany(await Product.find({ categoryId: category.id, status: "active" }).lean());
      return {
        ...category,
        products: products.map((product: any) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          categoryName: category.name,
        })),
      };
    }),

  publicSettings: publicQuery.query(async () => {
    await connectDb();
    const settings = cleanMany(await SiteSetting.find().lean());
    return publicSettingsRecord(settings as any[]);
  }),

  siteSettings: publicQuery.query(async () => {
    await connectDb();
    const settings = cleanMany(await SiteSetting.find().lean());
    return publicSiteSettingsRecord(settings as any[]);
  }),
});
