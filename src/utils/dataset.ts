import { IEEECisTransaction } from '../types';

const PRODUCT_CODES: Array<'W' | 'H' | 'C' | 'S' | 'R'> = ['W', 'W', 'W', 'H', 'C', 'S', 'R'];
const CARD_BRANDS: Array<'visa' | 'mastercard' | 'discover' | 'american express'> = [
  'visa', 'visa', 'mastercard', 'mastercard', 'discover', 'american express'
];
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'anonymous.org', 'aol.com', 'outlook.com'];
const BURNER_EMAILS = ['protonmail.ch', 'trashmail.net', 'yopmail.com', 'tempmail.xyz', 'burner.io'];

function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random() || 1e-9;
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + stdDev * randStdNormal;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateNormalTransaction(id: number): IEEECisTransaction {
  const isDebit = Math.random() < 0.75;
  const cardBrand = getRandomElement(CARD_BRANDS);
  const email = getRandomElement(EMAIL_DOMAINS);
  
  const amt = Math.max(2.5, Math.min(350, Math.round(randomNormal(65, 40) * 100) / 100));

  return {
    TransactionID: id,
    TransactionDT: Math.round(Date.now() / 1000) - 86400,
    TransactionAmt: amt,
    ProductCD: getRandomElement(PRODUCT_CODES),
    card1: Math.floor(randomNormal(12000, 3000)),
    card2: Math.floor(randomNormal(350, 100)),
    card3: 150,
    card4: cardBrand,
    card5: Math.floor(randomNormal(150, 50)),
    card6: isDebit ? 'debit' : 'credit',
    addr1: Math.floor(randomNormal(299, 80)),
    addr2: 87,
    dist1: Math.random() < 0.3 ? Math.floor(Math.random() * 25) : undefined,
    P_emaildomain: email,
    R_emaildomain: Math.random() < 0.4 ? email : getRandomElement(EMAIL_DOMAINS),
    C1: Math.floor(Math.random() * 3) + 1,
    C2: Math.floor(Math.random() * 2) + 1,
    C11: Math.floor(Math.random() * 2) + 1,
    C13: Math.floor(Math.random() * 5) + 1,
    D1: Math.floor(Math.random() * 400) + 10,
    D3: Math.floor(Math.random() * 12) + 1,
    D15: Math.floor(Math.random() * 300) + 10,
    M1: Math.random() < 0.9 ? 'T' : 'F',
    M2: Math.random() < 0.95 ? 'T' : 'F',
    M4: getRandomElement(['M0', 'M1', 'M2', 'unknown']),
    M6: Math.random() < 0.85 ? 'T' : 'F',
    isFraud: 0
  };
}

export function generateFraudTransaction(id: number, scenario?: string): IEEECisTransaction {
  const chosenScenario = scenario || getRandomElement([
    'High-Value Region Mismatch',
    'Card Cloning Velocity Run',
    'Product Sweep Account Takeover',
    'Anonymous Device Cash-out',
    'Cold Card Activation Spike'
  ]);

  const base = generateNormalTransaction(id);
  base.isFraud = 1;
  base.fraudScenario = chosenScenario;

  switch (chosenScenario) {
    case 'High-Value Region Mismatch':
      base.TransactionAmt = Math.round((500 + Math.random() * 1500) * 100) / 100;
      base.ProductCD = 'C';
      base.card6 = 'credit';
      base.addr1 = 999;
      base.addr2 = 60;
      base.dist1 = 4500;
      base.P_emaildomain = getRandomElement(BURNER_EMAILS);
      base.R_emaildomain = getRandomElement(BURNER_EMAILS);
      base.C1 = 15;
      base.C11 = 12;
      base.M1 = 'F';
      base.M2 = 'F';
      break;

    case 'Card Cloning Velocity Run':
      base.TransactionAmt = Math.round((200 + Math.random() * 100) * 100) / 100;
      base.ProductCD = 'W';
      base.D3 = 0;
      base.C13 = 45;
      base.C1 = 30;
      base.C2 = 30;
      base.P_emaildomain = 'gmail.com';
      base.R_emaildomain = 'gmail.com';
      break;

    case 'Product Sweep Account Takeover':
      base.TransactionAmt = Math.round((450 + Math.random() * 500) * 100) / 100;
      base.ProductCD = 'R';
      base.card6 = 'credit';
      base.C1 = 55;
      base.C11 = 48;
      base.C13 = 80;
      base.P_emaildomain = getRandomElement(BURNER_EMAILS);
      base.M4 = 'M2';
      base.M6 = 'F';
      break;

    case 'Anonymous Device Cash-out':
      base.TransactionAmt = getRandomElement([500, 1000, 1500]);
      base.ProductCD = 'S';
      base.card6 = 'credit';
      base.card4 = 'discover';
      base.C2 = 25;
      base.D1 = 1;
      base.M1 = 'F';
      base.M4 = 'unknown';
      base.P_emaildomain = 'anonymous.org';
      break;

    case 'Cold Card Activation Spike':
      base.TransactionAmt = Math.round((800 + Math.random() * 1000) * 100) / 100;
      base.ProductCD = 'H';
      base.D1 = 0;
      base.D3 = 0;
      base.D15 = 0;
      base.C1 = 5;
      base.card6 = 'credit';
      base.M1 = 'F';
      base.M2 = 'F';
      base.M6 = 'F';
      break;
  }

  return base;
}

export function generateInitialDataset(size: number = 300, contamination: number = 0.08): IEEECisTransaction[] {
  const dataset: IEEECisTransaction[] = [];
  const fraudCount = Math.floor(size * contamination);
  const normalCount = size - fraudCount;

  let currentId = 2987000;

  for (let i = 0; i < normalCount; i++) {
    dataset.push(generateNormalTransaction(currentId++));
  }

  for (let i = 0; i < fraudCount; i++) {
    dataset.push(generateFraudTransaction(currentId++));
  }

  return dataset.sort(() => Math.random() - 0.5);
}
