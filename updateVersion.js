/**
 * Updates the version.ts file with the current version from package.json
 * This script is automatically run during the build process
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the package.json version
const packageJsonPath = path.join(__dirname, "packages", "yasgui", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

// Generate the version.ts content
const versionTsContent = `// Version information for YASGUI
// This file is auto-generated during build - do not edit manually
export const VERSION = "${version}";
`;

// Write the version.ts file
const versionTsPath = path.join(__dirname, "packages", "yasgui", "src", "version.ts");
fs.writeFileSync(versionTsPath, versionTsContent, "utf-8");

console.log(`✓ Updated version.ts to v${version}`);
