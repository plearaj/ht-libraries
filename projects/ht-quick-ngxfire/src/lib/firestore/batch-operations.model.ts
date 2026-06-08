export class FireStoreBatchOperation {
  constructor(operation: 'delete', docPath: string)
  constructor(operation: 'set' | 'update', docPath: string, data: Record<string, unknown>)
  constructor(
    readonly operation: 'set' | 'update' | 'delete',
    readonly docPath: string,
    readonly data?: Record<string, unknown>,
  ) {}
}
