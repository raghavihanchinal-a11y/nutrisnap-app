import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  listAppPublicApiKeys,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME          = "NutriSnap";
const PRODUCT_IDENTIFIER    = "nutrisnap_premium_monthly";
const PLAY_STORE_IDENTIFIER = "nutrisnap_premium_monthly:monthly";
const PRODUCT_DISPLAY_NAME  = "NutriSnap Premium Monthly";
const PRODUCT_USER_TITLE    = "Unlimited Scans – Monthly";
const PRODUCT_DURATION      = "P1M";

const APP_STORE_APP_NAME    = "NutriSnap iOS";
const APP_STORE_BUNDLE_ID   = "com.nutrisnap.app";
const PLAY_STORE_APP_NAME   = "NutriSnap Android";
const PLAY_STORE_PACKAGE    = "com.nutrisnap.app";

const ENTITLEMENT_ID        = "premium";
const ENTITLEMENT_NAME      = "Premium Access";
const OFFERING_ID           = "default";
const OFFERING_NAME         = "Default Offering";
const PACKAGE_ID            = "$rc_monthly";
const PACKAGE_NAME          = "Monthly";

// Test store only supports USD; production prices are set in App Store / Play Store
const PRODUCT_PRICES = [
  { amount_micros: 1_990_000, currency: "USD" }, // $1.99 test store price
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ─────────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existing = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existing) {
    console.log("Project already exists:", existing.id);
    project = existing;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // ── Apps ────────────────────────────────────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps?.items.length) throw new Error("No apps found");

  let testApp    = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testApp) throw new Error("No test store app found in project");
  console.log("Test store app:", testApp.id);

  if (!appStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = data;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = data;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // ── Products ────────────────────────────────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    app: App, label: string, identifier: string, isTestStore: boolean,
  ): Promise<Product> => {
    const found = existingProducts.items?.find(
      (p) => p.store_identifier === identifier && p.app_id === app.id,
    );
    if (found) { console.log(`${label} product exists:`, found.id); return found; }

    const body: CreateProductData["body"] = {
      store_identifier: identifier,
      app_id: app.id,
      type: "subscription",
      display_name: PRODUCT_DISPLAY_NAME,
    };
    if (isTestStore) {
      body.subscription = { duration: PRODUCT_DURATION };
      body.title = PRODUCT_USER_TITLE;
    }
    const { data, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${label} product`);
    console.log(`Created ${label} product:`, data.id);
    return data;
  };

  const testProduct      = await ensureProduct(testApp,     "Test Store",  PRODUCT_IDENTIFIER,    true);
  const appStoreProduct  = await ensureProduct(appStoreApp, "App Store",   PRODUCT_IDENTIFIER,    false);
  const playStoreProduct = await ensureProduct(playStoreApp,"Play Store",  PLAY_STORE_IDENTIFIER, false);

  // Add test store prices
  const { error: priceError } = await client.post<TestStorePricesResponse>({
    url: "/projects/{project_id}/products/{product_id}/test_store_prices",
    path: { project_id: project.id, product_id: testProduct.id },
    body: { prices: PRODUCT_PRICES },
  });
  if (priceError) {
    const errType = typeof priceError === "object" && "type" in priceError ? (priceError as any)["type"] : "";
    if (errType === "resource_already_exists") {
      console.log("Test store prices already exist");
    } else {
      console.error("Price error details:", JSON.stringify(priceError, null, 2));
      console.warn("Warning: Could not add test store prices — continuing setup");
    }
  } else {
    console.log("Test store prices added");
  }

  // ── Entitlement ─────────────────────────────────────────────────────────────
  let entitlement: Entitlement;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client, path: { project_id: project.id }, query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEnt = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_ID);
  if (existingEnt) {
    console.log("Entitlement exists:", existingEnt.id);
    entitlement = existingEnt;
  } else {
    const { data, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_ID, display_name: ENTITLEMENT_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", data.id);
    entitlement = data;
  }

  const { error: attachEntErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: [testProduct.id, appStoreProduct.id, playStoreProduct.id] },
  });
  if (attachEntErr && attachEntErr.type !== "unprocessable_entity_error") {
    throw new Error("Failed to attach products to entitlement");
  }
  console.log("Products attached to entitlement");

  // ── Offering ────────────────────────────────────────────────────────────────
  let offering: Offering;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client, path: { project_id: project.id }, query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOff = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_ID);
  if (existingOff) {
    console.log("Offering exists:", existingOff.id);
    offering = existingOff;
  } else {
    const { data, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_ID, display_name: OFFERING_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", data.id);
    offering = data;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Offering set as current");
  }

  // ── Package ──────────────────────────────────────────────────────────────────
  let pkg: Package;
  const { data: existingPackages, error: listPkgsError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPkgsError) throw new Error("Failed to list packages");

  const existingPkg = existingPackages.items?.find((p) => p.lookup_key === PACKAGE_ID);
  if (existingPkg) {
    console.log("Package exists:", existingPkg.id);
    pkg = existingPkg;
  } else {
    const { data, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { lookup_key: PACKAGE_ID, display_name: PACKAGE_NAME },
    });
    if (error) throw new Error("Failed to create package");
    console.log("Created package:", data.id);
    pkg = data;
  }

  const { error: attachPkgErr } = await attachProductsToPackage({
    client,
    path: { project_id: project.id, package_id: pkg.id },
    body: {
      products: [
        { product_id: testProduct.id,      eligibility_criteria: "all" },
        { product_id: appStoreProduct.id,  eligibility_criteria: "all" },
        { product_id: playStoreProduct.id, eligibility_criteria: "all" },
      ],
    },
  });
  if (attachPkgErr && !(attachPkgErr.type === "unprocessable_entity_error" && attachPkgErr.message?.includes("Cannot attach"))) {
    throw new Error("Failed to attach products to package");
  }
  console.log("Products attached to package");

  // ── API Keys ─────────────────────────────────────────────────────────────────
  const getKey = async (app: App, label: string) => {
    const { data, error } = await listAppPublicApiKeys({
      client,
      path: { project_id: project.id, app_id: app.id },
    });
    if (error) throw new Error(`Failed to get ${label} API keys`);
    return data?.items.map((i) => i.key).join(", ") ?? "N/A";
  };

  const testKey    = await getKey(testApp,     "Test Store");
  const iosKey     = await getKey(appStoreApp, "App Store");
  const androidKey = await getKey(playStoreApp,"Play Store");

  console.log("\n==================== SETUP COMPLETE ====================");
  console.log("Project ID:                   ", project.id);
  console.log("Test Store App ID:            ", testApp.id);
  console.log("App Store App ID:             ", appStoreApp.id);
  console.log("Play Store App ID:            ", playStoreApp.id);
  console.log("Entitlement Identifier:       ", ENTITLEMENT_ID);
  console.log("");
  console.log("Set these environment variables:");
  console.log("REVENUECAT_PROJECT_ID=         ", project.id);
  console.log("REVENUECAT_TEST_STORE_APP_ID=  ", testApp.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=   ", testKey);
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=    ", iosKey);
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=", androidKey);
  console.log("=========================================================\n");
}

seedRevenueCat().catch(console.error);
