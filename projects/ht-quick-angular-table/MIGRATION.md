# Migration Guide: Browser-Side AI to Python Backend

This guide covers the breaking changes introduced by the Agent Data Skills feature, which replaces browser-side LLM SDK integration with a Python FastAPI backend.

## Breaking Changes

### Removed APIs

| Removed | Replacement |
|---------|-------------|
| `provideHtAi()` | `provideHtBackend()` |
| `HT_AI_PROVIDER` token | `HT_BACKEND_CONFIG` token |
| `AiModelAdapter` interface | `HtBackendService` |
| `createAiAdapter()` | Not needed (backend handles LLM calls) |
| `ai/` directory (providers) | `backend/` directory (Python FastAPI) |

### New Dependencies

- **Python 3.11+** with FastAPI backend (ships in `backend/` directory)
- **No browser-side LLM SDKs** — `@google/generative-ai` and `@anthropic-ai/sdk` are no longer needed

## Migration Steps

### 1. Update Provider Registration

**Before:**
```typescript
import { provideHtAi } from 'ht-quick-angular-table';

bootstrapApplication(AppComponent, {
  providers: [
    provideHtAi({ provider: 'gemini', apiKey: 'YOUR_KEY' }),
  ],
});
```

**After:**
```typescript
import { provideHtBackend } from 'ht-quick-angular-table';

bootstrapApplication(AppComponent, {
  providers: [
    ...provideHtBackend({ backendUrl: 'http://localhost:8000', apiKey: 'YOUR_KEY' }),
  ],
});
```

### 2. Start the Python Backend

```bash
cd node_modules/ht-quick-angular-table/backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings:
#   JWT_SECRET=your-secret-key
#   API_KEY=your-api-key
#   LITELLM_MODEL=anthropic/claude-sonnet-4-20250514

# Run the server
uvicorn app.main:app --reload
```

### 3. Configure Angular Proxy (Development)

Add to `proxy.conf.json`:
```json
{
  "/auth": { "target": "http://localhost:8000", "secure": false },
  "/agent": { "target": "http://localhost:8000", "secure": false },
  "/skills": { "target": "http://localhost:8000", "secure": false }
}
```

### 4. Remove Old Dependencies

```bash
npm uninstall @google/generative-ai @anthropic-ai/sdk
```

### 5. Update Imports

Remove any imports from the old `ai/` path:
```typescript
// REMOVE these:
import { HT_AI_PROVIDER, createAiAdapter, AiModelAdapter } from 'ht-quick-angular-table';

// KEEP/ADD these:
import { provideHtBackend, HtBackendService, HT_BACKEND_CONFIG } from 'ht-quick-angular-table';
```

## New Features

The backend migration enables three new data-ingestion skills:

- **Excel Upload**: Parse `.xlsx`, `.xls`, `.csv` files via `POST /skills/excel/upload`
- **API Pull**: Fetch data from external APIs with JSONPath extraction via `POST /skills/api/pull`
- **Database Query**: Execute read-only SQL queries via `POST /skills/database/query`

All skills are managed through the `SkillRegistryService` and rendered in the table toolbar via `<ht-skill-menu>`.
