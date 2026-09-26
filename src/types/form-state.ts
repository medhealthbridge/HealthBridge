// What a form's Server Action returns to `useActionState`: a form-level
// message, per-field errors shown next to each field, and the submitted
// non-secret values so the form can refill itself after a failed submit.
export type FormState<Field extends string> = {
  message?: string;
  fieldErrors?: Partial<Record<Field, string[]>>;
  values?: Partial<Record<Field, string>>;
};
