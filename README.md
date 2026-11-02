# Open Forge Eval Results
Open Forge Eval Results is a public data store that keeps versioned evaluation records, schemas and evidence manifests.

For example, you can find a Neon Pairs batch in `index.json`, then read its attempts and grading records without listing folders. The [Evals pages](https://thelithiumforge.github.io/open-forge/docs/evals) in Open Forge's main documentation site show the data. These are screening results. Every Open Forge CLI stays beta. Nothing is a claim yet.

## Requirements

Use Node `24.19.0` or later and npm.

## Install

Run `npm ci --cache .npm-cache` to install the locked dependencies. Then run `npm run validate` to check the records, their references and the generated catalogue. An empty `versions/` is valid.

## Stage results

Export a finished batch with Open Forge Evals first. Then run `npm run stage -- <exported-batch-folder> --artifacts <plain-evidence-folder>` to import it.

The evidence folder holds original files at `runs/<run>/<path>` and assessment files at `assessments/<assessment>/<path>`. These paths come from `artifacts.json`. Staging checks every byte size and SHA-256 before writing records to `versions/<cli-version>/batches/<batch>/`. Existing batches are immutable. Staging regenerates `index.json` after importing a batch.

Keep evidence in checksummed release assets instead of committing agent code or games here.

## Records

The five record schemas and their shared definitions live in `schemas/v2/`. Run `npm run schemas` to regenerate them from `scripts/schema-source.ts` and `scripts/schema-definitions.ts`. Public records accept the exporter's omission of the private `telemetry.sessionId` field. Other fields follow the v2 history records.

The validator checks schema shapes, identities, references, replacements and pick hashes. Missing values stay `null`. Recheck and rejudge assessments stay in append order.

## Catalogue

Run `npm run index` after adding records by hand. It generates the root `index.json` from validated batches. `npm run validate` rejects a stale catalogue. `schemas/index.json` defines its shape.

Each batch entry gives its ID, layer, CLI version, creation time, implementer models, judge models, grading versions and record folder. A missing layer is `null`. Paths are relative to this repository. Within each batch folder, read these files:

- `experiment.json` - Registered inputs and versions.
- `setups.jsonl` - Generated setup records.
- `runs.jsonl` - Attempts and usage.
- `assessments/checks.jsonl` - Check assessments.
- `assessments/judge.jsonl` - Judge assessments.
- `assessments/pick.jsonl` - Blind and revealed picks.
- `artifacts.json` - Evidence paths, sizes and hashes.

## Read results

The main site reads the pinned submodule at build time. Its Fetch latest results button resolves the public repository's current commit, then reads `index.json` and every record through raw GitHub URLs pinned to that commit. It validates schemas and references before replacing the displayed data. It treats record text as plain data and shows the data commit and fetch time.

The main site keeps correctness, rules, usage, wishes and preferences apart. Different grading versions get separate comparisons. Missing versions or reported models keep a batch apart from comparisons across batches. Local isolation is labelled "Not for scoring". The [Results page](https://thelithiumforge.github.io/open-forge/docs/evals/results) explains the Wilson and bootstrap intervals. The [History page](https://thelithiumforge.github.io/open-forge/docs/evals/history) shows CLI and reference trends.

## Checks

Run `npm run typecheck` and `npm test` to check the staging and validation tools. Pull requests and pushes to `main` validate, typecheck and test. This repository holds data only. It has no site build or Pages deployment.
