import { useEffect, useMemo, useState } from "react";
import { FiShield } from "react-icons/fi";
import { useAdminController } from "../../controllers/admin.controller";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useToast } from "../../hooks/useToast";
import { Loader } from "../../components/ui/Loader";
import { Modal } from "../../components/ui/Modal";
import {
  computeTeacherFormErrors,
  TEACHER_DISPLAY_OPTIONS,
  validateTeacherForm,
} from "../../utils/validators";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const PAGE_SIZE = 10;

const normTeacherGrade = (g) => (g === undefined || g === null ? "" : String(g).trim());

export const ManageTeachersPage = () => {
  const { pushToast } = useToast();
  const { teachers, loadTeachers, updateTeacher, regenerateTeacherPassword, loading } =
    useAdminController();
  const [generatedPasswords, setGeneratedPasswords] = useState({});
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editTouched, setEditTouched] = useState({});
  const [editSubmitAttempt, setEditSubmitAttempt] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("");
  const [displayFilter, setDisplayFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const fieldErrors = useMemo(
    () =>
      editForm
        ? computeTeacherFormErrors(editForm, {
            touched: editTouched,
            submitAttempt: editSubmitAttempt,
            skipNameValidation: true,
          })
        : {},
    [editForm, editTouched, editSubmitAttempt],
  );

  const filteredTeachers = useMemo(() => {
    let rows = teachers;
    if (gradeFilter) {
      if (gradeFilter === "__none__") {
        rows = rows.filter((t) => !normTeacherGrade(t.grade));
      } else {
        rows = rows.filter((t) => normTeacherGrade(t.grade) === gradeFilter);
      }
    }
    if (displayFilter) {
      if (displayFilter === "__none__") {
        rows = rows.filter((t) => !String(t.display || "").trim());
      } else {
        rows = rows.filter((t) => String(t.display || "").trim() === displayFilter);
      }
    }
    return rows;
  }, [teachers, gradeFilter, displayFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTeachers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTeachers.slice(start, start + PAGE_SIZE);
  }, [filteredTeachers, safePage]);

  const openEdit = (teacher) => {
    setEditingTeacher(teacher);
    setEditForm({
      name: teacher.name,
      email: teacher.email,
      grade: String(teacher.grade ?? ""),
      display: String(teacher.display ?? ""),
      batchId: teacher.batchId || "",
      batchName: teacher.batchName || "",
    });
    setEditTouched({});
    setEditSubmitAttempt(false);
  };

  const closeEdit = () => {
    setEditingTeacher(null);
    setEditForm(null);
    setEditTouched({});
    setEditSubmitAttempt(false);
  };

  const touchEdit = (key) => {
    setEditTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const saveEdit = async () => {
    if (!editForm || !editingTeacher) return;
    const { ok, values } = validateTeacherForm(editForm, { skipNameValidation: true });
    if (!ok) {
      setEditSubmitAttempt(true);
      setEditTouched({
        name: true,
        email: true,
        grade: true,
        display: true,
        batchId: true,
        batchName: true,
      });
      pushToast({ title: "Please fix the highlighted fields", variant: "error" });
      return;
    }
    const updated = await updateTeacher(editingTeacher.id, {
      email: values.email,
      grade: values.grade,
      display: values.display,
      batchId: values.batchId,
      batchName: values.batchName,
    });
    if (updated) closeEdit();
  };

  const copyPassword = async (teacherId) => {
    const password = generatedPasswords[teacherId];
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      pushToast({ title: "Password copied" });
    } catch {
      pushToast({ title: "Could not copy password", variant: "error" });
    }
  };

  if (loading && teachers.length === 0) {
    return (
      <AdminPanel>
        <Loader label="Loading teachers…" variant="admin" />
      </AdminPanel>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="space-y-6">
        <AdminPageHero
          eyebrow="Directory"
          title="Manage teachers"
          description="Your faculty list will appear here. Add instructors from the Add Teacher page first."
        />
        <AdminPanel>
          <EmptyState
            tone="admin"
            title="No teachers yet"
            description="Add teachers from the Add Teacher page. They will appear here from the database."
          />
        </AdminPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <AdminPageHero
        eyebrow="Directory"
        title="Manage teachers"
        description={`${teachers.length} instructor${teachers.length === 1 ? "" : "s"} on file. Filter by grade taught, update routing, rotate passwords, and keep batch metadata current.`}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/30 bg-[#0B3C5D]/30 px-3 py-1.5 text-xs font-bold text-[#F4D35E]">
          <FiShield className="h-3.5 w-3.5" />
          Secure
        </span>
      </AdminPageHero>

      <AdminPanel className="flex flex-col gap-3 rounded-2xl border border-[#8BBCEB]/35 bg-[#F5F5F5] p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[12rem] space-y-1">
          <span className="text-sm font-semibold text-[#0B3C5D]">Filter by grade taught</span>
          <select
            className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
            <option value="__none__">No grade assigned</option>
          </select>
        </label>
        <label className="block min-w-[14rem] space-y-1">
          <span className="text-sm font-semibold text-[#0B3C5D]">Filter by channel</span>
          <select
            className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm font-medium text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
            value={displayFilter}
            onChange={(e) => {
              setDisplayFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All channels</option>
            {TEACHER_DISPLAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="__none__">No channel assigned</option>
          </select>
        </label>
        <p className="text-xs font-medium leading-relaxed text-[#1E73D8]/90 sm:max-w-md sm:flex-1 sm:pb-2">
          Showing{" "}
          <span className="font-bold text-[#0B3C5D]">
            {filteredTeachers.length} of {teachers.length}
          </span>{" "}
          {gradeFilter || displayFilter ? `(filters active)` : `(all instructors)`}
        </p>
        {loading ? <Loader label="Loading..." variant="admin" /> : null}
      </AdminPanel>

      {!filteredTeachers.length ? (
        <AdminPanel>
          <EmptyState
            tone="admin"
            title={gradeFilter ? "No teachers match this grade" : "No teachers yet"}
            description={
              gradeFilter
                ? "Try another grade or choose “All grades” to see everyone on file."
                : "Add teachers from the Add Teacher page."
            }
          />
        </AdminPanel>
      ) : (
      <div className="space-y-4">
        {paginatedTeachers.map((teacher, index) => (
          <AdminPanel
            key={teacher.id}
            className="relative overflow-hidden border-[#8BBCEB]/40 transition hover:shadow-[0_16px_40px_-24px_rgba(30,115,216,0.35)]"
          >
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#F4D35E] to-[#1E73D8]" />
            <div className="pl-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 font-mono text-[10px] font-bold text-[#1E73D8]">
                      #{String((safePage - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}
                    </span>
                    <p className="font-heading text-lg font-bold text-[#0B3C5D]">{teacher.name}</p>
                  </div>
                  <p className="mt-1 text-sm font-medium text-[#1E73D8]">{teacher.email}</p>
                  <div className="mt-3 grid gap-2 text-xs font-semibold text-[#0B3C5D] sm:grid-cols-2">
                    <p className="rounded-lg bg-[#F5F5F5] px-3 py-2">
                      Batch ID: <span className="font-mono text-[#1E73D8]">{teacher.batchId || "—"}</span>
                    </p>
                    <p className="rounded-lg bg-[#F5F5F5] px-3 py-2">
                      Batch name: <span className="text-[#1E73D8]">{teacher.batchName || "—"}</span>
                    </p>
                    <p className="rounded-lg bg-[#F5F5F5] px-3 py-2 sm:col-span-2">
                      Grade taught: <span className="text-[#1E73D8]">{teacher.grade ?? "—"}</span>
                    </p>
                    <p className="rounded-lg bg-[#F5F5F5] px-3 py-2 sm:col-span-2">
                      Display: <span className="text-[#1E73D8]">{teacher.display || "—"}</span>
                    </p>
                  </div>
                  {generatedPasswords[teacher.id] ? (
                    <div className="mt-4 rounded-xl border border-[#8BBCEB]/40 bg-[#F5F5F5] p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#0B3C5D]">
                        Latest generated password
                      </p>
                      <p className="mt-1 break-all font-mono text-xs font-medium text-[#0B3C5D]">
                        {generatedPasswords[teacher.id]}
                      </p>
                      <Button
                        type="button"
                        variant="adminGhost"
                        className="mt-2"
                        onClick={() => copyPassword(teacher.id)}
                        disabled={loading}
                      >
                        Copy password
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <Button type="button" variant="adminPrimary" disabled={loading} onClick={() => openEdit(teacher)}>
                    Update profile
                  </Button>
                  <Button
                    type="button"
                    variant="adminGhost"
                    disabled={loading}
                    onClick={async () => {
                      const response = await regenerateTeacherPassword(teacher.id, true);
                      if (response?.generatedPassword) {
                        setGeneratedPasswords((prev) => ({
                          ...prev,
                          [teacher.id]: response.generatedPassword,
                        }));
                      }
                    }}
                  >
                    Regenerate password
                  </Button>
                </div>
              </div>
            </div>
          </AdminPanel>
        ))}

        <AdminPanel className="flex flex-col gap-3 rounded-2xl border border-[#8BBCEB]/30 bg-[#F5F5F5] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#0B3C5D]">
            Page <span className="text-[#1E73D8]">{safePage}</span> of{" "}
            <span className="text-[#1E73D8]">{totalPages}</span> · showing{" "}
            <span className="text-[#1E73D8]">{paginatedTeachers.length}</span> record(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="adminGhost"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="adminGhost"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </AdminPanel>
      </div>
      )}

      <Modal
        open={Boolean(editingTeacher && editForm)}
        title="Update teacher"
        confirmLabel="Save changes"
        tone="admin"
        onClose={closeEdit}
        onConfirm={saveEdit}
        confirmLoading={loading}
      >
        {editForm ? (
          <div className="space-y-3">
            <Input
              tone="admin"
              label="Name"
              value={editForm.name}
              readOnly
              className="cursor-not-allowed border-[#8BBCEB]/30 bg-[#F5F5F5] text-[#1E73D8]/80"
              title="Name cannot be changed here"
            />
            <Input
              tone="admin"
              label="Email"
              type="email"
              value={editForm.email}
              error={fieldErrors.email}
              onBlur={() => touchEdit("email")}
              onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-[#0B3C5D]">
                Grade <span className="text-[#F4D35E]">*</span>
              </span>
              <select
                className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                value={editForm.grade}
                onBlur={() => touchEdit("grade")}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    grade: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select grade</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
              {fieldErrors.grade ? <p className="text-xs font-medium text-[#0B3C5D]">{fieldErrors.grade}</p> : null}
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-[#0B3C5D]">
                Display <span className="text-[#F4D35E]">*</span>
              </span>
              <select
                className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                value={editForm.display}
                onBlur={() => touchEdit("display")}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    display: event.target.value,
                  }))
                }
                required
              >
                <option value="">Select display</option>
                {TEACHER_DISPLAY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {fieldErrors.display ? (
                <p className="text-xs font-medium text-[#0B3C5D]">{fieldErrors.display}</p>
              ) : null}
            </label>
            <Input
              tone="admin"
              label="Batch ID"
              value={editForm.batchId}
              error={fieldErrors.batchId}
              onBlur={() => touchEdit("batchId")}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  batchId: event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 80),
                }))
              }
              required
            />
            <Input
              tone="admin"
              label="Batch name"
              value={editForm.batchName}
              maxLength={120}
              error={fieldErrors.batchName}
              onBlur={() => touchEdit("batchName")}
              onChange={(event) =>
                setEditForm((prev) => ({
                  ...prev,
                  batchName: event.target.value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 120),
                }))
              }
              required
            />
            <p className="text-xs font-medium text-[#1E73D8]/85">
              Name is read-only. Other fields follow the same rules as when adding a teacher.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
