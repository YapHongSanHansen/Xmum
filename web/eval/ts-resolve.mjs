// Lets plain Node run the eval's TypeScript (Node 22.18+ strips types natively,
// so no build step or extra dependency). The app's sources use extensionless
// relative imports, which the Next bundler allows and Node does not; this hook
// retries those with ".ts" so Node can find them.
import * as nodeModule from "node:module";

const { registerHooks } = nodeModule;
if (typeof registerHooks !== "function" || !process.features.typescript) {
  console.error(`pnpm eval:bukti needs Node 22.18 or later (native TypeScript); this is Node ${process.versions.node}.`);
  process.exit(1);
}

const SUFFIXES = [".ts", "/index.ts"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (e) {
      const relative = specifier.startsWith("./") || specifier.startsWith("../");
      if (!relative || e?.code !== "ERR_MODULE_NOT_FOUND") throw e;
      for (const suffix of SUFFIXES) {
        try {
          return nextResolve(specifier + suffix, context);
        } catch {
          // try the next suffix
        }
      }
      throw e;
    }
  },
});
