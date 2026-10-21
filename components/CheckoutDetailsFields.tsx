'use client';

import { css } from '../lib/css';
import { QATAR_PLACES } from '../lib/qatarPlaces';

export type CheckoutDetails = {
  fullName: string;
  phone: string;
  city: string;
  address: string;
};

type Props = {
  value: CheckoutDetails;
  onChange: (next: CheckoutDetails) => void;
  idPrefix?: string;
};

export default function CheckoutDetailsFields({ value, onChange, idPrefix = 'checkout' }: Props) {
  const cityOptions = QATAR_PLACES.some((place) => place.value === value.city)
    ? QATAR_PLACES
    : value.city.trim()
      ? [{ value: value.city, label: value.city }, ...QATAR_PLACES]
      : QATAR_PLACES;

  return (
    <div className="checkout-fields">
      <label className="checkout-label">
        <span>Full name</span>
        <input
          id={`${idPrefix}-fullName`}
          className="field"
          name="fullName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          value={value.fullName}
          onChange={(event) => onChange({ ...value, fullName: event.target.value })}
        />
      </label>
      <label className="checkout-label">
        <span>Phone</span>
        <input
          id={`${idPrefix}-phone`}
          className="field"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          minLength={6}
          maxLength={40}
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
        />
      </label>
      <label className="checkout-label">
        <span>City / area</span>
        <select
          id={`${idPrefix}-city`}
          className="field"
          name="city"
          required
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          style={css('cursor: pointer')}
        >
          <option value="" disabled>
            Select a place in Qatar
          </option>
          {cityOptions.map((place) => (
            <option key={place.value} value={place.value}>
              {place.label}
            </option>
          ))}
        </select>
      </label>
      <label className="checkout-label">
        <span>Address</span>
        <textarea
          id={`${idPrefix}-address`}
          className="checkout-textarea"
          name="address"
          required
          minLength={6}
          maxLength={300}
          rows={3}
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
          placeholder="Building, street, landmark"
        />
      </label>
    </div>
  );
}
