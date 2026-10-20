import React, { useState } from 'react';
import { useStudents } from '../../hooks/useStudents';
import { useTariffs } from '../../hooks/useTariffs';
import { useMonthlyRegistry } from '../../hooks/useMonthlyRegistry';
import { StudentCard } from './StudentCard';
import { StudentFormModal } from './StudentFormModal';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { Users, UserPlus } from 'lucide-react';

export const StudentsSidebar = () => {
  const { filteredStudents, addStudent, updateStudent, deleteStudent } =
    useStudents();
  const { tariffs } = useTariffs();
  const { isStudentBaja } = useMonthlyRegistry();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('todos'); // 'todos' | 'activos' | 'bajas'
  const [modalOpen, setModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);

  const handleOpenCreate = () => {
    setStudentToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setStudentToEdit(student);
    setModalOpen(true);
  };

  const handleSaveStudent = async (studentData) => {
    if (studentToEdit) {
      return await updateStudent(studentToEdit.id, studentData);
    } else {
      return await addStudent(studentData);
    }
  };

  // Filter students by search text and filterType
  const query = search.trim().toLowerCase();
  const displayedStudents = filteredStudents.filter((s) => {
    const matchesSearch =
      !query ||
      s.full_name.toLowerCase().includes(query) ||
      (s.phone && s.phone.includes(query)) ||
      (s.notes && s.notes.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    const isBaja = isStudentBaja(s.id);
    if (filterType === 'bajas') return isBaja;
    if (filterType === 'activos') return !isBaja;
    return true;
  });

  const tariffsById = tariffs.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {});

  return (
    <aside className="w-full md:w-[320px] lg:w-[360px] xl:w-[400px] bg-white border-l-0 md:border-l border-slate-200 flex flex-col h-full shadow-xs shrink-0">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0055A5]" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight m-0">
              Directorio de Alumnos
            </h2>
            <span className="text-[11px] font-bold text-[#0055A5] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {displayedStudents.length}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={UserPlus}
            className="text-xs font-bold"
          >
            Nuevo Alumno
          </Button>
        </div>

        {/* Search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, teléfono..."
          className="mb-2.5"
        />

        {/* Filter Pills */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg text-center text-xs">
          <button
            type="button"
            onClick={() => setFilterType('todos')}
            className={`py-1 rounded-md font-bold transition-all cursor-pointer ${
              filterType === 'todos'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('activos')}
            className={`py-1 rounded-md font-bold transition-all cursor-pointer ${
              filterType === 'activos'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Activos
          </button>
          <button
            type="button"
            onClick={() => setFilterType('bajas')}
            className={`py-1 rounded-md font-bold transition-all cursor-pointer ${
              filterType === 'bajas'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Bajas Mes
          </button>
        </div>
      </div>

      {/* Students List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {displayedStudents.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            tariff={tariffsById[student.tariff_id]}
            onEdit={handleOpenEdit}
            onDelete={deleteStudent}
          />
        ))}

        {displayedStudents.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold">No se encontraron alumnos</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {query ? 'Prueba con otro término de búsqueda' : 'Comienza añadiendo tu primer alumno'}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <StudentFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        studentToEdit={studentToEdit}
        onSave={handleSaveStudent}
      />
    </aside>
  );
};
