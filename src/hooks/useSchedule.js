import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

export const useSchedule = () => {
  const { adminId } = useAuth();
  const { sport, activeCoachId, refreshKey } = useSchool();

  const [slots, setSlots] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSchedule = useCallback(async () => {
    if (!adminId) {
      setSlots([]);
      setEnrollments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Query ALL class_slots for this admin and sport
      let slotQuery = supabase
        .from('class_slots')
        .select('*')
        .eq('admin_id', adminId);

      if (sport) {
        slotQuery = slotQuery.eq('sport', sport);
      }

      slotQuery = slotQuery
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      const { data: slotData, error: slotErr } = await slotQuery;
      if (slotErr) throw slotErr;

      // Query class_enrollments for this admin
      const { data: enrollData, error: enrollErr } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('admin_id', adminId);

      if (enrollErr) throw enrollErr;

      setSlots(slotData || []);
      setEnrollments(enrollData || []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminId, sport]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule, refreshKey]);

  // Filtered slots for WeeklyGrid (if a coach is selected)
  const filteredSlots =
    activeCoachId && activeCoachId !== 'all'
      ? slots.filter((s) => s.coach_id === activeCoachId)
      : slots;

  // Group enrollments by class_slot_id

  const enrollmentsBySlotId = enrollments.reduce((acc, enroll) => {
    if (!acc[enroll.class_slot_id]) {
      acc[enroll.class_slot_id] = [];
    }
    acc[enroll.class_slot_id].push(enroll);
    return acc;
  }, {});

  // Add new class slot
  const addClassSlot = async (slotData) => {
    if (!adminId) throw new Error('Usuario no autenticado');

    const tempId = `temp-slot-${Date.now()}`;
    const payload = {
      ...slotData,
      admin_id: adminId,
      sport: slotData.sport || sport || 'tenis',
      max_capacity: Number(slotData.max_capacity) || 4,
      day_of_week: Number(slotData.day_of_week),
    };

    const optimisticSlot = { ...payload, id: tempId };
    setSlots((prev) => [...prev, optimisticSlot]);

    try {
      const { data, error: err } = await supabase
        .from('class_slots')
        .insert(payload)
        .select()
        .single();

      if (err) throw err;
      setSlots((prev) => prev.map((s) => (s.id === tempId ? data : s)));
      return data;
    } catch (err) {
      setSlots((prev) => prev.filter((s) => s.id !== tempId));
      throw err;
    }
  };

  // Update existing class slot
  const updateClassSlot = async (slotId, patch) => {
    const previous = [...slots];
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, ...patch } : s))
    );

    try {
      const { data, error: err } = await supabase
        .from('class_slots')
        .update(patch)
        .eq('id', slotId)
        .eq('admin_id', adminId)
        .select()
        .single();

      if (err) throw err;
      setSlots((prev) => prev.map((s) => (s.id === slotId ? data : s)));
      return data;
    } catch (err) {
      setSlots(previous);
      throw err;
    }
  };

  // Delete class slot
  const deleteClassSlot = async (slotId) => {
    const prevSlots = [...slots];
    const prevEnrollments = [...enrollments];

    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    setEnrollments((prev) => prev.filter((e) => e.class_slot_id !== slotId));

    try {
      // First delete enrollments associated with this slot
      await supabase
        .from('class_enrollments')
        .delete()
        .eq('class_slot_id', slotId)
        .eq('admin_id', adminId);

      const { error: err } = await supabase
        .from('class_slots')
        .delete()
        .eq('id', slotId)
        .eq('admin_id', adminId);

      if (err) throw err;
    } catch (err) {
      setSlots(prevSlots);
      setEnrollments(prevEnrollments);
      throw err;
    }
  };

  // Helper to determine twin day for L+X (1+3) and M+J (2+4)
  const getTwinDay = (day) => {
    if (day === 1) return 3; // Lunes -> Miércoles
    if (day === 3) return 1; // Miércoles -> Lunes
    if (day === 2) return 4; // Martes -> Jueves
    if (day === 4) return 2; // Jueves -> Martes
    return null;
  };

  // Enroll student
  const enrollStudent = async ({
    classSlotId,
    studentId,
    enrollmentNote = '',
    alsoAddPairDay = false,
  }) => {
    if (!adminId) throw new Error('Usuario no autenticado');

    // Check if student already enrolled in this slot
    const alreadyEnrolled = enrollments.some(
      (e) => e.class_slot_id === classSlotId && e.student_id === studentId
    );
    if (alreadyEnrolled) {
      return { skipped: true, reason: 'Ya está inscrito en esta clase' };
    }

    const currentSlot = slots.find((s) => s.id === classSlotId);
    const tempEnrollId = `temp-enroll-${Date.now()}`;
    const newEnrollment = {
      id: tempEnrollId,
      admin_id: adminId,
      class_slot_id: classSlotId,
      student_id: studentId,
      enrollment_note: enrollmentNote,
    };

    setEnrollments((prev) => [...prev, newEnrollment]);

    try {
      const { data, error: err } = await supabase
        .from('class_enrollments')
        .insert({
          admin_id: adminId,
          class_slot_id: classSlotId,
          student_id: studentId,
          enrollment_note: enrollmentNote,
        })
        .select()
        .single();

      if (err) throw err;

      setEnrollments((prev) =>
        prev.map((e) => (e.id === tempEnrollId ? data : e))
      );

      // Handle Double Enrollment shortcut (L+X or M+J)
      if (alsoAddPairDay && currentSlot) {
        const twinDay = getTwinDay(Number(currentSlot.day_of_week));
        if (twinDay) {
          // Look for matching slot on twin day with same coach and start time
          let twinSlot = slots.find(
            (s) =>
              Number(s.day_of_week) === twinDay &&
              s.start_time === currentSlot.start_time &&
              s.coach_id === currentSlot.coach_id &&
              s.sport === currentSlot.sport
          );

          // If no exact twin slot exists, create one!
          if (!twinSlot) {
            try {
              twinSlot = await addClassSlot({
                coach_id: currentSlot.coach_id,
                sport: currentSlot.sport,
                day_of_week: twinDay,
                start_time: currentSlot.start_time,
                end_time: currentSlot.end_time,
                level_label: currentSlot.level_label,
                category_name: currentSlot.category_name,
                tariff_id: currentSlot.tariff_id,
                max_capacity: currentSlot.max_capacity,
                court_name: currentSlot.court_name,
                notes: currentSlot.notes,
              });
            } catch (createErr) {
              console.warn('Could not auto-create twin slot:', createErr);
            }
          }

          if (twinSlot) {
            // Enroll in twin slot as well
            await enrollStudent({
              classSlotId: twinSlot.id,
              studentId,
              enrollmentNote,
              alsoAddPairDay: false, // Prevent infinite recursion
            });
          }
        }
      }

      return data;
    } catch (err) {
      setEnrollments((prev) => prev.filter((e) => e.id !== tempEnrollId));
      throw err;
    }
  };

  // Unenroll student
  const unenrollStudent = async (classSlotId, studentId) => {
    const toRemove = enrollments.find(
      (e) => e.class_slot_id === classSlotId && e.student_id === studentId
    );

    if (!toRemove) return;

    const prevEnrollments = [...enrollments];
    setEnrollments((prev) =>
      prev.filter(
        (e) => !(e.class_slot_id === classSlotId && e.student_id === studentId)
      )
    );

    try {
      const { error: err } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('id', toRemove.id)
        .eq('admin_id', adminId);

      if (err) throw err;
    } catch (err) {
      setEnrollments(prevEnrollments);
      throw err;
    }
  };

  // Auto-assign student to schedule based on coach, days and time
  const autoAssignStudentToSchedule = async ({
    studentId,
    coachId,
    daysOfWeek = [],
    startTime,
    endTime,
    tariffId,
    levelLabel,
    sport: targetSport,
    maxCapacity = 4,
  }) => {
    if (!studentId || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0 || !startTime) {
      return { assigned: 0 };
    }

    const currentSport = targetSport || sport || 'tenis';
    const cleanStartTime = startTime.slice(0, 5);

    // Calculate default endTime if not provided (+1h)
    let cleanEndTime = endTime ? endTime.slice(0, 5) : '';
    if (!cleanEndTime) {
      const [sh = 16, sm = 0] = cleanStartTime.split(':').map(Number);
      const endHour = (sh + 1).toString().padStart(2, '0');
      const endMin = sm.toString().padStart(2, '0');
      cleanEndTime = `${endHour}:${endMin}`;
    }

    let assignedCount = 0;
    const createdSlotIds = [];

    for (const day of daysOfWeek) {
      const dayNum = Number(day);
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 6) continue;

      // Find matching slot across allSlots/slots
      const existingSlots = slots.length > 0 ? slots : [];
      let targetSlot = existingSlots.find((s) => {
        const matchesDay = Number(s.day_of_week) === dayNum;
        const matchesTime = (s.start_time || '').slice(0, 5) === cleanStartTime;
        const matchesSport = !s.sport || s.sport === currentSport;
        const matchesCoach = coachId ? s.coach_id === coachId : true;
        return matchesDay && matchesTime && matchesSport && matchesCoach;
      });

      // If slot doesn't exist, create it on the fly!
      if (!targetSlot) {
        try {
          targetSlot = await addClassSlot({
            coach_id: coachId || null,
            sport: currentSport,
            day_of_week: dayNum,
            start_time: cleanStartTime,
            end_time: cleanEndTime,
            level_label: levelLabel || 'General',
            category_name: levelLabel || 'General',
            tariff_id: tariffId || null,
            max_capacity: Number(maxCapacity) || 4,
            court_name: null,
          });
          if (targetSlot?.id) {
            createdSlotIds.push(targetSlot.id);
          }
        } catch (slotCreateErr) {
          console.error(`Error auto-creando clase para día ${dayNum}:`, slotCreateErr);
        }
      }

      // Enroll student in the target slot
      if (targetSlot?.id) {
        try {
          await enrollStudent({
            classSlotId: targetSlot.id,
            studentId,
            enrollmentNote: null,
            alsoAddPairDay: false,
          });
          assignedCount += 1;
        } catch (enrollErr) {
          console.error(`Error inscribiendo en clase ${targetSlot.id}:`, enrollErr);
        }
      }
    }

    return { assigned: assignedCount, createdSlotIds };
  };

  return {
    slots: filteredSlots,
    allSlots: slots,
    enrollments,
    enrollmentsBySlotId,
    loading,
    error,
    addClassSlot,
    updateClassSlot,
    deleteClassSlot,
    enrollStudent,
    unenrollStudent,
    autoAssignStudentToSchedule,
    getTwinDay,
    refreshSchedule: fetchSchedule,
  };
};
