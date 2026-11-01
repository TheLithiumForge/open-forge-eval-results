import type { Interval } from "../../data/analysis.ts";
import type { Summary } from "../../data/summaries.ts";

interface Metric { readonly label: string; readonly value: (row: Summary) => Interval; readonly percent?: boolean }
const Panels: readonly { readonly title: string; readonly metrics: readonly Metric[] }[] = [
  { title: "Correctness", metrics: [{ label: "Working gate", value: (row) => row.working, percent: true }, { label: "Stated success", value: (row) => row.stated, percent: true }, { label: "Coverage", value: (row) => row.coverage, percent: true }] },
  { title: "Rules and code", metrics: [{ label: "Rules", value: (row) => row.rules, percent: true }, { label: "Code", value: (row) => row.code, percent: true }] },
  { title: "Cost", metrics: [{ label: "Tokens", value: (row) => row.tokens }, { label: "Tool calls", value: (row) => row.tools }, { label: "Failed tool calls", value: (row) => row.failedTools }, { label: "Peak context", value: (row) => row.context }, { label: "Minutes", value: (row) => row.minutes }] },
  { title: "Wishes", metrics: [{ label: "Intent checks", value: (row) => row.intent, percent: true }, { label: "Intent judge", value: (row) => row.intentJudge, percent: true }] },
  { title: "Picks", metrics: [{ label: "Blind pick points", value: (row) => row.picks, percent: true }, { label: "Revealed pick points", value: (row) => row.revealedPicks, percent: true }] },
];
export function format(value: number | null, percent = false): string {
  return value === null ? "Missing" : percent ? `${(value * 100).toFixed(1)}%` : value.toLocaleString("en", { maximumFractionDigits: 1 });
}
function Estimate({ value, percent = false }: { value: Interval; percent?: boolean }) {
  return <><strong>{format(value.mean, percent)}</strong><br /><small>{value.low === null ? "Interval unavailable" : `95% interval ${format(value.low, percent)} to ${format(value.high, percent)}`}<br />{value.samples} measured, {value.missing} missing</small></>;
}
export default function MetricPanels({ rows }: { rows: readonly Summary[] }) {
  return <>{Panels.map((panel) => <section className="result-panel" key={panel.title}>
    <h2>{panel.title}</h2>
    <table><thead><tr><th>Setup</th>{panel.metrics.map((metric) => <th key={metric.label}>{metric.label}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={`${row.batchId}/${row.setup}/${row.scope}`}><th>{row.setup}<br /><small>{row.version}, {row.runs} attempts</small>{row.scoring ? null : <p className="badge">Local. Not for scoring.</p>}</th>
        {panel.metrics.map((metric) => <td key={metric.label}><Estimate value={metric.value(row)} percent={metric.percent ?? false} /></td>)}</tr>)}</tbody></table>
    {panel.title === "Rules and code" ? <p>{rows.reduce((sum, row) => sum + row.unsure, 0)} unsure ballots. Yes shares use decisive ballots.</p> : null}
    {panel.title === "Correctness" ? <p>{rows.reduce((sum, row) => sum + row.errors, 0)} unresolved check errors. Blocked and errored checks count as not passed.</p> : null}
    {panel.title === "Picks" ? <p>{rows.reduce((sum, row) => sum + row.unknownPicks, 0)} pick entries have unknown reveal state and are excluded from these shares.</p> : null}
  </section>)}</>;
}
