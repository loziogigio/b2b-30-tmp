import { describe, it, expect } from 'vitest';
import {
  attachAgents,
  selectReferenceAgent,
} from '@utils/transform/b2b-addresses';
import type { AddressB2B } from '@framework/acccount/types-b2b-account';

const addr = (
  id: string,
  isLegalSeat: boolean,
  agent?: Partial<AddressB2B['agent']>,
) =>
  ({
    id,
    title: id,
    isLegalSeat,
    address: { street_address: '', city: '', state: '', zip: '', country: '' },
    agent,
  }) as AddressB2B;

const GEROMEL = {
  code: '10524',
  name: 'Geromel Daniele',
  email: 'geromel.rappresentanze@gmail.com',
  phone: '336230740',
};

describe('selectReferenceAgent', () => {
  it('prefers the legal seat, even when it is not first', () => {
    const out = selectReferenceAgent([
      addr('10', false, { code: '999', name: 'Altro Agente' }),
      addr('1', true, GEROMEL),
    ]);
    expect(out).toEqual(GEROMEL);
  });

  it('falls back to the first address that has an agent', () => {
    const out = selectReferenceAgent([
      addr('1', true, {}),
      addr('2', false, {}),
      addr('3', false, GEROMEL),
    ]);
    expect(out).toEqual(GEROMEL);
  });

  it('skips a legal seat with no agent rather than returning an empty block', () => {
    // The section is hidden when there is no agent, so "present but blank"
    // must never be returned as if it were an answer.
    expect(
      selectReferenceAgent([addr('1', true, { code: '', name: '' })]),
    ).toBeUndefined();
  });

  it('returns undefined for no addresses and for no agents anywhere', () => {
    expect(selectReferenceAgent([])).toBeUndefined();
    expect(
      selectReferenceAgent([addr('1', true), addr('2', false)]),
    ).toBeUndefined();
  });

  it('accepts an agent carrying only a name', () => {
    const out = selectReferenceAgent([addr('1', true, { name: 'Solo Nome' })]);
    expect(out).toEqual({ name: 'Solo Nome' });
  });
});

describe('attachAgents', () => {
  const base = (id: string, isLegalSeat = false) =>
    ({
      id,
      title: id,
      isLegalSeat,
      address: {
        street_address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      },
      agent: {
        code: undefined,
        name: undefined,
        email: undefined,
        phone: undefined,
      },
    }) as AddressB2B;

  const agents = [
    {
      addressCode: '1',
      isLegalSeat: true,
      code: '10524',
      name: 'Geromel Daniele',
      email: 'g@x.it',
      phone: '336230740',
    },
    {
      addressCode: '2',
      isLegalSeat: false,
      code: '999',
      name: 'Altro',
      email: '',
      phone: '',
    },
  ];

  it('merges each agent onto the address with the same code', () => {
    const out = attachAgents([base('1', true), base('2')], agents);
    expect(out[0].agent).toEqual({
      code: '10524',
      name: 'Geromel Daniele',
      email: 'g@x.it',
      phone: '336230740',
    });
    expect(out[1].agent?.code).toBe('999');
  });

  it('drops blank fields to undefined so the UI can test truthiness', () => {
    const out = attachAgents([base('2')], agents);
    expect(out[0].agent?.email).toBeUndefined();
    expect(out[0].agent?.phone).toBeUndefined();
  });

  it('leaves addresses untouched when the ERP could not answer (null)', () => {
    const input = [base('1', true)];
    const out = attachAgents(input, null);
    expect(out).toEqual(input);
  });

  it('leaves an address with no matching agent row alone', () => {
    const out = attachAgents([base('99')], agents);
    expect(out[0].agent).toEqual({
      code: undefined,
      name: undefined,
      email: undefined,
      phone: undefined,
    });
  });

  it('is the piece that makes selectReferenceAgent work end to end', () => {
    const merged = attachAgents([base('2'), base('1', true)], agents);
    expect(selectReferenceAgent(merged)?.name).toBe('Geromel Daniele');
  });
});
