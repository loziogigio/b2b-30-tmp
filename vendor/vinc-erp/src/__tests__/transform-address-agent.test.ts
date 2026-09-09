import { describe, it, expect } from 'vitest';
import { buildCustomerAddressAgent } from '../mymb/transform';

// Captured live 2026-09-09: GetIndirizziCliente, Belli e Forti, customer 10407.
const ROW = {
  Codice: '1',
  IsSedeLegale: true,
  IndirizzoEsteso: 'VIA SAN Gregorio 44',
  Citta: 'MILANO',
  CodiceAgente: '10524',
  DescrizioneAgente: 'Geromel Daniele',
  EMailAgente: 'geromel.rappresentanze@gmail.com',
  TelefonoAgente: '336230740',
};

describe('buildCustomerAddressAgent', () => {
  it('maps a captured ListaIndirizzi row', () => {
    expect(buildCustomerAddressAgent(ROW)).toEqual({
      addressCode: '1',
      isLegalSeat: true,
      code: '10524',
      name: 'Geromel Daniele',
      email: 'geromel.rappresentanze@gmail.com',
      phone: '336230740',
    });
  });

  it('coerces missing fields to empty strings and IsSedeLegale to a boolean', () => {
    expect(buildCustomerAddressAgent({ Codice: '10' })).toEqual({
      addressCode: '10',
      isLegalSeat: false,
      code: '',
      name: '',
      email: '',
      phone: '',
    });
  });

  it('trims, so a padded address code still matches the CS address id', () => {
    expect(buildCustomerAddressAgent({ Codice: ' 7 ' }).addressCode).toBe('7');
  });
});
