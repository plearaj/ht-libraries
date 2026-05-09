# Quickstart: Agent Data Skills

## Prerequisites

- Node.js 20+, Angular 21
- Python 3.11+, pip
- Docker (optional, for backend deployment)

## 1. Install the Angular Library

```bash
# From workspace root
ng build ht-quick-angular-table

# In consuming app
npm install dist/ht-quick-angular-table
```

## 2. Set Up the Python Backend

```bash
# Copy the backend directory from the installed package
cp -r node_modules/ht-quick-angular-table/backend ./ht-table-backend
cd ht-table-backend

# Create virtual environment and install dependencies
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings:
#   LITELLM_MODEL=anthropic/claude-sonnet-4-20250514
#   ANTHROPIC_API_KEY=sk-ant-...
#   JWT_SECRET=your-random-secret-key
#   API_KEY=your-developer-api-key

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Docker Alternative

```bash
cd ht-table-backend
docker build -t ht-table-agent .
docker run -p 8000:8000 --env-file .env ht-table-agent
```

## 3. Configure the Angular App

```typescript
// app.config.ts
import { provideHtBackend } from 'ht-quick-angular-table';

export const appConfig: ApplicationConfig = {
  providers: [
    ...provideHtBackend({
      backendUrl: 'http://localhost:8000',
      apiKey: 'your-developer-api-key',
    }),
  ],
};
```

## 4. Use the Table with Data Skills

```typescript
// my-table.component.ts
import { Component, inject, OnInit } from '@angular/core';
import {
  HtQuickAngularTableComponent,
  SkillRegistryService,
  HtSkillMenuComponent,
} from 'ht-quick-angular-table';

@Component({
  selector: 'app-my-table',
  standalone: true,
  imports: [HtQuickAngularTableComponent, HtSkillMenuComponent],
  template: `
    <ht-quick-angular-table />
  `,
})
export class MyTableComponent implements OnInit {
  private readonly registry = inject(SkillRegistryService);

  ngOnInit(): void {
    // Register the skills you want available in the "Data Source" toolbar menu
    this.registry.registerSkill({
      id: 'excel-upload',
      name: 'Excel Upload',
      icon: 'upload_file',
      configSchema: { type: 'excel-upload', maxFileSizeMb: 10, allowedFormats: ['.xlsx', '.xls', '.csv'] },
    });

    this.registry.registerSkill({
      id: 'api-pull',
      name: 'API Pull',
      icon: 'cloud_download',
      configSchema: { type: 'api-pull', url: '', method: 'GET' },
    });

    this.registry.registerSkill({
      id: 'database',
      name: 'Database Query',
      icon: 'storage',
      configSchema: { type: 'database', dbType: 'postgresql', connectionString: '', query: '', rowLimit: 10000, timeoutSeconds: 30 },
    });
  }
}
```

## 5. Excel Upload

Once the table renders with skills enabled, click the **"Data Source"** button in the toolbar and select **"Excel Upload"**. Choose a `.xlsx`, `.xls`, or `.csv` file. The table auto-populates with the file's data.

## 6. API Data Pull

Configure an API skill programmatically:

```typescript
import { SkillRegistryService } from 'ht-quick-angular-table';
import { inject } from '@angular/core';

const registry = inject(SkillRegistryService);

registry.configureSkill('api-pull', {
  type: 'api-pull',
  url: 'https://jsonplaceholder.typicode.com/users',
  method: 'GET',
});
```

Then click **"Data Source" > "API Pull"** in the toolbar to execute.

## 7. Database Query

```typescript
registry.configureSkill('database', {
  type: 'database',
  dbType: 'postgresql',
  connectionString: 'postgresql://user:pass@host:5432/mydb',
  query: 'SELECT id, name, email FROM users LIMIT 100',
  rowLimit: 10000,
  timeoutSeconds: 30,
});
```

Click **"Data Source" > "Database"** to execute. Only SELECT queries are allowed.

## 8. AI Table Builder (via Backend)

The table builder now uses the Python backend instead of browser-side LLM SDKs:

```typescript
import { HtTableBuilderService } from 'ht-quick-angular-table';
import { inject } from '@angular/core';

const builder = inject(HtTableBuilderService);

// Describe a table in natural language
const result = await builder.describe('Create an inventory table with product name, SKU, quantity, price, and last restocked date');

if (result.tableSettings) {
  // Apply the generated configuration
  console.log(result.tableSettings);
} else if (result.clarification) {
  // AI needs more info
  console.log(result.clarification);
}
```

## Verification Checklist

- [ ] Python backend starts without errors on `http://localhost:8000`
- [ ] Angular app builds with `ng build`
- [ ] "Data Source" button appears in table toolbar
- [ ] Excel upload: select a .xlsx file, table populates
- [ ] API pull: configure a public API, table populates
- [ ] Database: connect to SQLite, run SELECT, table populates
- [ ] AI builder: describe a table, receive valid configuration
- [ ] Write queries (INSERT/UPDATE/DELETE) are rejected
