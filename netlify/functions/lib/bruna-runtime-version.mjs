import manifest from './bruna-policy/manifest.json' with { type: 'json' };

// Environment variables can outlive a deployment. Telemetry describes the code
// actually bundled, never a stale operator-maintained copy of its version.
export const BRUNA_RUNTIME_VERSION = Object.freeze({
  policyVersion: manifest.bundleVersion,
  promptVersion: manifest.promptVersion,
  knowledgeSnapshot: manifest.knowledgeSnapshot,
});
