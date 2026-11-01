// Relative asset paths, so the build works at a domain root or under a subpath such as /Temptation/.
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
});
