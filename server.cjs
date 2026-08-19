process.env.NODE_ENV ||= "production";

// Hostinger's LiteSpeed launcher loads the entry file with require().
// Keep this CommonJS wrapper while the bundled application remains ESM.
import("./build/boot.js").catch((error) => {
  console.error("Failed to start Sasify server", error);
  process.exitCode = 1;
});
