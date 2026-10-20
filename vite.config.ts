import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [sveltekit()],
  define: {
    __CLUSTER_EMULATORS__: JSON.stringify(
      process.env.PUBLIC_EMULATORS === "true",
    ),
  },
});
