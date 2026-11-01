import type { AssessedRun } from "../../data/analysis.ts";
import { tokenTotal } from "../../data/analysis.ts";
import { format } from "./MetricPanels.tsx";

export default function RunEvidence({ run }: { run: AssessedRun }) {
  return <>
    <section className="result-panel"><h2>Attempt</h2><p>Setup {run.setup}. Pipeline {run.pipelineStatus}. Functional coverage {format(run.result?.coverage.share ?? null, true)}.</p>
      <p>Requested model: {run.requestedModel ?? "unreported"}. Reported model: {run.reportedModel ?? "unreported"}.</p>
      {run.replacesRunId === null ? null : <p>Replaces an earlier attempt. Reason: {run.replacementReason}.</p>}
      {run.error === null ? null : <pre>{run.error}</pre>}
    </section>
    <section className="result-panel"><h2>Checks</h2><p>Checker {run.checksAssessment?.versions.checker ?? "unknown"}. Rubric {run.checksAssessment?.versions.rubric ?? "unknown"}.</p>
      <p>{run.checksAssessment?.error}</p><table><thead><tr><th>Check</th><th>Status</th><th>Evidence</th></tr></thead><tbody>
        {run.checksAssessment?.outcomes.map((item) => <tr key={item.id}><td>{item.id} ({item.area})</td><td>{item.status}</td><td>{item.evidence}</td></tr>)}
      </tbody></table></section>
    <section className="result-panel"><h2>Judge evidence</h2><p>Judge {run.judgeAssessment?.versions.judge ?? "unknown"}. Rubric {run.judgeAssessment?.versions.rubric ?? "unknown"}.</p><p>{run.judgeAssessment?.error}</p>
      {run.judgeAssessment?.answers.map((answer) => <details key={answer.id}><summary>{answer.area}: {answer.question}. {answer.yes} yes, {answer.no} no, {answer.unsure} unsure</summary><ul>{answer.evidence.map((evidence, index) => <li key={index}>{evidence}</li>)}</ul></details>)}
    </section>
    <section className="result-panel"><h2>Usage</h2><dl>
      <dt>Tokens</dt><dd>{format(tokenTotal(run))}</dd><dt>Tool calls</dt><dd>{format(run.telemetry?.toolCalls ?? null)}</dd>
      <dt>Failed tool calls</dt><dd>{format(run.telemetry?.failedToolCalls ?? null)}</dd><dt>Peak context</dt><dd>{format(run.telemetry?.peakContext ?? null)}</dd>
      <dt>Minutes</dt><dd>{format(run.agentSeconds === null ? null : run.agentSeconds / 60)}</dd>
    </dl></section>
  </>;
}
