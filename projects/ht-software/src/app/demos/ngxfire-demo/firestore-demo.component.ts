import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HtFirestoreService, FireStoreBatchOperation } from 'ht-quick-ngxfire';
import { where } from '@angular/fire/firestore';
import { Subscription } from 'rxjs';

interface TodoItem {
  id?: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

@Component({
  selector: 'app-firestore-demo',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="demo-section">
      <h2>Firestore CRUD</h2>
      <p class="hint">All operations target the <code>demo-todos</code> collection.</p>

      <!-- Add Document -->
      <div class="feature-group">
        <h3>Add Document</h3>
        <input [(ngModel)]="newTitle" placeholder="Todo title" class="input" />
        <select [(ngModel)]="newPriority" class="input">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button class="btn btn-primary" (click)="addTodo()">Add</button>
      </div>

      <!-- Live Collection Data -->
      <div class="feature-group">
        <h3>Live Collection (Observable)</h3>
        <div class="btn-row">
          <button class="btn btn-info" (click)="subscribeToAll()">Subscribe All</button>
          <button class="btn btn-accent" (click)="queryByPriority('high')">Query High Priority</button>
          <button class="btn btn-secondary" (click)="unsubscribe()">Unsubscribe</button>
        </div>

        @if (todos().length > 0) {
          <table class="data-table">
            <thead>
              <tr><th>Title</th><th>Priority</th><th>Done</th><th>Actions</th></tr>
            </thead>
            <tbody>
              @for (todo of todos(); track todo.id) {
                <tr>
                  <td>{{ todo.title }}</td>
                  <td><span class="badge" [class]="'badge--' + todo.priority">{{ todo.priority }}</span></td>
                  <td>{{ todo.completed ? 'Yes' : 'No' }}</td>
                  <td>
                    <button class="btn btn-xs btn-primary" (click)="toggleTodo(todo)">Toggle</button>
                    <button class="btn btn-xs btn-danger" (click)="deleteTodo(todo.id!)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="muted">No documents. Add one or subscribe to the collection.</p>
        }
      </div>

      <!-- Server Count -->
      <div class="feature-group">
        <h3>Server-Side Count</h3>
        <button class="btn btn-info" (click)="getCount()">Get Count</button>
        @if (docCount() !== null) {
          <span class="count-badge">{{ docCount() }} documents</span>
        }
      </div>

      <!-- Batch Write -->
      <div class="feature-group">
        <h3>Batch Write</h3>
        <p class="hint">Creates 3 sample todos atomically.</p>
        <button class="btn btn-accent" (click)="batchCreate()">Batch Create 3 Todos</button>
      </div>

      <!-- Transaction -->
      <div class="feature-group">
        <h3>Transaction</h3>
        <p class="hint">Atomically toggles the first todo's completed status using read-modify-write.</p>
        <button class="btn btn-warn" (click)="runTransactionDemo()">Run Transaction</button>
      </div>

      <!-- Messages -->
      @if (message()) {
        <div class="message" [class.error]="messageType() === 'error'" [class.success]="messageType() === 'success'">
          {{ message() }}
        </div>
      }
    </section>
  `,
  styles: [`
    .demo-section { margin: 1.5rem 0; padding: 1.5rem; border: 1px solid #333; border-radius: 8px; background: #1a1a1a; }
    .feature-group { margin-bottom: 1.5rem; }
    .hint { color: #888; font-size: 0.85rem; margin: 0.25rem 0 0.5rem; }
    .input { padding: 0.5rem; margin-right: 0.5rem; border: 1px solid #444; border-radius: 4px; background: #222; color: #e0e0e0; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; color: white; margin-right: 0.5rem; }
    .btn-xs { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
    .btn-primary { background: #2e7d32; }
    .btn-danger { background: #c62828; }
    .btn-accent { background: #6a1b9a; }
    .btn-warn { background: #b8860b; }
    .btn-info { background: #00838f; }
    .btn-secondary { background: #555; }
    .btn-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; }
    .data-table th, .data-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #333; }
    .data-table th { background: #222; font-weight: 600; color: #d4af37; }
    .badge { padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.75rem; color: white; }
    .badge--low { background: #2e7d32; }
    .badge--medium { background: #b8860b; }
    .badge--high { background: #c62828; }
    .count-badge { margin-left: 0.5rem; padding: 0.25rem 0.75rem; background: #1b3a1b; color: #4caf50; border-radius: 12px; font-weight: 600; }
    .muted { color: #777; font-style: italic; }
    .message { padding: 0.75rem; border-radius: 6px; margin: 0.75rem 0; }
    .message.success { background: #1b3a1b; border: 1px solid #2e7d32; color: #a5d6a7; }
    .message.error { background: #3a1b1b; border: 1px solid #c62828; color: #ef9a9a; }
    code { background: #2a2a2a; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.9em; color: #4caf50; }
  `],
})
export class FirestoreDemoComponent {
  private firestoreService = inject(HtFirestoreService);
  private subscription: Subscription | null = null;

  private readonly COLLECTION = 'demo-todos';

  todos = signal<TodoItem[]>([]);
  docCount = signal<number | null>(null);
  newTitle = '';
  newPriority: 'low' | 'medium' | 'high' = 'medium';
  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  async addTodo(): Promise<void> {
    if (!this.newTitle.trim()) { this.showMessage('Enter a title', 'error'); return; }
    try {
      await this.firestoreService.addDoc(this.COLLECTION, {
        title: this.newTitle.trim(),
        completed: false,
        priority: this.newPriority,
        createdAt: new Date(),
      });
      this.showMessage(`Added "${this.newTitle}"`, 'success');
      this.newTitle = '';
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  subscribeToAll(): void {
    this.unsubscribe();
    this.subscription = this.firestoreService
      .getCollectionData<TodoItem>(this.COLLECTION)
      .subscribe(data => this.todos.set(data));
    this.showMessage('Subscribed to all documents', 'success');
  }

  queryByPriority(priority: string): void {
    this.unsubscribe();
    const q = this.firestoreService.createQuery(this.COLLECTION, where('priority', '==', priority));
    this.subscription = this.firestoreService
      .getCollectionData<TodoItem>(q)
      .subscribe(data => this.todos.set(data));
    this.showMessage(`Subscribed to priority="${priority}" query`, 'success');
  }

  unsubscribe(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.todos.set([]);
  }

  async toggleTodo(todo: TodoItem): Promise<void> {
    if (!todo.id) return;
    try {
      await this.firestoreService.updateDoc(`${this.COLLECTION}/${todo.id}`, { completed: !todo.completed });
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async deleteTodo(id: string): Promise<void> {
    try {
      await this.firestoreService.deleteDoc(`${this.COLLECTION}/${id}`);
      this.showMessage('Deleted', 'success');
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async getCount(): Promise<void> {
    try {
      const count = await this.firestoreService.getCountFromServer(this.COLLECTION);
      this.docCount.set(count);
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async batchCreate(): Promise<void> {
    try {
      const ops = ['Batch item A', 'Batch item B', 'Batch item C'].map(title =>
        new FireStoreBatchOperation('set', `${this.COLLECTION}/${crypto.randomUUID()}`, {
          title,
          completed: false,
          priority: 'medium',
          createdAt: new Date(),
        })
      );
      await this.firestoreService.writeBatch(ops);
      this.showMessage('Batch write committed (3 docs)', 'success');
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  async runTransactionDemo(): Promise<void> {
    const first = this.todos()[0];
    if (!first?.id) { this.showMessage('Subscribe and have at least one doc first', 'error'); return; }
    try {
      const docRef = this.firestoreService.createDocRef(this.COLLECTION, first.id);
      await this.firestoreService.runTransaction(async (txn) => {
        const snap = await txn.get(docRef);
        if (snap.exists()) {
          txn.update(docRef, { completed: !snap.data()?.['completed'] });
        }
      });
      this.showMessage(`Transaction toggled "${first.title}"`, 'success');
    } catch (e: unknown) {
      this.showMessage((e as Error).message, 'error');
    }
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message.set(msg);
    this.messageType.set(type);
    setTimeout(() => this.message.set(''), 4000);
  }
}
