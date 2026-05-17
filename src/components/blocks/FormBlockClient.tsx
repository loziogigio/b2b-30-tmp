'use client';

import { useState } from 'react';
import { useForm, type FieldValues } from 'react-hook-form';

export type FormFieldOption = { label: string; value: string };

export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox';

export interface FormFieldConfig {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];
}

export interface FormBlockConfig {
  variant: 'form';
  title?: string;
  description?: string;
  fields: FormFieldConfig[];
  submit_button_text?: string;
  success_message?: string;
  notification_email?: string;
}

interface Props {
  config: FormBlockConfig;
  blockId: string;
  pageSlug: string;
}

const inputType = (t: FormFieldType): string => {
  if (t === 'textarea' || t === 'select' || t === 'checkbox') return 'text';
  return t;
};

export default function FormBlockClient({ config, blockId, pageSlug }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FieldValues>();
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'success'; message: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const onSubmit = async (values: FieldValues) => {
    setStatus({ kind: 'idle' });
    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pageSlug, formBlockId: blockId, data: values }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        setStatus({
          kind: 'error',
          message: body?.error || `Submit failed (${res.status})`,
        });
        return;
      }
      setStatus({
        kind: 'success',
        message: body?.message || config.success_message || 'Form submitted',
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: `Network error: ${(err as Error).message}`,
      });
    }
  };

  if (status.kind === 'success') {
    return (
      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        {status.message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {config.title && (
        <h2 className="text-lg font-semibold">{config.title}</h2>
      )}
      {config.description && (
        <p className="text-sm text-gray-600">{config.description}</p>
      )}

      {config.fields.map((field) => {
        const reg = register(field.id, {
          required: field.required ? `${field.label} is required` : false,
        });
        const id = `field-${blockId}-${field.id}`;
        const err = errors[field.id]?.message as string | undefined;
        return (
          <div key={field.id} className="space-y-1">
            <div className="flex items-baseline gap-1">
              <label
                htmlFor={id}
                className="block text-sm font-medium text-gray-700"
              >
                {field.label}
              </label>
              {field.required && (
                <span aria-hidden="true" className="text-red-500">
                  *
                </span>
              )}
            </div>

            {field.type === 'textarea' ? (
              <textarea
                id={id}
                {...reg}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                rows={4}
              />
            ) : field.type === 'select' ? (
              <select
                id={id}
                {...reg}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">--</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input id={id} type="checkbox" {...reg} className="h-4 w-4" />
            ) : (
              <input
                id={id}
                type={inputType(field.type)}
                {...reg}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
            )}

            {err && <p className="text-xs text-red-600">{err}</p>}
          </div>
        );
      })}

      {status.kind === 'error' && (
        <p className="text-sm text-red-600">{status.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? '...' : (config.submit_button_text ?? 'Submit')}
      </button>
    </form>
  );
}
