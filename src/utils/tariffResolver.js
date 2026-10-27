/**
 * OpenArena - Smart Tariff Resolver
 * 
 * Resuelve la tarifa exacta de un alumno comprobando en orden de prioridad:
 * 1. Coincidencia directa por tariff_id
 * 2. Coincidencia por tariff_code (ej. 'AD-1h(4)', 'AD-2h(6)', 'AD-1h(Grupos de 4)', 'AD-1h(G4)')
 * 3. Coincidencia a través de las clases en las que está inscrito (slot.tariff_id o nivel/capacidad de la clase)
 * 4. Coincidencia por category_name ('Adultos (4)', 'Adultos (6)', 'Adultos') + horas semanales contratadas
 */

function normalizeCode(code) {
  if (!code) return '';
  return String(code)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/gruposde/g, '')
    .replace(/\(g/g, '(')
    .replace(/g4/g, '4')
    .replace(/g6/g, '6')
    .replace(/[^a-z0-9]/g, '');
}

export function resolveStudentTariff(student, tariffs = [], slots = [], enrollments = []) {
  if (!student || !tariffs || tariffs.length === 0) return null;

  const studentSport = (student.sport || 'tenis').toLowerCase();
  const tariffsInSport = tariffs.filter(
    (t) => !t.sport || t.sport.toLowerCase() === studentSport
  );
  const targetTariffs = tariffsInSport.length > 0 ? tariffsInSport : tariffs;

  // 1. Coincidencia directa por ID
  if (student.tariff_id) {
    const byId = targetTariffs.find((t) => String(t.id) === String(student.tariff_id));
    if (byId) return byId;
  }

  // 2. Coincidencia por código de tarifa (exacta o normalizada)
  if (student.tariff_code) {
    const cleanCode = student.tariff_code.trim().toLowerCase();
    const byCode = targetTariffs.find(
      (t) => t.code && t.code.trim().toLowerCase() === cleanCode
    );
    if (byCode) return byCode;

    const normStudentCode = normalizeCode(student.tariff_code);
    const byNormCode = targetTariffs.find(
      (t) => normalizeCode(t.code) === normStudentCode
    );
    if (byNormCode) return byNormCode;
  }

  // 3. Coincidencia a través de las clases asignadas en el cuadrante (slots + enrollments)
  if (slots.length > 0 && enrollments.length > 0) {
    const studentEnrollments = enrollments.filter((e) => e.student_id === student.id);
    if (studentEnrollments.length > 0) {
      const studentSlots = studentEnrollments
        .map((e) => slots.find((s) => s.id === e.class_slot_id))
        .filter(Boolean);

      // Si algún slot tiene tariff_id directamente
      for (const slot of studentSlots) {
        if (slot.tariff_id) {
          const bySlotTariff = targetTariffs.find((t) => String(t.id) === String(slot.tariff_id));
          if (bySlotTariff) return bySlotTariff;
        }
      }

      // Determinar horas (horas contratadas o total de clases en la semana)
      const hours = Number(student.weekly_hours_contracted) || studentSlots.length || 1;

      // Buscar coincidencia analizando los slots del alumno
      for (const slot of studentSlots) {
        const slotText = `${slot.category_name || ''} ${slot.level_label || ''}`.toLowerCase();
        const cap = Number(slot.max_capacity) || 0;

        // Distinción especializada para Adultos (4) vs Adultos (6)
        if (slotText.includes('adult') || cap === 4 || cap === 6) {
          const isGroup6 = cap === 6 || slotText.includes('(6)') || slotText.includes('g6') || slotText.includes('de 6');
          const isGroup4 = cap === 4 || slotText.includes('(4)') || slotText.includes('g4') || slotText.includes('de 4');

          if (isGroup6) {
            const match = targetTariffs.find(
              (t) =>
                (t.category_name?.includes('6') || t.level_label?.includes('6') || Number(t.max_students) === 6) &&
                Number(t.hours_per_week) === hours
            );
            if (match) return match;
          }

          if (isGroup4) {
            const match = targetTariffs.find(
              (t) =>
                (t.category_name?.includes('4') || t.level_label?.includes('4') || Number(t.max_students) === 4) &&
                Number(t.hours_per_week) === hours
            );
            if (match) return match;
          }
        }

        // Otras categorías (Pre-Tenis, Iniciación, Promoción, Competición, etc.)
        const bySlotText = targetTariffs.find((t) => {
          const tText = `${t.category_name || ''} ${t.level_label || ''}`.toLowerCase();
          const hoursMatch = Number(t.hours_per_week) === hours;
          return hoursMatch && (tText.includes(slotText) || slotText.includes(tText));
        });
        if (bySlotText) return bySlotText;
      }
    }
  }

  // 4. Coincidencia por nombre de categoría en el alumno + horas contratadas
  if (student.category_name) {
    const cat = student.category_name.trim().toLowerCase();
    const hours = Number(student.weekly_hours_contracted) || 1;

    if (cat.includes('adult')) {
      const isGroup6 = cat.includes('6') || cat.includes('g6') || cat.includes('de 6');
      const match = targetTariffs.find((t) => {
        const isT6 = t.category_name?.includes('6') || t.level_label?.includes('6') || Number(t.max_students) === 6;
        return (isGroup6 ? isT6 : !isT6) && Number(t.hours_per_week) === hours;
      });
      if (match) return match;
    }

    const byCat = targetTariffs.find((t) => {
      const tCat = (t.category_name || t.level_label || '').trim().toLowerCase();
      const hoursMatch = Number(t.hours_per_week) === hours;
      return hoursMatch && (tCat === cat || tCat.includes(cat) || cat.includes(tCat));
    });
    if (byCat) return byCat;
  }

  return null;
}
