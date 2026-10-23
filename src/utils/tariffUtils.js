/**
 * Formatea y genera un código de tarifa limpio y profesional sin duplicar horas.
 * Ejemplos:
 *   AD-2h(4) con 3 horas -> AD-3h(4)
 *   AD-2h(G4) con 4 horas -> AD-4h(G4)
 *   PT-2 con 3 horas -> PT-3
 *   INI-AV-2 con 3 horas -> INI-AV-3
 *   PR-2 con 3 horas -> PR-3
 *   C2 con 3 horas -> C3
 *   AD-2H(4)-3H (corrupto) -> AD-3h(4)
 */
export function formatTariffCode(code, hours) {
  const h = Number(hours) || 1;
  if (!code) return `CLS-${h}H`;
  let c = code.trim();

  // Si ya tiene una doble indicación de horas previa por concatenación (ej: 'AD-2H(4)-3H')
  c = c.replace(/-\d+H?$/i, (match) => {
    return /\d+h/i.test(c.slice(0, -match.length)) ? '' : match;
  });

  // 1. Si contiene \d+h o \d+H con sufijo (como AD-1h(4), AD-2h(G4), AD-2h(G6))
  if (/\d+h/i.test(c)) {
    return c.replace(/\d+h/i, `${h}h`);
  }

  // 2. Si termina en -\d+ o -\d+H (como PT-1, PT-2, INI-AV-2, PR-1, PAD-INI-2H)
  if (/-\d+H?$/i.test(c)) {
    return c.replace(/-\d+H?$/i, `-${h}`);
  }

  // 3. Códigos cortos tipo letra + número (ej: C1, C2)
  if (/^[A-Z]\d+$/i.test(c)) {
    return c.replace(/\d+$/, String(h));
  }

  return `${c}-${h}H`;
}

/**
 * Corrige y sanea tarifas existentes que puedan tener el código duplicado como AD-2H(4)-3H
 */
export function sanitizeTariffCode(tariff) {
  if (!tariff || !tariff.code) return tariff;
  const currentCode = String(tariff.code).trim();
  const h = Number(tariff.hours_per_week) || 1;

  // Detectar si tiene doble indicación de hora (ej: "AD-2H(4)-3H" o "AD-2h(4)-4H")
  if (/-\d+H?$/i.test(currentCode) && /\d+h/i.test(currentCode.replace(/-\d+H?$/i, ''))) {
    const fixedCode = formatTariffCode(currentCode, h);
    return { ...tariff, code: fixedCode };
  }

  return tariff;
}
