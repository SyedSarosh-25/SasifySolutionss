process.env.NODE_ENV ||= "production";

try {
  await import("./build/boot.js");
} catch (error) {
  console.error("Failed to start Sasify server", error);
  process.exitCode = 1;
}
