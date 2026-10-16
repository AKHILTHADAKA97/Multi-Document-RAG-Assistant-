// Advanced RAG & Document Assistant State Management

export interface QueryLogEntry {
  id: string;
  timestamp: string;
  timeFormatted: string;
  query: string;
  intent: string;
  confidence: number;
  grounded: boolean;
  documentCount: number;
  sourcesCount: number;
  topSource?: string;
  latencyMs: number;
  status: '200 OK' | '404 Not Found' | '500 Error';
  answerExcerpt: string;
}

export interface TrainingIntent {
  id: string;
  name: string;
  description: string;
  examples: string[];
  threshold: number; // 0.0 - 1.0
  active: boolean;
}

export interface DocumentEntity {
  id: string;
  name: string;
  type: 'Regex Pattern' | 'Context Slot' | 'NER Model';
  pattern: string;
  description: string;
  examples: string[];
}

export interface MLPipelineSettings {
  topK: number;
  minRelevanceScore: number;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  llmModel: string;
  temperature: number;
  maxTokens: number;
  similarityMetric: 'cosine' | 'dot_product' | 'euclidean';
}

const DEFAULT_INTENTS: TrainingIntent[] = [
  {
    id: '1',
    name: 'document_qa',
    description: 'Direct factual question-answering strictly derived from indexed document chunks',
    examples: ['What does section 3 specify?', 'What are the main requirements?', 'Explain the procedure outlined in the document'],
    threshold: 0.70,
    active: true,
  },
  {
    id: '2',
    name: 'document_summarization',
    description: 'Synthesizes executive summaries, overview of topics, or key findings',
    examples: ['Summarize this document', 'Give me the key takeaways', 'What is this document about?'],
    threshold: 0.75,
    active: true,
  },
  {
    id: '3',
    name: 'data_extraction',
    description: 'Extracts exact clauses, numerical figures, tables, or structured definitions',
    examples: ['List all dates and deadlines', 'Extract the penalty clauses', 'What are the financial metrics?'],
    threshold: 0.80,
    active: true,
  },
  {
    id: '4',
    name: 'semantic_search',
    description: 'Locates exact passage references, citations, and page numbers',
    examples: ['Find where privacy policy is mentioned', 'Where does it talk about compliance?', 'Show citations for chapter 2'],
    threshold: 0.65,
    active: true,
  },
  {
    id: '5',
    name: 'comparative_analysis',
    description: 'Cross-document reasoning and comparison across multiple uploaded PDFs',
    examples: ['Compare the policy in doc A with doc B', 'What are the differences between both versions?'],
    threshold: 0.85,
    active: true,
  },
];

const DEFAULT_ENTITIES: DocumentEntity[] = [
  {
    id: '1',
    name: 'document_reference',
    type: 'Regex Pattern',
    pattern: '(?:doc|document|file)\\s*[:#]?\\s*([A-Za-z0-9_.-]+)',
    description: 'Identifies explicit target document names in query',
    examples: ['in document policy.pdf', 'from file specs.pdf'],
  },
  {
    id: '2',
    name: 'page_number',
    type: 'Regex Pattern',
    pattern: '(?:page|p\\.?)\\s*(\\d+)',
    description: 'Extracts target page number constraint from query',
    examples: ['page 14', 'p. 3'],
  },
  {
    id: '3',
    name: 'section_clause',
    type: 'Regex Pattern',
    pattern: '(?:section|clause|article|paragraph)\\s*([A-Za-z0-9_.-]+)',
    description: 'Extracts specific legal, policy, or technical section identifier',
    examples: ['section 4.2', 'clause 9'],
  },
  {
    id: '4',
    name: 'query_topic',
    type: 'Context Slot',
    pattern: 'Natural Language Keywords',
    description: 'Extracted semantic keywords representing the user knowledge intent',
    examples: ['security compliance', 'retention schedule', 'termination notice'],
  },
];

const DEFAULT_ML_SETTINGS: MLPipelineSettings = {
  topK: 5,
  minRelevanceScore: 0.50,
  chunkSize: 800,
  chunkOverlap: 120,
  embeddingModel: 'text-embedding-3-small',
  llmModel: 'gpt-4o-mini',
  temperature: 0.1,
  maxTokens: 1000,
  similarityMetric: 'cosine',
};

// Storage keys
const LOGS_KEY = 'rag_inference_logs';
const INTENTS_KEY = 'rag_training_intents';
const ENTITIES_KEY = 'rag_extracted_entities';
const SETTINGS_KEY = 'rag_pipeline_settings';

export const ragStateStore = {
  getLogs(): QueryLogEntry[] {
    try {
      const data = localStorage.getItem(LOGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addLog(entry: Omit<QueryLogEntry, 'id' | 'timestamp' | 'timeFormatted'>) {
    try {
      const logs = this.getLogs();
      const newEntry: QueryLogEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        timeFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      // Keep up to 100 latest entries
      const updated = [newEntry, ...logs].slice(0, 100);
      localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('rag_logs_updated'));
      return newEntry;
    } catch {
      return null;
    }
  },

  clearLogs() {
    try {
      localStorage.removeItem(LOGS_KEY);
      window.dispatchEvent(new Event('rag_logs_updated'));
    } catch {}
  },

  getIntents(): TrainingIntent[] {
    try {
      const data = localStorage.getItem(INTENTS_KEY);
      return data ? JSON.parse(data) : DEFAULT_INTENTS;
    } catch {
      return DEFAULT_INTENTS;
    }
  },

  saveIntents(intents: TrainingIntent[]) {
    try {
      localStorage.setItem(INTENTS_KEY, JSON.stringify(intents));
      window.dispatchEvent(new Event('rag_intents_updated'));
    } catch {}
  },

  getEntities(): DocumentEntity[] {
    try {
      const data = localStorage.getItem(ENTITIES_KEY);
      return data ? JSON.parse(data) : DEFAULT_ENTITIES;
    } catch {
      return DEFAULT_ENTITIES;
    }
  },

  saveEntities(entities: DocumentEntity[]) {
    try {
      localStorage.setItem(ENTITIES_KEY, JSON.stringify(entities));
      window.dispatchEvent(new Event('rag_entities_updated'));
    } catch {}
  },

  getSettings(): MLPipelineSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_ML_SETTINGS;
    } catch {
      return DEFAULT_ML_SETTINGS;
    }
  },

  saveSettings(settings: MLPipelineSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event('rag_settings_updated'));
    } catch {}
  },
};

