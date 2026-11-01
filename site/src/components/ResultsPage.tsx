import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Head from "@docusaurus/Head";
import type { PageData } from "../../data/pages.types.ts";
import type { Summary } from "../../data/summaries.ts";
import { historyStatus } from "../../data/summaries.ts";
import MetricPanels from "./MetricPanels.tsx";
import RunEvidence from "./RunEvidence.tsx";

function Histories({ rows, model }: { rows: readonly Summary[]; model: boolean }) {
  const scopes = [...new Set(rows.map((row) => row.scope))];
  return <>{scopes.map((scope) => {
    const selected = rows.filter((row) => row.scope === scope).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const first = selected[0];
    const matched = selected.every((row) => selected.some((control) => control.version === row.version && ["none", "no-setup", "plain"].includes(control.setup)));
    return <section key={scope}><h2>{first?.tool}: {first?.model} ({first?.effort ?? "default effort"})</h2>
      <p>{model ? "Each model has its own matched setup comparison. Read the control beside Open Forge for each CLI version." : "The model, effort, benchmark, grading and tool versions are fixed within this section."}</p>
      <p>Comparison key <code>{scope}</code></p>
      {matched ? null : <p>No matched No setup control is available for this group. The comparison is inconclusive.</p>}
      {selected.map((row, index) => <p key={`${row.batchId}/${row.setup}`}>{row.version}, {row.setup}: {historyStatus(selected.slice(0, index).reverse().find((previous) => previous.setup === row.setup && previous.version !== row.version), row)}. <Link to={`/batches/${row.version}/${row.batchId}`}>Batch details</Link></p>)}
      <MetricPanels rows={selected} />
    </section>;
  })}</>;
}
export default function ResultsPage({ data }: { data: PageData }) {
  const download = useBaseUrl(data.recordUrl ?? "/");
  return <Layout><Head><title>{data.title}</title></Head><main className="container results"><h1>{data.title}</h1>
    <div className="limits"><strong>Screening results. No result is a claim yet.</strong><p>Five runs per setup do not establish the registered margins. Binary gates use 95% Wilson intervals. Other attempt metrics use descriptive 95% percentile bootstrap intervals with 2,000 fixed-seed resamples. Single attempts and picks have no interval. Missing measurements stay missing. Overlap is inconclusive.</p></div>
    <p className="stamp">Data commit: {data.commit}. Analysis version: {data.analysis}.</p>
    {data.scoring === false ? <p className="limits">Local isolation. Not for scoring.</p> : null}
    {data.mode === "overview" ? <><h2>Published batches</h2>{data.catalogue?.length === 0 ? <p>No batches are published yet.</p> : <div className="batch-list">{data.catalogue?.map((batch) => <article className="result-panel" key={`${batch.version}/${batch.id}`}><h3><Link to={batch.path}>{batch.version}</Link></h3><p>{batch.at}</p><p>{batch.scoring ? "Container execution. Screening only." : "Local isolation. Not for scoring."}</p></article>)}</div>}<p><Link to="/cli-history">CLI history with the model fixed</Link>. <Link to="/model-history">Model history with matched setups</Link>.</p></> : null}
    {data.mode === "cli" || data.mode === "model" ? <Histories rows={data.summaries ?? []} model={data.mode === "model"} /> : null}
    {data.mode === "batch" && data.batch !== undefined ? <>
      {data.batch.experiment.config.isolation === "local" ? <p className="limits">Local isolation. Not for scoring.</p> : null}
      <p>Every grading version has its own comparison below. Inconclusive screening results and regressions stay in the record.</p>
      <Histories rows={data.summaries ?? []} model={false} />
      <section className="result-panel"><h2>Single attempts</h2><table><thead><tr><th>Setup</th><th>Repeat</th><th>Pipeline</th><th>Details</th></tr></thead><tbody>{data.batch.runs.map((run) => <tr key={run.id}><td>{run.setup}</td><td>{run.repeat}</td><td>{run.pipelineStatus}</td><td><Link to={`/batches/${data.batch?.experiment.cliVersion}/${run.batchId}/runs/${run.id}`}>Checks and usage</Link></td></tr>)}</tbody></table></section>
    </> : null}
    {data.run !== undefined ? <RunEvidence run={data.run} /> : null}
    {data.recordUrl === undefined ? null : <section className="result-panel"><h2>Downloads</h2><ul><li><a href={`${download}/experiment.json`}>Experiment</a></li><li><a href={`${download}/runs.jsonl`}>Runs</a></li><li><a href={`${download}/artifacts.json`}>Artifact manifest</a></li><li><a href={`${download}/assessments/checks.jsonl`}>All check assessments</a></li><li><a href={`${download}/assessments/judge.jsonl`}>All judge assessments</a></li><li><a href={`${download}/assessments/pick.jsonl`}>All pick assessments</a></li></ul></section>}
  </main></Layout>;
}
