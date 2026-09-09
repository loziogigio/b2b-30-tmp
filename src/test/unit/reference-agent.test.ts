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

describe('attachAgents — MyMB is the authority on the legal seat', () => {
  // Real shape for Belli e Forti customer 10407: the Suite derives isLegalSeat
  // from address_type === 'billing' and marks NOTHING, so every address
  // arrives false. MyMB does know, and agents CAN differ per address, so
  // without this the "prefer the legal seat" rule silently picks an arbitrary
  // address.
  const suiteAddr = (id: string) =>
    ({
      id,
      title: id,
      isLegalSeat: false,
      address: {
        street_address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      },
      agent: {},
    }) as AddressB2B;

  const erpAgents = [
    {
      addressCode: '10',
      isLegalSeat: false,
      code: '999',
      name: 'Altro Agente',
      email: '',
      phone: '',
    },
    {
      addressCode: '1',
      isLegalSeat: true,
      code: '10524',
      name: 'Geromel Daniele',
      email: 'g@x.it',
      phone: '336',
    },
  ];

  it("adopts MyMB's legal seat when the Suite flagged none", () => {
    const out = attachAgents([suiteAddr('10'), suiteAddr('1')], erpAgents);
    expect(out.find((a) => a.id === '1')?.isLegalSeat).toBe(true);
    expect(out.find((a) => a.id === '10')?.isLegalSeat).toBe(false);
  });

  it('so the reference agent is the legal seat, not merely the first', () => {
    const out = attachAgents([suiteAddr('10'), suiteAddr('1')], erpAgents);
    expect(selectReferenceAgent(out)?.name).toBe('Geromel Daniele');
  });

  it('OVERRIDES the Suite when the two disagree — the ERP is the record', () => {
    const suiteSaysTen = [
      { ...suiteAddr('10'), isLegalSeat: true },
      suiteAddr('1'),
    ];
    const out = attachAgents(suiteSaysTen, erpAgents);
    expect(out.find((a) => a.id === '1')?.isLegalSeat).toBe(true);
    expect(out.find((a) => a.id === '10')?.isLegalSeat).toBe(false);
    expect(selectReferenceAgent(out)?.name).toBe('Geromel Daniele');
  });

  it('an address MyMB does not know keeps the flag the Suite gave it', () => {
    const out = attachAgents(
      [{ ...suiteAddr('77'), isLegalSeat: true }, suiteAddr('1')],
      erpAgents,
    );
    expect(out.find((a) => a.id === '77')?.isLegalSeat).toBe(true);
  });

  it('leaves every flag false when MyMB names no legal seat either', () => {
    const noSeat = erpAgents.map((a) => ({ ...a, isLegalSeat: false }));
    const out = attachAgents([suiteAddr('10'), suiteAddr('1')], noSeat);
    expect(out.every((a) => !a.isLegalSeat)).toBe(true);
  });
});
