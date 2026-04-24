import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const vendorRoot = resolve(repoRoot, "vendor", "trading_view");
const chartingLibrarySource = resolve(vendorRoot, "charting_library");
const datafeedsSource = resolve(vendorRoot, "datafeeds");
const outputRoot = resolve(repoRoot, "public", "vendor", "tradingview");

if (!existsSync(chartingLibrarySource) || !existsSync(datafeedsSource)) {
  throw new Error(
    [
      "TradingView vendor assets are missing.",
      "Expected vendor/trading_view to contain charting_library and datafeeds.",
      "If this repo is using the vendored submodule, run: git submodule update --init --recursive",
    ].join(" ")
  );
}

rmSync(outputRoot, { force: true, recursive: true });
mkdirSync(outputRoot, { recursive: true });

cpSync(chartingLibrarySource, resolve(outputRoot, "charting_library"), {
  recursive: true,
});
cpSync(datafeedsSource, resolve(outputRoot, "datafeeds"), {
  recursive: true,
});

console.log("[sync:tradingview] Copied TradingView assets into public/vendor/tradingview");
