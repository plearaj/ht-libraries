import { Service } from '../content/models';

export interface ContactFormValue {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
  honeypot: string;
}

/** Exactly the fields firestore.rules allows (createdAt is added by the writer). */
export interface ContactSubmission {
  name: string;
  email: string;
  company?: string;
  topic: string;
  message: string;
}

export type SubmitResult = 'sent' | 'offline' | 'failed';

export function toSubmission(value: ContactFormValue): ContactSubmission {
  const company = value.company.trim();
  return {
    name: value.name.trim(),
    email: value.email.trim(),
    ...(company ? { company } : {}),
    topic: value.topic,
    message: value.message.trim(),
  };
}

/** Service slugs, then product and other. Must match the topic list in firestore.rules. */
export function contactTopics(services: Service[]): { value: string; label: string }[] {
  return [
    ...services.map((s) => ({ value: s.slug, label: s.name })),
    { value: 'product', label: 'A product or library' },
    { value: 'other', label: 'Something else' },
  ];
}
