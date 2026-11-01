# Open Forge Eval Results
Open Forge Eval Results is a public repository that keeps versioned evaluation records, evidence manifests and the results site.

You can compare a Neon Pairs batch across setups, then read each attempt's checks, judge evidence and usage. No result is a claim yet. Batches of three to five runs per setup are screening results and can't establish the registered margins, so every Open Forge CLI stays beta.

## Requirements

Use Node `24.19.0` or later and npm. The workflow uses Node `24.19.0`.

## Install

Run `npm ci` to install the locked dependencies. Then run `npm run validate` to check the records and their references.

Run `npm run build` to create the site in `site/build/`. With an empty `versions/`, the overview says no batches are published.

## Stage results

Export a finished batch with Open Forge Evals first. To import that exported batch, run `npm run stage -- <exported-batch-folder> --artifacts <plain-evidence-folder>`.

The evidence folder holds original files at `runs/<run>/<path>` and assessment files at `assessments/<assessment>/<path>`. The paths come from `artifacts.json`. Staging checks every byte size and SHA-256 before writing the records to `versions/<cli-version>/batches/<batch>/`. Existing batches are immutable. Keep evidence in checksummed release assets instead of committing agent code or games here.

## Records

The five JSON Schemas live in `schemas/v2/`. Run `npm run schemas` to regenerate them from `scripts/schema-source.ts` and `scripts/schema-definitions.ts`. Public records accept the exporter's omission of the private `telemetry.sessionId` field. Other record fields follow the v2 history records.

The validator checks schema shapes, identities, references, replacements and pick hashes. Missing values stay `null`. Recheck and rejudge assessments stay in append order. Pages use the latest assessment of each kind and offer the full assessment files as downloads.

## Read results

Correctness, rules, cost, wishes and picks have separate panels. CLI history fixes the model, effort, benchmark, grading and tools. Model history keeps each matched setup comparison together. Different grading versions have separate comparison keys. Missing versions or reported models keep a batch apart from cross-batch comparisons. Local isolation is labelled "Not for scoring".

Binary gates use 95% Wilson intervals. Other attempt metrics resample attempts with replacement, using 2,000 fixed-seed samples and the 2.5th and 97.5th percentiles. They describe screening variation. Single attempts and picks have no interval. Blind and revealed picks are reported apart. A lower coverage interval entirely below the earlier version's interval is labelled a screening regression. Other comparisons are inconclusive. These intervals don't establish non-inferiority or a causal benefit.

The Docusaurus plugin reads records in `loadContent`, then creates page data and routes in `contentLoaded`. Only the batch catalogue is global. The [Docusaurus lifecycle API](https://current.docusaurus.io/docs/api/plugin-methods/lifecycle-apis) defines this loading model. Each page shows the data commit and analysis version.

## Limits

The lockfile pins patched versions of `tinypool` and `serialize-javascript`. The current audit still reports moderate and low advisories in the Docusaurus dependency tree.

Docusaurus generates a registry with mixed module syntax. The plugin's Webpack rule applies only to generated files. Authored TypeScript uses ESM.

## Publishing

Pull requests validate, typecheck, test and build. Every push to `main` does the same, then deploys the site to GitHub Pages. Deployment depends on the build, so a failed check leaves the previous site up. Open Forge adds this repository as its `src/evals/results/` submodule and links the site from its docs.
