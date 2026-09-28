/**
 * ResultsPanel - Displays workflow execution results
 */
import { memo } from 'react';
import { useFlowStore } from '../../../store';
import { TEXT_MUTED_STYLE, BG_TERTIARY_STYLE, getTimingColor } from '../FlowCanvas.constants';

interface TimingInfo {
  nodeId: string;
  nodeName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: string;
}

export const ResultsPanel = memo(function ResultsPanel() {
  const workflowResult = useFlowStore((s) => s.workflowResult);
  const setWorkflowResult = useFlowStore((s) => s.setWorkflowResult);

  if (!workflowResult) return null;

  return (
    <div
      className="absolute bottom-4 right-4 w-72 rounded-lg p-3 max-h-96 overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs" style={TEXT_MUTED_STYLE}>Results</div>
        <button
          onClick={() => setWorkflowResult(null)}
          className="text-xs px-1 rounded hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>
      </div>
      <div
        className="text-xs mb-2"
        style={{ color: workflowResult.success ? 'var(--success)' : 'var(--danger)' }}
      >
        {workflowResult.success ? '✅ Workflow completed' : '❌ Workflow failed'}
      </div>

      {/* Performance Analysis */}
      {workflowResult.timings && workflowResult.timings.length > 0 && (
        <div className="mt-3">
          <div className="text-xs mb-2" style={TEXT_MUTED_STYLE}>
            Performance
          </div>
          <div className="space-y-1">
            {workflowResult.timings.map((timing: TimingInfo, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded text-xs"
                style={BG_TERTIARY_STYLE}
              >
                <span style={{ color: 'var(--text-primary)' }}>{timing.nodeName}</span>
                <span
                  className="font-mono"
                  style={{ color: getTimingColor(timing.duration) }}
                >
                  {timing.duration}ms
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between p-1.5 rounded text-xs border-t" style={{ borderColor: 'var(--border-color)' }}>
              <span style={TEXT_MUTED_STYLE}>Total</span>
              <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>
                {workflowResult.timings.reduce((sum: number, t: TimingInfo) => sum + t.duration, 0)}ms
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(workflowResult.results).map(([nodeId, outputs]) => (
          <div key={nodeId} className="p-2 rounded" style={BG_TERTIARY_STYLE}>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              {nodeId}
            </div>
            <pre className="text-xs overflow-x-auto" style={{ color: 'var(--text-secondary)' }}>
              {JSON.stringify(outputs, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
});