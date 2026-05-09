import {DocumentReference, DocumentData, doc, Firestore} from "@angular/fire/firestore";
import {inject} from "@angular/core";
export class FireStoreBatchOperation {
  private firestore: Firestore = inject(Firestore);
  readonly docRef: DocumentReference<DocumentData, DocumentData>;

  constructor(operation: 'delete', docPath: string)
  constructor(operation: 'set' | 'update', docPath: string, data: any)
  constructor(readonly operation: 'set' | 'update' | 'delete', docPath: string, readonly data?: any) {
    this.operation = operation;
    this.docRef = doc(this.firestore, docPath);
    this.data = data;
  }
}
