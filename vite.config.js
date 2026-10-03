import { defineConfig } from "vite";

export default defineConfig({
    base: "/5_theme/",
    server: {
        allowedHosts: ["relationships-helpful-personnel-assistant.trycloudflare.com"]
    }
});