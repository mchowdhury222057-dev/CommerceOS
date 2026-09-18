import { Router } from "express";
import { updateThemeDraftSchema, type UpdateThemeDraftInput } from "@commerceos/types";
import { getAuthUser } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { validateBody } from "../middleware/validate.js";
import {
  getOrCreateDraftTheme,
  listThemeVersions,
  publishTheme,
  restoreThemeVersion,
  updateDraftTheme,
} from "../services/theme.service.js";
import { listProducts } from "../services/product.service.js";

// Per SRS Part 7.3/B.3.4 - the Master Admin's own Storefront Builder tool.
// This is NOT gated by impersonation (Part B.3.4: "full access on any
// store, at any time, not only via impersonation - this is the Master
// Admin's own tool"), unlike the Store Dashboard routes under
// store.routes.ts. Mounted under adminRouter, which already applies
// requireAuth + requireMasterAdmin.
export const themeRouter = Router({ mergeParams: true });

themeRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const draft = await getOrCreateDraftTheme(req.params.storeId, getAuthUser(req).id);
    res.json({ draft });
  }),
);

themeRouter.put(
  "/",
  validateBody(updateThemeDraftSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateThemeDraftInput;
    const draft = await updateDraftTheme(req.params.storeId, body);
    res.json({ draft });
  }),
);

themeRouter.post(
  "/publish",
  asyncHandler(async (req, res) => {
    const published = await publishTheme(req.params.storeId, getAuthUser(req));
    res.json({ published });
  }),
);

themeRouter.get(
  "/versions",
  asyncHandler(async (req, res) => {
    const versions = await listThemeVersions(req.params.storeId);
    res.json({ versions });
  }),
);

themeRouter.post(
  "/versions/:versionId/restore",
  asyncHandler(async (req, res) => {
    const draft = await restoreThemeVersion(req.params.storeId, req.params.versionId, getAuthUser(req).id);
    res.status(201).json({ draft });
  }),
);

// Per Section 13/20 - the editor's live preview needs real product data
// ("Do NOT create duplicate products for themes"), but a Master Admin has
// no direct product-list access outside impersonation (requireStoreAccess
// blocks it) - this small read-only endpoint is the one exception, scoped
// to what the preview needs (active products only), reusing the exact
// same product.service.ts query the Store Owner's own product list uses.
themeRouter.get(
  "/preview-products",
  asyncHandler(async (req, res) => {
    const result = await listProducts(req.params.storeId, { status: ["ACTIVE"], pageSize: 24 });
    res.json({ products: result.products });
  }),
);
