export const CHILE_BANKS = [
  'Banco de Chile',
  'Banco Estado',
  'Banco Santander',
  'Banco BCI',
  'Banco Itaú',
  'Scotiabank',
  'Banco Falabella',
  'Banco Ripley',
  'Banco Security',
  'Banco Consorcio',
  'Banco BICE',
  'Banco Internacional',
  'Coopeuch',
].map((name) => ({ code: name, name }));

export const BANK_ACCOUNT_TYPES = [
  { code: 'corriente', name: 'Cuenta corriente' },
  { code: 'vista', name: 'Cuenta vista' },
  { code: 'ahorro', name: 'Cuenta de ahorro' },
];
