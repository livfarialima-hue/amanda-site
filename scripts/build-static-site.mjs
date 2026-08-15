import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditSite } from "./check-site-technical.mjs";
import { buildStaticSite } from "./static-site-artifact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function requireGreen(result, phase) {
  if (result.ok) return;
  throw new Error(`${phase} failed:\n${JSON.stringify(result.errors, null, 2)}`);
}

const sourceResult = auditSite({ root });
requireGreen(sourceResult, "source technical gate");

const artifact = buildStaticSite({ root });
const artifactResult = auditSite({
  root: path.join(root, artifact.outputDirectory),
  artifact: true,
});
requireGreen(artifactResult, "generated artifact technical gate");

process.stdout.write(`${JSON.stringify({
  outputDirectory: artifact.outputDirectory,
  files: artifact.files.length,
  sitemapUrls: artifactResult.summary.sitemapUrls,
  auditFilesInArtifact: artifactResult.summary.auditFilesInArtifact,
  errors: artifactResult.errors,
}, null, 2)}\n`);
