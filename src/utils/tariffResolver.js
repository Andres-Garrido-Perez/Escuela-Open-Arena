/**
 * OpenArena - Smart Tariff Resolver
 * 
 * Resuelve la tarifa exacta de un alumno comprobando en orden de prioridad:
 * 1. Coincidencia directa por tariff_id
 * 2. Coincidencia por tariff_code (ej. 'AD-2h(4)', 'MEN-2h(4)')
 * 3. Coincidencia a través de las clases en las que está inscrito (slot.tariff_id o categoría de la clase)
 * 4. Coincidencia por category_name ('Adultos', 'Menores') + horas semanales contratadas
 */
export function resolveStudentTariff(student, tariffs = [], slots = [], enrollments = []) {
  if (!student || !tariffs || tariffs.length === 0) return null;

  // 1. Coincidencia directa por ID
  if (student.tariff_id) {
    const byId = tariffs.find((t) => t.id === student.tariff_id);
    if (byId) return byId;
  }

  // 2. Coincidencia por código de tarifa
  if (student.tariff_code) {
    const cleanCode = student.tariff_code.trim().toLowerCase();
    const byCode = tariffs.find(
      (t) => t.code && t.code.trim().toLowerCase() === cleanCode
    );
    if (byCode) return byCode;
  }

  // 3. Coincidencia a través de las clases asignadas en el cuadrante
  if (slots.length > 0 && enrollments.length > 0) {
    const studentEnrollments = enrollments.filter((e) => e.student_id === student.id);
    for (const enroll of studentEnrollments) {
      const slot = slots.find((s) => s.id === enroll.class_slot_id);
      if (slot?.tariff_id) {
        const bySlotTariff = tariffs.find((t) => t.id === slot.tariff_id);
        if (bySlotTariff) return bySlotTariff;
      }
      if (slot?.level_label || slot?.category_name) {
        const slotCat = (slot.category_name || slot.level_label || '').trim().toLowerCase();
        const hours = Number(student.weekly_hours_contracted) || studentEnrollments.length || 0;
        const bySlotCat = tariffs.find((t) => {
          const tCat = (t.category_name || t.level_label || '').trim().toLowerCase();
          const hoursMatch = !hours || !t.hours_per_week || Number(t.hours_per_week) === hours;
          return (tCat === slotCat || tCat.includes(slotCat) || slotCat.includes(tCat)) && hoursMatch;
        });
        if (bySlotCat) return bySlotCat;
      }
    }
  }

  // 4. Coincidencia por nombre de categoría + horas contratadas
  if (student.category_name) {
    const cat = student.category_name.trim().toLowerCase();
    const hours = Number(student.weekly_hours_contracted) || 0;
    const byCat = tariffs.find((t) => {
      const tCat = (t.category_name || t.level_label || '').trim().toLowerCase();
      const hoursMatch = !hours || !t.hours_per_week || Number(t.hours_per_week) === hours;
      return (tCat === cat || tCat.includes(cat) || cat.includes(tCat)) && hoursMatch;
    });
    if (byCat) return byCat;
  }

  return null;
}
