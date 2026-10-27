import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

export const useStudents = () => {
  const { adminId } = useAuth();
  const { refreshKey, sport, triggerRefresh } = useSchool();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!adminId) {
      setStudents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('students')
        .select('*')
        .eq('admin_id', adminId)
        .order('full_name', { ascending: true });

      if (err) throw err;
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents, refreshKey]);

  // Filter students by active sport (or all if no sport filter)
  const filteredStudents = useMemo(
    () =>
      students.filter(
        (s) => !s.sport || !sport || s.sport.toLowerCase() === sport.toLowerCase()
      ),
    [students, sport]
  );

  const addStudent = async (studentData) => {
    if (!adminId) throw new Error('Usuario no autenticado');
    if (!studentData.full_name || !studentData.full_name.trim()) {
      throw new Error('El nombre completo es obligatorio');
    }

    const payload = {
      admin_id: adminId,
      full_name: studentData.full_name.trim(),
      phone: studentData.phone?.trim() || null,
      sport: studentData.sport || sport || 'tenis',
      category_name: studentData.category_name || null,
      tariff_code: studentData.tariff_code || null,
      tariff_id: studentData.tariff_id || null,
      is_member: Boolean(studentData.is_member),
      weekly_hours_contracted: studentData.weekly_hours_contracted
        ? Number(studentData.weekly_hours_contracted)
        : null,
      status: studentData.status || 'activo',
      restrictions_text: studentData.restrictions_text || null,
      restrictions_json: studentData.restrictions_json || null,
      notes: studentData.notes || null,
    };

    const tempId = `temp-${Date.now()}`;
    const optimisticStudent = { ...payload, id: tempId };
    setStudents((prev) => [...prev, optimisticStudent]);

    try {
      const { data, error: err } = await supabase
        .from('students')
        .insert(payload)
        .select()
        .single();

      if (err) throw err;
      setStudents((prev) => prev.map((s) => (s.id === tempId ? data : s)));
      if (triggerRefresh) triggerRefresh();
      return data;
    } catch (err) {
      setStudents((prev) => prev.filter((s) => s.id !== tempId));
      throw err;
    }
  };

  const updateStudent = async (id, patch) => {
    const previous = [...students];
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );

    try {
      const { data, error: err } = await supabase
        .from('students')
        .update(patch)
        .eq('id', id)
        .eq('admin_id', adminId)
        .select()
        .single();

      if (err) throw err;
      setStudents((prev) => prev.map((s) => (s.id === id ? data : s)));
      if (triggerRefresh) triggerRefresh();
      return data;
    } catch (err) {
      setStudents(previous);
      throw err;
    }
  };

  const deleteStudent = async (id) => {
    const previous = [...students];
    setStudents((prev) => prev.filter((s) => s.id !== id));

    try {
      // 1. Eliminar matrículas en clases del alumno
      await supabase
        .from('class_enrollments')
        .delete()
        .eq('student_id', id);

      // 2. Eliminar de la tabla students
      const { error: err } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('admin_id', adminId);

      if (err) throw err;
      if (triggerRefresh) triggerRefresh();
    } catch (err) {
      setStudents(previous);
      throw err;
    }
  };

  return {
    students,
    filteredStudents,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    refreshStudents: fetchStudents,
  };
};
