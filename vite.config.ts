// Relative asset paths, so the build works at a domain root or under a subpath such as /Temptation/.
// The dev server ignores dist/, so running a build does not reload pages open on the dev server.
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    watch: { ignored: ["**/dist/**"] },
  },
});
