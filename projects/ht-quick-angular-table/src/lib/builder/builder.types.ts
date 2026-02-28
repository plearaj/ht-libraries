import { TableSettings } from '../model/table-settings.model';

export interface BuilderMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuilderResult {
  tableSettings?: TableSettings;
  clarification?: string;
}
