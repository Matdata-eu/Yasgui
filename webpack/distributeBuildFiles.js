#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Define packages
const packages = ["yasgui", "yasr", "yasqe", "utils"];

// Helper function to recursively remove directory
function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

// Helper function to recursively copy directory
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

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

// Helper function to copy files matching a pattern
function copyMatchingFiles(sourceDir, pattern, destDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  const files = fs.readdirSync(sourceDir);
  const matchingFiles = files.filter((file) => file.startsWith(pattern));

  if (matchingFiles.length > 0) {
    fs.mkdirSync(destDir, { recursive: true });
    matchingFiles.forEach((file) => {
      const srcPath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);
      fs.copyFileSync(srcPath, destPath);
    });
  }
}

// Main logic
packages.forEach((pkg) => {
  console.log(`Processing package: ${pkg}`);

  const packageBuildDir = path.join("packages", pkg, "build");
  const buildTsSource = path.join("build", "ts", "packages", pkg);
  const buildTsDest = path.join(packageBuildDir, "ts");
  const buildDir = "build";

  // Remove existing build directory
  removeDir(packageBuildDir);

  // Create build directory
  fs.mkdirSync(packageBuildDir, { recursive: true });

  // Copy TypeScript build files
  if (fs.existsSync(buildTsSource)) {
    copyDir(buildTsSource, buildTsDest);
    console.log(`  Copied TypeScript files for ${pkg}`);
  } else {
    console.log(`  No TypeScript files found for ${pkg}`);
  }

  // Copy package-specific build files
  copyMatchingFiles(buildDir, pkg, packageBuildDir);
  console.log(`  Copied build files for ${pkg}`);
});

console.log("Distribution complete!");
