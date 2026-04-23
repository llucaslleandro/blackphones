import { state } from '../store.js';
import { calculateMetrics } from './metrics.js';
import { runDiagnostics } from './diagnostics.js';
import { renderDiagnostics, renderEmptyState } from './render.js';

/**
 * Main entry point for the strategic analysis flow.
 * Orchestrates the clean architecture components.
 */
export function gerarAnaliseEstrategica(curr, prev, calcVar, prodCounts) {
  if (state.filteredOrders.length === 0) {
    renderEmptyState();
    return;
  }

  // 1. Calculate pure metrics
  const metrics = calculateMetrics(curr, prev, calcVar, prodCounts);

  // 2. Resolve business logic and thresholds into structured data
  const diagnostics = runDiagnostics(metrics);

  // 3. Render the analysis securely
  renderDiagnostics(diagnostics);
}
