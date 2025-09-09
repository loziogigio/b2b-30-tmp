export type PaymentDeadline = Record<string, any>;
export type Address = Record<string, any>;

export type RawChangePasswordResponse = {
  ReturnCode: number;   // 0 = ok, otherwise error
  Message?: string;     // optional message from ERP
};

export type ChangePasswordPayload = {
  username: string;       // email/username
  old_password: string;
  new_password: string;
};

export type ChangePasswordResult = {
  success: boolean;
  message?: string;
};

// RAW from ERP (as given)
export type RawCustomerResponse = {
  Codice: string;
  CodiceCategoriaAttivita: string;
  CodiceFiscale: string;
  CodiceInterno: string;
  CodiceScontoCliente: string;
  CodiceStatoAnagrafico: string;
  Cognome: string;
  Descrizione: string;
  DescrizioneCategoriaAttivita: string;
  DescrizioneStatoAnangrafico: string;
  Message: string;
  Nome: string;
  PEC: string;
  PartitaIVA: string;
  PartitaIVACee: string;
  RagioneSociale: string;
  ReturnCode: number;
  SDI: string;
  isPersonaFisicaOGiuridica: boolean; // false => legal entity (giuridica), true => natural person (fisica)
};

// English-friendly, normalized for UI
export type CustomerProfile = {
  code: string;                // Codice
  internalCode?: string;       // CodiceInterno
  discountCode?: string;       // CodiceScontoCliente
  statusCode?: string;         // CodiceStatoAnagrafico
  statusLabel?: string;        // DescrizioneStatoAnangrafico
  activityCategoryCode?: string;  // CodiceCategoriaAttivita
  activityCategoryLabel?: string; // DescrizioneCategoriaAttivita
  businessName?: string;       // RagioneSociale or Descrizione
  firstName?: string;          // Nome
  lastName?: string;           // Cognome
  taxCode?: string;            // CodiceFiscale
  vatNumber?: string;          // PartitaIVA
  vatCee?: string;             // PartitaIVACee
  pec?: string;                // PEC
  sdi?: string;                // SDI
  isLegalEntity: boolean;      // derived from isPersonaFisicaOGiuridica
};
export type AddressState = {
  selected: AddressB2B | null;
};

export const addressInitialState: AddressState = {
  selected: null,
};

export type AddressAction =
  | { type: 'SET_SELECTED'; payload: AddressB2B | null }
  | { type: 'RESET' };


// RAW (ERP)
export type RawAddress = {
  CAP: string;
  Cellulare: string;
  Citta: string;
  Codice: string;
  CodiceAgente: string;
  CodiceIVA: string;
  CodiceModalitaPagamento: string;
  CodicePorto: string;
  CodiceValuta: string;
  CodiceVettore: string;
  Comune: string;
  Descrizione: string;
  DescrizioneAgente: string;
  DescrizioneIVA: string;
  DescrizioneModalitaPagamento: string;
  DescrizionePorto: string;
  DescrizioneValuta: string;
  DescrizioneVettore: string;
  EMailAddress: string;
  EMailAgente: string;
  IndirizzoEsteso: string;
  IsSedeLegale: boolean;
  Message: string;
  Nazione: string;
  Provincia: string;
  Regione: string;
  ReturnCode: number;
  ScontoORicarica1: number;
  ScontoORicarica2: number;
  ScontoORicarica3: number | null;
  ScontoORicarica4: number | null;
  ScontoORicarica5: number | null;
  ScontoORicarica6: number | null;
  SitoWeb: string | null;
  Telefono: string;
  TelefonoAgente: string;
};

export type RawAddressesResponse = {
  ListaIndirizzi: RawAddress[];
  Message: string;
  ReturnCode: number;
};

// Normalized (for UI)
export type AddressB2B = {
  id: string;                // Codice
  title: string;             // Descrizione or fallback
  isLegalSeat: boolean;      // IsSedeLegale
  address: {
    street_address: string;  // IndirizzoEsteso
    city: string;            // Citta / Comune
    state: string;           // Provincia
    zip: string;             // CAP
    country: string;         // Nazione
  };
  contact?: {
    phone?: string;          // Telefono
    mobile?: string;         // Cellulare
    email?: string;          // EMailAddress
  };
  agent?: {
    code?: string;           // CodiceAgente
    name?: string;           // DescrizioneAgente
    email?: string;          // EMailAgente
    phone?: string;          // TelefonoAgente
  };
  paymentTerms?: { code?: string; label?: string }; // Codice/DescrizioneModalitaPagamento
  port?: { code?: string; label?: string };         // Codice/DescrizionePorto
  carrier?: { code?: string; label?: string };      // Codice/DescrizioneVettore
  currency?: { code?: string; label?: string };     // Codice/DescrizioneValuta
};


// --- Payment Deadline (raw from ERP) ---
export type RawPaymentDeadlineItem = {
    DataRiferimento: string | null;   // "DD/MM/YYYY" or null
    DataScadenza: string | null;      // "DD/MM/YYYY" or null
    Descrizione: string | null;
    Documento: string | null;         // e.g. "V1/2025/58693"
    GridRiferimentoIsVisible: boolean;
    GridScadenzaIsVisible: boolean;
    Importo: number;                  // amount for the row
    Tipo: string | null;              // e.g. "RBA"
    Totale: number;                   // group total (when a header row)
    isFineRiga: boolean;
    isRiga: boolean;
    isTipoVisualizzazioneRiferimento: boolean;
    isTipoVisualizzazioneScadenza: boolean;
  };
  
  export type RawPaymentDeadlineResponse = {
    CodiceValuta: string;
    DescrizioneValuta: string;
    ListaScadenzaConInfo: RawPaymentDeadlineItem[];
  };
  
  // --- Normalized (English-friendly) ---
  export type PaymentDeadlineRow = {
    referenceDate?: string;   // ISO "YYYY-MM-DD"
    dueDate?: string;         // ISO
    description: string;      // e.g. "RI.BA. ACTIVE"
    document?: string;        // "V1/2025/58693"
    type?: string;            // "RBA"
    amount: number;           // Import amount
    total: number;            // Group total (0 if not a total row)
    isReferenceView: boolean;
    isDueView: boolean;
  };
  
  export type PaymentDeadlineSummary = {
    currencyCode: string;
    currencyLabel: string;
    items: PaymentDeadlineRow[];
  };
  

  // RAW from ERP
export type RawExposition = {
    AccontiFatturatiTotale: number;
    AccontiTotale: number;
    BolleNonFatturateDaScadere: number;
    BolleNonFatturateTotale: number;
    CambiariaDaScadere: number;
    CambiariaScatuto: number; // spelling from ERP
    CambiariaTotale: number;
    CaparreTotale: number;
    CodiceValuta: string;
    DescrizioneValuta: string;
    DifferenzaTotale: number;
    FidoAssicuratoTotale: number;
    FidoInternoTotale: number;
    FidoTotaleTotale: number;
    Message: string;
    OrdiniNonEvasiDaScadere: number;
    OrdiniNonEvasiTotale: number;
    PrebolleNonEvaseDaScadere: number;
    PrebolleNonEvaseTotale: number;
    ReturnCode: number;
    RimesseDaScadere: number;
    RimesseScaduto: number;
    RimesseTotale: number;
    Totale2Totale: number;
  };
  
  // Normalized EN
  export type Exposition = {
    currencyCode: string;
    currencyLabel: string;
  
    // Direct remittances
    directRemittancesExpired: number;
    directRemittancesToExpire: number;
    directRemittancesTotal: number;
  
    // Ri.Ba
    ribaExpired: number;
    ribaToExpire: number;
    ribaTotal: number;
  
    // Unbilled delivery notes (Bolle non fatturate)
    unbilledBillsToExpire: number;
    unbilledBillsTotal: number;
  
    // Orders not fulfilled
    ordersNotFulfilledToExpire: number;
    ordersNotFulfilledTotal: number;
  
    // Pre-bills (Prebolle)
    prebillsToExpire: number;
    prebillsTotal: number;
  
    // Advances
    advancesTotal: number;
  
    // Credit / limits
    trustAssuredTotal: number;   // FidoAssicuratoTotale
    trustInternalTotal: number;  // FidoInternoTotale
    creditLimitTotal: number;    // FidoTotaleTotale
  
    // Totals
    total2Total: number;         // Totale2Totale
    differenceTotal: number;     // DifferenzaTotale
  
    // meta
    message: string;
    returnCode: number;
  };
  