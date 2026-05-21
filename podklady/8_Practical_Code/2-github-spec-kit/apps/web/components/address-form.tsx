'use client';

import { useState } from 'react';

export type AddressFormValue = {
  recipientName: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
};

const FIELDS: { name: keyof AddressFormValue; label: string; placeholder?: string; required?: boolean }[] = [
  { name: 'recipientName', label: 'Recipient name', required: true },
  { name: 'street1', label: 'Street address', required: true },
  { name: 'street2', label: 'Apt / Suite' },
  { name: 'city', label: 'City', required: true },
  { name: 'state', label: 'State', placeholder: 'NY', required: true },
  { name: 'postalCode', label: 'ZIP', required: true },
];

export function AddressForm({ onValid }: { onValid: (value: AddressFormValue) => void }) {
  const [value, setValue] = useState<AddressFormValue>({
    recipientName: '',
    street1: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [verdict, setVerdict] = useState<{ isDeliverable: boolean; explanation: string | null } | null>(null);

  const validate = async () => {
    const r = await fetch('/api/addresses/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(value),
    });
    if (!r.ok) {
      setVerdict({ isDeliverable: false, explanation: 'Validation request failed' });
      return;
    }
    const v = (await r.json()) as { isDeliverable: boolean; explanation: string | null };
    setVerdict(v);
    if (v.isDeliverable) onValid(value);
  };

  return (
    <div className="space-y-3" data-testid="address-form">
      {FIELDS.map((f) => (
        <label key={f.name} className="block">
          <span className="text-sm font-medium">{f.label}</span>
          <input
            className="input mt-1"
            value={value[f.name] ?? ''}
            onChange={(e) => setValue({ ...value, [f.name]: e.target.value })}
            required={f.required}
            placeholder={f.placeholder}
            data-testid={`address-${f.name}`}
          />
        </label>
      ))}
      <button type="button" className="btn-secondary" onClick={validate} data-testid="address-validate">
        Validate address
      </button>
      {verdict ? (
        <p
          className={verdict.isDeliverable ? 'text-sm text-green-700' : 'text-sm text-red-600'}
          data-testid={verdict.isDeliverable ? 'address-valid' : 'address-invalid'}
        >
          {verdict.isDeliverable ? '✓ Address looks good' : `✗ ${verdict.explanation ?? 'Undeliverable'}`}
        </p>
      ) : null}
    </div>
  );
}
