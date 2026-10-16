import { useState, useEffect } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { useToast } from '@/components/Toast';
import { documentApi } from '@/utils/api';
import {
  ragStateStore,
  type QueryLogEntry,
  type TrainingIntent,
  type DocumentEntity,
  type MLPipelineSettings,
} from '@/utils/ragState';
import {
  Loader2,
  Upload,
  Trash2,
  RotateCcw,
  FileText,
  ExternalLink,
  Plus,
  Sliders,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Search,
  Download,
  Filter,
} from 'lucide-react';
import { NavTab } from './AdminSidebar';

interface AdminPanelsProps {
  tab: NavTab;
}

export function AdminPanels({ tab }: AdminPanelsProps) {
  if (tab === 'intents') return <IntentsPanel />;
  if (tab === 'entities') return <EntitiesPanel />;
  if (tab === 'logs') return <LogsPanel />;
  if (tab === 'ml_settings') return <MLSettingsPanel />;
  if (tab === 'data_management') return <DataManagementPanel />;
  if (tab === 'integrations') return <IntegrationsPanel />;
  return null;
}

// ----------------------------------------------------
// 1. INTENTS MANAGEMENT PANEL
// ----------------------------------------------------
function IntentsPanel() {
  const [intents, setIntents] = useState<TrainingIntent[]>(() => ragStateStore.getIntents());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newExamples, setNewExamples] = useState('');
  const [newThreshold, setNewThreshold] = useState(0.70);
  const { showToast } = useToast();

  useEffect(() => {
    const handleUpdate = () => setIntents(ragStateStore.getIntents());
    window.addEventListener('rag_intents_updated', handleUpdate);
    return () => window.removeEventListener('rag_intents_updated', handleUpdate);
  }, []);

  const handleThresholdChange = (id: string, val: number) => {
    const updated = intents.map((it) => (it.id === id ? { ...it, threshold: val } : it));
    setIntents(updated);
    ragStateStore.saveIntents(updated);
  };

  const handleToggleActive = (id: string) => {
    const updated = intents.map((it) => (it.id === id ? { ...it, active: !it.active } : it));
    setIntents(updated);
    ragStateStore.saveIntents(updated);
  };

  const handleDeleteIntent = (id: string) => {
    const updated = intents.filter((it) => it.id !== id);
    setIntents(updated);
    ragStateStore.saveIntents(updated);
    showToast({ type: 'info', title: 'Intent Removed' });
  };

  const handleAddIntent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const intentObj: TrainingIntent = {
      id: crypto.randomUUID(),
      name: newName.trim().toLowerCase().replace(/\s+/g, '_'),
      description: newDesc.trim() || 'Custom document analysis intent',
      examples: newExamples.split('\n').map((s) => s.trim()).filter(Boolean),
      threshold: newThreshold,
      active: true,
    };

    const updated = [...intents, intentObj];
    setIntents(updated);
    ragStateStore.saveIntents(updated);
    setShowAddModal(false);
    setNewName('');
    setNewDesc('');
    setNewExamples('');
    showToast({ type: 'success', title: 'Intent Created', message: `Added "${intentObj.name}"` });
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Intents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure document intelligence intents, semantic triggers, and confidence thresholds
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Intent</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
        {intents.map((intent) => (
          <div key={intent.id} className="p-6 hover:bg-gray-50/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/60">
                  {intent.name}
                </span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    intent.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {intent.active ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">Threshold:</span>
                  <input
                    type="range"
                    min="0.40"
                    max="0.95"
                    step="0.05"
                    value={intent.threshold}
                    onChange={(e) => handleThresholdChange(intent.id, parseFloat(e.target.value))}
                    className="w-24 accent-emerald-600 cursor-pointer"
                  />
                  <span className="font-mono font-semibold text-gray-800 w-8">
                    {Math.round(intent.threshold * 100)}%
                  </span>
                </div>

                <button
                  onClick={() => handleToggleActive(intent.id)}
                  className="text-xs text-gray-500 hover:text-gray-900 font-medium"
                >
                  {intent.active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDeleteIntent(intent.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove Intent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-3">{intent.description}</p>

            <div className="flex flex-wrap gap-2">
              {intent.examples.map((ex, i) => (
                <span key={i} className="text-xs bg-gray-100/80 text-gray-700 px-2.5 py-1 rounded-lg">
                  "{ex}"
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Intent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Training Intent</h3>
            <form onSubmit={handleAddIntent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Intent Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. document_clause_lookup"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Briefly state purpose..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sample Phrases (One per line)</label>
                <textarea
                  rows={3}
                  placeholder="Show me section 4&#10;What are the penalties?&#10;Summarize article 1"
                  value={newExamples}
                  onChange={(e) => setNewExamples(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Confidence Threshold</span>
                  <span className="font-mono text-emerald-700">{Math.round(newThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Save Intent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 2. ENTITIES & SLOTS PANEL
// ----------------------------------------------------
function EntitiesPanel() {
  const [entities, setEntities] = useState<DocumentEntity[]>(() => ragStateStore.getEntities());
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentEntity['type']>('Regex Pattern');
  const [pattern, setPattern] = useState('');
  const [description, setDescription] = useState('');
  const [examples, setExamples] = useState('');
  const { showToast } = useToast();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEnt: DocumentEntity = {
      id: crypto.randomUUID(),
      name: name.trim().toLowerCase().replace(/\s+/g, '_'),
      type,
      pattern: pattern.trim() || 'Custom Slot',
      description: description.trim() || 'Extracted document parameter',
      examples: examples.split(',').map((s) => s.trim()).filter(Boolean),
    };

    const updated = [...entities, newEnt];
    setEntities(updated);
    ragStateStore.saveEntities(updated);
    setShowAddModal(false);
    setName('');
    setPattern('');
    setDescription('');
    setExamples('');
    showToast({ type: 'success', title: 'Entity Slot Created', message: `Added "${newEnt.name}"` });
  };

  const handleDelete = (id: string) => {
    const updated = entities.filter((e) => e.id !== id);
    setEntities(updated);
    ragStateStore.saveEntities(updated);
    showToast({ type: 'info', title: 'Entity Removed' });
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Entities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure entity extractors, document metadata slots, and pattern extractors
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Entity</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/80 text-xs uppercase text-gray-400 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold">Entity / Slot Name</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Pattern / Source</th>
              <th className="px-6 py-4 font-semibold">Examples</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entities.map((ent) => (
              <tr key={ent.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-mono font-medium text-emerald-800">
                  {ent.name}
                  <div className="text-[11px] font-sans text-gray-400">{ent.description}</div>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-gray-600">{ent.type}</td>
                <td className="px-6 py-4 font-mono text-xs text-gray-500 max-w-xs truncate">{ent.pattern}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1.5 flex-wrap">
                    {ent.examples.map((ex, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {ex}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(ent.id)}
                    className="text-gray-400 hover:text-red-600 p-1 rounded"
                    title="Delete entity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Entity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Document Entity Slot</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Entity Name</label>
                <input
                  type="text"
                  placeholder="e.g. section_id"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Extraction Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DocumentEntity['type'])}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="Regex Pattern">Regex Pattern</option>
                  <option value="Context Slot">Context Slot</option>
                  <option value="NER Model">NER Model</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pattern / Expression</label>
                <input
                  type="text"
                  placeholder="(?:section|clause)\s*(\d+)"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Examples (Comma separated)</label>
                <input
                  type="text"
                  placeholder="section 4, clause 2.1"
                  value={examples}
                  onChange={(e) => setExamples(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Save Entity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 3. LIVE QUERY & INFERENCE LOGS PANEL
// ----------------------------------------------------
function LogsPanel() {
  const [logs, setLogs] = useState<QueryLogEntry[]>(() => ragStateStore.getLogs());
  const [filterQuery, setFilterQuery] = useState('');
  const [filterIntent, setFilterIntent] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<QueryLogEntry | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handleUpdate = () => setLogs(ragStateStore.getLogs());
    window.addEventListener('rag_logs_updated', handleUpdate);
    return () => window.removeEventListener('rag_logs_updated', handleUpdate);
  }, []);

  const handleClear = () => {
    if (window.confirm('Clear all inference query logs?')) {
      ragStateStore.clearLogs();
      setLogs([]);
      setSelectedLog(null);
      showToast({ type: 'info', title: 'Logs Cleared' });
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `rag_query_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !filterQuery ||
      log.query.toLowerCase().includes(filterQuery.toLowerCase()) ||
      log.intent.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesIntent = filterIntent === 'ALL' || log.intent === filterIntent;
    return matchesSearch && matchesIntent;
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time RAG inference logs, latency analytics, and grounding audit trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 hover:text-red-600 hover:border-red-200 text-gray-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="mb-4 bg-white border border-gray-100 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search query, intent, or keywords..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterIntent}
            onChange={(e) => setFilterIntent(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Intents ({logs.length})</option>
            <option value="document_qa">document_qa</option>
            <option value="document_summarization">document_summarization</option>
            <option value="data_extraction">data_extraction</option>
            <option value="semantic_search">semantic_search</option>
            <option value="comparative_analysis">comparative_analysis</option>
            <option value="no_document_context">no_document_context</option>
            <option value="document_qa_error">document_qa_error</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            {logs.length === 0
              ? 'No inference logs recorded yet. Ask questions in the Chat Interface to generate live logs!'
              : 'No logs match your filter criteria.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 font-mono text-xs overflow-x-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="p-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-gray-400 flex-shrink-0">{log.timeFormatted}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold flex-shrink-0 ${
                      log.status === '200 OK'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                        : log.status === '404 Not Found'
                        ? 'bg-amber-50 text-amber-800 border border-amber-100'
                        : 'bg-red-50 text-red-800 border border-red-100'
                    }`}
                  >
                    {log.status}
                  </span>
                  <span className="text-emerald-700 font-semibold flex-shrink-0">{log.intent}</span>
                  <span className="text-gray-900 font-sans truncate max-w-md">"{log.query}"</span>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 text-gray-500 font-sans">
                  {log.grounded ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Grounded ({log.sourcesCount} src)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <XCircle className="w-3.5 h-3.5" />
                      Ungrounded
                    </span>
                  )}
                  <span className="font-mono text-xs text-gray-400">{log.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl animate-in font-sans">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Inference Audit Detail</h3>
              <span className="text-xs font-mono text-gray-400">{selectedLog.timestamp}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400 font-medium block mb-0.5">User Query:</span>
                <p className="bg-gray-50 p-2.5 rounded-lg font-medium text-gray-800">
                  {selectedLog.query}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="text-gray-400 block mb-0.5">Classified Intent</span>
                  <span className="font-mono font-semibold text-emerald-800">{selectedLog.intent}</span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="text-gray-400 block mb-0.5">Execution Latency</span>
                  <span className="font-mono font-semibold text-gray-800">{selectedLog.latencyMs} ms</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="text-gray-400 block mb-0.5">Confidence Score</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {Math.round(selectedLog.confidence * 100)}%
                  </span>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg">
                  <span className="text-gray-400 block mb-0.5">Retrieved Sources</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {selectedLog.sourcesCount} chunk{selectedLog.sourcesCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {selectedLog.topSource && (
                <div>
                  <span className="text-gray-400 font-medium block mb-0.5">Primary Citation:</span>
                  <p className="bg-emerald-50 text-emerald-800 p-2 rounded-lg font-mono">
                    {selectedLog.topSource}
                  </p>
                </div>
              )}

              <div>
                <span className="text-gray-400 font-medium block mb-0.5">Answer Summary:</span>
                <p className="bg-gray-50 p-2.5 rounded-lg text-gray-700 italic">
                  "{selectedLog.answerExcerpt}"
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 4. ML PIPELINE & MODEL SETTINGS PANEL
// ----------------------------------------------------
function MLSettingsPanel() {
  const [settings, setSettings] = useState<MLPipelineSettings>(() => ragStateStore.getSettings());
  const { showToast } = useToast();

  const handleSave = () => {
    ragStateStore.saveSettings(settings);
    showToast({
      type: 'success',
      title: 'Configuration Saved',
      message: 'ML pipeline and retrieval parameters updated.',
    });
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ML Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure vector embeddings, search thresholds, token limits, and LLM providers
          </p>
        </div>
        <button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          Save Settings
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Retrieval Parameters */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Retrieval & Search Hyperparameters</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Top-K Chunks to Retrieve</span>
                <span className="font-mono text-emerald-700 font-bold">{settings.topK} chunks</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={settings.topK}
                onChange={(e) => setSettings({ ...settings, topK: parseInt(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] text-gray-400">Controls how many context passages are injected</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Minimum Relevance Score (Threshold)</span>
                <span className="font-mono text-emerald-700 font-bold">
                  {Math.round(settings.minRelevanceScore * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.85"
                step="0.05"
                value={settings.minRelevanceScore}
                onChange={(e) => setSettings({ ...settings, minRelevanceScore: parseFloat(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[11px] text-gray-400">Prunes irrelevant context below this similarity</span>
            </div>
          </div>
        </div>

        {/* Chunking Engine */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Text Chunking Engine</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Chunk Size (Tokens)</label>
              <input
                type="number"
                value={settings.chunkSize}
                onChange={(e) => setSettings({ ...settings, chunkSize: parseInt(e.target.value) || 800 })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">Optimal range: 400 - 1200 tokens</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Chunk Overlap (Tokens)</label>
              <input
                type="number"
                value={settings.chunkOverlap}
                onChange={(e) => setSettings({ ...settings, chunkOverlap: parseInt(e.target.value) || 120 })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">Preserves contextual continuity between chunks</span>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Embedding & Generation Models</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Embedding Provider</label>
              <select
                value={settings.embeddingModel}
                onChange={(e) => setSettings({ ...settings, embeddingModel: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 bg-white"
              >
                <option value="text-embedding-3-small">OpenAI text-embedding-3-small (1536 dim)</option>
                <option value="text-embedding-3-large">OpenAI text-embedding-3-large (3072 dim)</option>
                <option value="local-normalized-hash">Deterministic Local Embedding (Offline fallback)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">LLM Provider / Model</label>
              <select
                value={settings.llmModel}
                onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 bg-white"
              >
                <option value="gpt-4o-mini">OpenAI gpt-4o-mini (Recommended)</option>
                <option value="gpt-4o">OpenAI gpt-4o (High precision)</option>
                <option value="direct-extractive-grounding">Direct Chunk Extractor (Offline / No Key)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Distance Metric */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex justify-between items-center">
            <div>
              <span className="block text-xs font-semibold text-gray-800">Vector Similarity Metric</span>
              <span className="text-xs text-gray-400">Index distance metric configured in ChromaDB</span>
            </div>
            <span className="font-mono text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-md border border-emerald-100">
              Cosine Similarity (1.0 - Cosine Distance)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 5. DATA MANAGEMENT PANEL
// ----------------------------------------------------
function DataManagementPanel() {
  const { documents, total, loading, upload, remove, retry, refresh } = useDocuments();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      await upload(files);
      showToast({ type: 'success', title: 'Upload Successful', message: `${files.length} document(s) indexed.` });
      refresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Upload Failed', message: err instanceof Error ? err.message : 'Upload error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Permanently delete "${name}" from backend storage and vector index?`)) {
      try {
        await remove(id);
        showToast({ type: 'info', title: 'Document Deleted', message: `Removed "${name}" from storage.` });
      } catch (err) {
        showToast({ type: 'error', title: 'Delete Failed', message: err instanceof Error ? err.message : 'Delete error' });
      }
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Store, inspect, and manage PDF documents in backend storage (/storage/uploads)
          </p>
        </div>
        <button
          onClick={refresh}
          className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
        >
          Refresh List
        </button>
      </div>

      {/* Upload Zone */}
      <div
        className={`mb-6 rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          dragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-400 bg-white'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files.length) handleUpload(Array.from(e.dataTransfer.files));
        }}
      >
        <input
          type="file"
          multiple
          accept=".pdf,application/pdf"
          onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
          className="hidden"
          id="pdf-upload-input"
          disabled={uploading}
        />
        <label htmlFor="pdf-upload-input" className="cursor-pointer block">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3 text-emerald-600">
            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {uploading ? 'Processing & Indexing PDFs into ChromaDB...' : 'Click or drop PDF files here to upload'}
          </p>
          <p className="text-xs text-gray-400">
            Files are automatically parsed, chunked, and embedded into backend storage
          </p>
        </label>
      </div>

      {/* Document List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-sm text-gray-900">
            Indexed Documents ({total})
          </span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
        </div>

        {documents.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            No documents uploaded yet. Upload a PDF above to enable document querying!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div key={doc.document_id} className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-xs text-gray-400">
                      {doc.page_count ? `${doc.page_count} pages • ` : ''}
                      {doc.chunk_count} chunks • Status:{' '}
                      <span className="text-emerald-700 font-medium capitalize">{doc.status}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={documentApi.fileUrl(doc.document_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    title="Access physical PDF file in backend storage"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View File</span>
                  </a>

                  {doc.status === 'failed' && (
                    <button
                      onClick={() => retry(doc.document_id)}
                      className="p-2 text-gray-400 hover:text-emerald-600 rounded"
                      title="Retry processing"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(doc.document_id, doc.filename)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Delete permanently from storage and vector index"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 6. INTEGRATIONS & API PANEL
// ----------------------------------------------------
function IntegrationsPanel() {
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'python' | 'node'>('curl');
  const [copied, setCopied] = useState(false);

  const snippets = {
    curl: `curl -X POST http://localhost:8000/api/v1/chat/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "What are the key policy requirements?",
    "top_k": 5
  }'`,
    python: `import httpx

url = "http://localhost:8000/api/v1/chat/query"
payload = {
    "question": "What are the key policy requirements?",
    "top_k": 5
}

response = httpx.post(url, json=payload)
data = response.json()
print("Answer:", data["answer"])
print("Sources:", data["sources"])`,
    node: `const response = await fetch("http://localhost:8000/api/v1/chat/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "What are the key policy requirements?",
    top_k: 5
  })
});
const data = await response.json();
console.log(data.answer);`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeSnippetTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect external applications, pipelines, and agents to the Document RAG Assistant
        </p>
      </div>

      {/* API Endpoints */}
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">REST API Endpoints</h3>
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">POST</span>
              <span className="text-gray-800">/api/v1/chat/query</span>
            </div>
            <span className="text-gray-400 font-sans text-xs">Execute document question-answering</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">POST</span>
              <span className="text-gray-800">/api/v1/documents/upload</span>
            </div>
            <span className="text-gray-400 font-sans text-xs">Multipart upload and vector indexing</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">GET</span>
              <span className="text-gray-800">/api/v1/documents/{'{document_id}'}/file</span>
            </div>
            <span className="text-gray-400 font-sans text-xs">Retrieve & stream original stored PDF</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">DELETE</span>
              <span className="text-gray-800">/api/v1/documents/{'{document_id}'}</span>
            </div>
            <span className="text-gray-400 font-sans text-xs">Purge file from storage and Chroma vectors</span>
          </div>
        </div>
      </div>

      {/* Code Snippet */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex gap-2">
            {(['curl', 'python', 'node'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setActiveSnippetTab(tabKey)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  activeSnippetTab === tabKey
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tabKey === 'curl' ? 'cURL' : tabKey === 'python' ? 'Python' : 'Node.js'}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-emerald-700 font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        <div className="p-4 bg-[#1e293b] text-gray-100 font-mono text-xs overflow-x-auto leading-relaxed">
          <pre>{snippets[activeSnippetTab]}</pre>
        </div>
      </div>
    </div>
  );
}
