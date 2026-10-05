import { ContactSubmission } from './contact.models';

/** Adapter around the Firebase SDK so the service and page are testable without it. */
export abstract class SubmissionWriter {
  abstract write(data: ContactSubmission): Promise<void>;
}
