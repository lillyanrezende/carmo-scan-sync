// EAN/GTIN Validator (Modulo 10 checksum)
export function validateEAN(ean: string): boolean {
  // Remove espaços e hífens
  const cleaned = ean.replace(/[\s-]/g, '');
  
  // Validar que é numérico
  if (!/^\d+$/.test(cleaned)) return false;
  
  // Validar comprimento (EAN-8, EAN-13, GTIN-14)
  if (![8, 13, 14].includes(cleaned.length)) return false;

  const digits = cleaned.split('').map(Number);
  const checkDigit = digits.pop()!;

  let sum = 0;
  let multiplier = (cleaned.length % 2 === 0) ? 3 : 1;

  for (const digit of digits) {
    sum += digit * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}

export function isEAN(code: string): boolean {
  const cleaned = code.replace(/[\s-]/g, '');
  return /^\d{8}$|^\d{13}$|^\d{14}$/.test(cleaned);
}
