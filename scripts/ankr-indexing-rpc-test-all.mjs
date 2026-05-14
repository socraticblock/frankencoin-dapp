/**
 * Same as ankr-indexing-rpc-test.mjs but forces ANKR_TEST_PROFILE=all (8-chain stress).
 * Load order: env must be set before the main module runs.
 */
process.env.ANKR_TEST_PROFILE = "all";
await import("./ankr-indexing-rpc-test.mjs");
