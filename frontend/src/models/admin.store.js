import { create } from "zustand";

export const useAdminStore = create((set) => ({
  teachers: [],
  setTeachers: (teachers) => set({ teachers }),
  addTeacher: (teacher) => set((state) => ({ teachers: [teacher, ...state.teachers] })),
  updateTeacherGrade: (teacherId, grade) =>
    set((state) => ({
      teachers: state.teachers.map((teacher) =>
        teacher.id === teacherId ? { ...teacher, grade } : teacher,
      ),
    })),
  mergeTeacher: (teacherId, patch) =>
    set((state) => ({
      teachers: state.teachers.map((teacher) =>
        teacher.id === teacherId ? { ...teacher, ...patch } : teacher,
      ),
    })),
}));
