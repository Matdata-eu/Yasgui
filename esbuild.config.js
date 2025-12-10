import * as esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import * as fs from "fs";
import * as path from "path";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import { execSync } from "child_process";

const isProd = process.env.NODE_ENV === "production";

// Clean build directory
if (fs.existsSync("./build")) {
  fs.rmSync("./build", { recursive: true, force: true });
}

// Create build directory
fs.mkdirSync("./build", { recursive: true });

// Copy static files
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy static assets
copyDir("packages/yasgui/static", "build/packages/yasgui/static");

// Copy HTML files for testing (from build-templates, not dev)
const htmlFiles = ["index.html", "yasgui.html", "yasqe.html", "yasr.html"];
for (const file of htmlFiles) {
  const src = path.join("build-templates", file);
  const dest = path.join("build", file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

const commonConfig = {
  bundle: true,
  sourcemap: true,
  target: "es2020",
  minify: isProd,
  plugins: [
    sassPlugin({
      async transform(source, resolveDir) {
        const { css } = await postcss([autoprefixer]).process(source, { from: undefined });
        return css;
      },
    }),
  ],
  loader: {
    ".png": "file",
    ".jpg": "file",
    ".svg": "dataurl",
    ".woff": "file",
    ".woff2": "file",
    ".ttf": "file",
    ".eot": "file",
  },
  external: [],
  define: {
    __DEVELOPMENT__: JSON.stringify(!isProd),
  },
};

async function buildPackage(name, entryPoint, globalName) {
  const result = await esbuild.build({
    ...commonConfig,
    entryPoints: [entryPoint],
    outfile: `build/${name}.min.js`,
    format: "iife",
    globalName: globalName,
    platform: "browser",
    metafile: true,
    footer: {
      // Unwrap default export for IIFE format to make constructor available as global
      js: `if (typeof ${globalName} !== 'undefined' && ${globalName}?.default) { ${globalName} = ${globalName}.default; }`,
    },
  });

  // Extract CSS if any was bundled
  if (result.metafile) {
    const outputs = Object.keys(result.metafile.outputs);
    const cssOutput = outputs.find((o) => o.endsWith(".css"));
    if (cssOutput && fs.existsSync(cssOutput)) {
      fs.renameSync(cssOutput, `build/${name}.min.css`);
    }
  }
}

async function buildTypeDeclarations() {
  console.log("Building TypeScript declarations...");
  try {
    execSync("tsc -p tsconfig-build.json", { stdio: "inherit" });
  } catch (error) {
    console.warn("TypeScript declaration build had errors, continuing...");
  }
}

async function updateVersion() {
  console.log("Updating version.ts...");
  try {
    execSync("node updateVersion.js", { stdio: "inherit" });
  } catch (error) {
    console.warn("Failed to update version.ts, continuing...");
  }
}

async function build() {
  try {
    // Update version.ts from package.json
    await updateVersion();

    // Build TypeScript declarations first
    await buildTypeDeclarations();

    // Build all packages
    await Promise.all([
      buildPackage("yasgui", "packages/yasgui/src/index.ts", "Yasgui"),
      buildPackage("yasqe", "packages/yasqe/src/index.ts", "Yasqe"),
      buildPackage("yasr", "packages/yasr/src/index.ts", "Yasr"),
      buildPackage("utils", "packages/utils/src/index.ts", "Utils"),
    ]);

    console.log("✓ Build complete!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();
