import type { Config } from "@docusaurus/types";

const config: Config = {
  title: "Open Forge Eval Results", tagline: "Checks, evidence and limits", url: process.env["RESULTS_SITE_ORIGIN"] || "https://thelithiumforge.github.io",
  baseUrl: process.env["RESULTS_SITE_BASE_PATH"] ? `${process.env["RESULTS_SITE_BASE_PATH"]?.replace(/\/$/, "")}/` : "/open-forge-eval-results/",
  organizationName: "TheLithiumForge", projectName: "open-forge-eval-results", trailingSlash: true, onBrokenLinks: "throw",
  presets: [["classic", { docs: false, blog: false, pages: false, theme: { customCss: "./src/css/custom.css" } }]],
  plugins: ["./plugins/results.ts"],
  themeConfig: { navbar: { title: "Open Forge Evals", items: [{ to: "/", label: "Overview", position: "left" }, { to: "/cli-history", label: "CLI history", position: "left" }, { to: "/model-history", label: "Model history", position: "left" }] },
    footer: { style: "dark", copyright: "Screening results. No result is a claim yet." } },
};
export default config;
