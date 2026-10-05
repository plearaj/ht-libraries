import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hightower',
    firestore: {
      rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const db = () => env.unauthenticatedContext().firestore();
const submissions = () => collection(db(), 'contactSubmissions');
const valid = (overrides = {}) => ({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  topic: 'consulting',
  message: 'I would like to talk about a project.',
  createdAt: serverTimestamp(),
  ...overrides,
});

async function seed() {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'contactSubmissions/existing'), { ...valid(), createdAt: Timestamp.now() }),
  );
  return doc(db(), 'contactSubmissions/existing');
}

test('allows a valid submission', () => assertSucceeds(addDoc(submissions(), valid())));

test('allows a valid submission without company', () => {
  const { company, ...rest } = valid();
  return assertSucceeds(addDoc(submissions(), rest));
});

test('denies reads', async () => assertFails(getDoc(await seed())));
test('denies updates', async () => assertFails(updateDoc(await seed(), { name: 'Changed' })));
test('denies deletes', async () => assertFails(deleteDoc(await seed())));

test('denies an extra field', () => assertFails(addDoc(submissions(), valid({ admin: true }))));

test('denies a missing required field', () => {
  const { message, ...rest } = valid();
  return assertFails(addDoc(submissions(), rest));
});

test('denies an oversized name', () => assertFails(addDoc(submissions(), valid({ name: 'x'.repeat(101) }))));
test('denies an oversized message', () => assertFails(addDoc(submissions(), valid({ message: 'x'.repeat(5001) }))));
test('denies a too-short message', () => assertFails(addDoc(submissions(), valid({ message: 'short' }))));
test('denies a whitespace-only name', () => assertFails(addDoc(submissions(), valid({ name: '   ' }))));
test('denies a bad email', () => assertFails(addDoc(submissions(), valid({ email: 'not-an-email' }))));
test('denies an unknown topic', () => assertFails(addDoc(submissions(), valid({ topic: 'pizza' }))));
test('denies a client-set createdAt', () => assertFails(addDoc(submissions(), valid({ createdAt: Timestamp.now() }))));
test('denies a non-string company', () => assertFails(addDoc(submissions(), valid({ company: 42 }))));
