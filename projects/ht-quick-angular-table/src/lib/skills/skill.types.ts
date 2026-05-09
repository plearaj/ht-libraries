/** Skill execution status lifecycle. */
export type SkillExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Column data type inferred from source data. */
export type ColumnDataType = 'string' | 'number' | 'date' | 'boolean';

/** Data source type identifier. */
export type DataSourceType = 'excel' | 'api' | 'database';

/** Inferred column structure from a data source. */
export interface ColumnDefinition {
  /** Display name for the column header. */
  name: string;
  /** Data key used in row objects (camelCase, alphanumeric + underscore). */
  dataName: string;
  /** Inferred data type. */
  dataType: ColumnDataType;
}

/** Source-specific metadata attached to a DataResult. */
export interface ResultMetadata {
  /** Which skill produced the data. */
  source: DataSourceType;
  /** Selected sheet name (Excel only). */
  sheetName?: string;
  /** Available sheet names (Excel only). */
  sheetNames?: string[];
  /** HTTP status code from the API response (API only). */
  apiStatusCode?: number;
  /** Query execution time in milliseconds (Database only). */
  queryExecutionMs?: number;
}

/** Normalized output from any skill execution. */
export interface DataResult {
  /** Inferred column structure (at least 1). */
  columns: ColumnDefinition[];
  /** Row data as key-value pairs keyed by dataName. */
  rows: Record<string, unknown>[];
  /** Total row count (may exceed returned rows if truncated). */
  totalRows: number;
  /** Whether results were truncated by row limit. */
  truncated: boolean;
  /** Source-specific metadata. */
  metadata?: ResultMetadata;
}

/** Error details from a failed skill execution. */
export interface SkillError {
  /** Error category code (e.g., 'file-too-large', 'invalid-query'). */
  code: string;
  /** User-facing error message. */
  message: string;
  /** Additional context (never includes credentials). */
  details?: unknown;
}

// --- Skill Config (discriminated union by `type`) ---

export interface ExcelUploadConfig {
  type: 'excel-upload';
  /** Maximum file size in MB. Default: 10. */
  maxFileSizeMb: number;
  /** Accepted file extensions. Default: ['.xlsx', '.xls', '.csv']. */
  allowedFormats: string[];
}

export interface ApiPullConfig {
  type: 'api-pull';
  /** Target API endpoint URL. */
  url: string;
  /** HTTP method. Default: 'GET'. */
  method: 'GET' | 'POST';
  /** Request headers (including auth). */
  headers?: Record<string, string>;
  /** Request body (POST only). */
  body?: unknown;
  /** JSONPath expression for data extraction from nested responses. */
  jsonPath?: string;
}

export interface DatabaseConfig {
  type: 'database';
  /** Database engine. */
  dbType: 'postgresql' | 'mysql' | 'sqlite';
  /** Connection string (never transmitted to browser). */
  connectionString: string;
  /** SQL SELECT query. */
  query: string;
  /** Maximum rows returned. Default: 10000. */
  rowLimit: number;
  /** Query timeout in seconds. Default: 30. */
  timeoutSeconds: number;
}

/** Discriminated union of all skill configurations. */
export type SkillConfig = ExcelUploadConfig | ApiPullConfig | DatabaseConfig;

/** A registered data-ingestion skill. */
export interface Skill {
  /** Unique skill identifier (e.g., 'excel-upload', 'api-pull', 'database'). */
  id: string;
  /** Display name shown in toolbar dropdown. */
  name: string;
  /** Material icon name for the menu item. */
  icon?: string;
  /** Configuration for this skill instance. */
  configSchema: SkillConfig;
}

/** A record of a skill invocation lifecycle. */
export interface SkillExecution {
  /** Auto-generated execution identifier. */
  id: string;
  /** Which skill was invoked. */
  skillId: string;
  /** Current execution state. */
  status: SkillExecutionStatus;
  /** Execution start timestamp. */
  startedAt: Date;
  /** Execution end timestamp. */
  completedAt?: Date;
  /** Error details if failed. */
  error?: SkillError;
  /** Output data if completed. */
  result?: DataResult;
}
