export interface AiModelAdapter {
  generate(prompt: string): Promise<string>;
}
