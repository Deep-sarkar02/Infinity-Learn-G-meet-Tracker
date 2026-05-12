import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { FiDatabase, FiUserPlus } from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { InfoModal } from "../../components/ui/InfoModal";
import { adminService } from "../../services/admin.service";
import { useToast } from "../../hooks/useToast";
import {
  computeRosterFormErrors,
  ROSTER_DISPLAY_OPTIONS,
  sanitizeRosterPhoneInput,
  validateRosterStudentForm,
} from "../../utils/validators";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";

const emptyForm = () => ({
  userId: "",
  name: "",
  mobile: "",
  grade: "",
  display: "",
  batchId: "",
  batchName: "",
});

const allTouched = () => ({
  userId: true,
  name: true,
  mobile: true,
  grade: true,
  display: true,
  batchId: true,
  batchName: true,
});

const STUDENT_REQUIRED_HEADERS = [
  "User ID",
  "Mobile number",
  "Name",
  "Grade",
  "Display",
  "Batch ID",
  "Batch name",
];

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

export const RosterStudentsPage = () => {
  const { pushToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [savedRoster, setSavedRoster] = useState([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [displayFilter, setDisplayFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState({
    open: false,
    totalRows: 0,
    validRows: [],
    invalidRows: [],
  });
  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [touched, setTouched] = useState({});

  const fieldErrors = useMemo(
    () => computeRosterFormErrors(form, { touched, submitAttempt }),
    [form, touched, submitAttempt],
  );

  const loadStudents = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      try {
        const params = {
          page: targetPage,
          limit: 10,
          ...(gradeFilter ? { grade: gradeFilter } : {}),
          ...(displayFilter ? { display: displayFilter } : {}),
        };
        const { data } = await adminService.listRosterStudents(params);
        const payload = data.data;
        if (Array.isArray(payload)) {
          setSavedRoster(payload);
          setPagination({
            total: payload.length,
            page: targetPage,
            limit: 10,
            totalPages: 1,
            hasPrev: false,
            hasNext: false,
          });
        } else {
          setSavedRoster(payload.items ?? []);
          setPagination({
            total: payload.pagination?.total ?? 0,
            page: payload.pagination?.page ?? targetPage,
            limit: payload.pagination?.limit ?? 10,
            totalPages: payload.pagination?.totalPages ?? 1,
            hasPrev: Boolean(payload.pagination?.hasPrev),
            hasNext: Boolean(payload.pagination?.hasNext),
          });
        }
      } catch (error) {
        pushToast({
          title: error.response?.data?.message || "Unable to load roster",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [displayFilter, gradeFilter, pushToast],
  );

  useEffect(() => {
    loadStudents(page);
  }, [loadStudents, page]);

  const handleAddToDb = async (event) => {
    event.preventDefault();
    const { ok, values } = validateRosterStudentForm(form);
    if (!ok) {
      setTouched(allTouched());
      setSubmitAttempt(true);
      pushToast({
        title: "Please fix the fields marked below",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const { data } = await adminService.bulkImportRoster([
        {
          userId: values.userId,
          name: values.name,
          mobile: values.mobile,
          grade: values.grade,
          display: values.display,
          batchId: values.batchId,
          batchName: values.batchName,
        },
      ]);
      const created = data.data.created?.length ?? 0;
      const skipped = data.data.skipped?.length ?? 0;
      if (created > 0) {
        pushToast({
          title:
            skipped > 0
              ? `Added to database. Skipped duplicate: ${skipped}.`
              : "Student added to database.",
        });
      } else {
        pushToast({
          title: "This student is already on the roster (duplicate skipped).",
          variant: "error",
        });
      }
      setForm(emptyForm());
      setTouched({});
      setSubmitAttempt(false);
      setPage(1);
      await loadStudents(1);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not save student",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const touch = (key) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const closeBulkPreview = () => {
    setBulkPreview({
      open: false,
      totalRows: 0,
      validRows: [],
      invalidRows: [],
    });
  };

  const confirmBulkImport = async () => {
    if (!bulkPreview.validRows.length) {
      pushToast({ title: "No valid student rows to upload", variant: "error" });
      return;
    }
    setUploading(true);
    try {
      const { data } = await adminService.bulkImportRoster(bulkPreview.validRows);
      const created = data.data.created?.length ?? 0;
      const skipped = data.data.skipped?.length ?? 0;
      pushToast({
        title: `Processed ${bulkPreview.validRows.length} valid row(s): ${created} added, ${skipped} duplicate, ${bulkPreview.invalidRows.length} invalid.`,
      });
      closeBulkPreview();
      setPage(1);
      await loadStudents(1);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not import Excel",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleStudentExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      if (!rows.length) {
        pushToast({ title: "Excel sheet is empty", variant: "error" });
        return;
      }

      const normalizedToActual = new Map();
      Object.keys(rows[0]).forEach((header) => {
        normalizedToActual.set(normalizeHeader(header), header);
      });

      const missingHeaders = STUDENT_REQUIRED_HEADERS.filter(
        (header) => !normalizedToActual.has(normalizeHeader(header)),
      );
      if (missingHeaders.length) {
        pushToast({
          title: `Missing headers: ${missingHeaders.join(", ")}`,
          variant: "error",
        });
        return;
      }

      const validRows = [];
      const invalidRows = [];
      rows.forEach((row, index) => {
        const mapped = {
          userId: String(row[normalizedToActual.get(normalizeHeader("User ID"))] ?? "").trim(),
          mobile: sanitizeRosterPhoneInput(
            String(row[normalizedToActual.get(normalizeHeader("Mobile number"))] ?? ""),
          ),
          name: String(row[normalizedToActual.get(normalizeHeader("Name"))] ?? "").trim(),
          grade: String(row[normalizedToActual.get(normalizeHeader("Grade"))] ?? "").trim(),
          display: String(row[normalizedToActual.get(normalizeHeader("Display"))] ?? "").trim(),
          batchId: String(row[normalizedToActual.get(normalizeHeader("Batch ID"))] ?? "").trim(),
          batchName: String(row[normalizedToActual.get(normalizeHeader("Batch name"))] ?? "").trim(),
        };
        const { ok, values, errors } = validateRosterStudentForm(mapped);
        if (ok) {
          validRows.push(values);
        } else {
          invalidRows.push({
            rowNumber: index + 2,
            reason: Object.values(errors).join("; "),
          });
        }
      });

      setBulkPreview({
        open: true,
        totalRows: rows.length,
        validRows,
        invalidRows,
      });
      if (!validRows.length) {
        pushToast({ title: "No valid rows found. Review errors in preview.", variant: "error" });
      }
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not import Excel",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <AdminPageHero
        eyebrow="Learner data"
        title="Student roster"
        description="Import roster learners for open booking flows. Phone is the unique key; students add email when they book."
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#8BBCEB]">
          <FiUserPlus className="h-4 w-4" />
          Bulk-ready
        </span>
      </AdminPageHero>

      <AdminPanel className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#8BBCEB]/35 bg-[#F5F5F5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1E73D8]">Upload from Excel</p>
            <h2 className="mt-2 font-heading text-lg font-bold text-[#0B3C5D]">Bulk student import</h2>
            <p className="mt-2 text-xs font-medium leading-relaxed text-[#1E73D8]/90">
              Required headers:{" "}
              <span className="font-bold text-[#0B3C5D]">
                User ID, Mobile number, Name, Grade, Display, Batch ID, Batch name
              </span>
              .
            </p>
            <label className="mt-4 block">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleStudentExcelUpload}
                disabled={uploading || loading}
              />
              <span className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#8BBCEB]/60 bg-[#FFFFFF] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#0B3C5D] transition hover:border-[#1E73D8]">
                {uploading ? "Uploading..." : "Upload Excel"}
              </span>
            </label>
          </div>
          <div className="rounded-2xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1E73D8]">Add manually</p>
            <h2 className="mt-2 font-heading text-lg font-bold text-[#0B3C5D]">Single student form</h2>
            <p className="mt-2 text-xs font-medium leading-relaxed text-[#1E73D8]/90">
              Use the form below to add one student at a time. User ID and mobile are required; grade and channel must
              match dropdown options.
            </p>
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAddToDb} noValidate>
          <Input
            tone="admin"
            label="User ID"
            value={form.userId}
            maxLength={120}
            error={fieldErrors.userId}
            onBlur={() => touch("userId")}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, userId: event.target.value }));
            }}
            required
          />
          <Input
            tone="admin"
            label="Full name"
            value={form.name}
            maxLength={120}
            error={fieldErrors.name}
            onBlur={() => touch("name")}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, name: event.target.value }));
            }}
            required
          />
          <Input
            tone="admin"
            label="Registered phone number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={form.mobile}
            maxLength={10}
            error={fieldErrors.mobile}
            onBlur={() => touch("mobile")}
            onChange={(event) => {
              const mobile = sanitizeRosterPhoneInput(event.target.value);
              setForm((prev) => ({ ...prev, mobile }));
            }}
            required
          />
          <Input
            tone="admin"
            label="Batch ID"
            placeholder="e.g. Batch-A/2026"
            value={form.batchId}
            maxLength={120}
            error={fieldErrors.batchId}
            onBlur={() => touch("batchId")}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, batchId: event.target.value }));
            }}
            required
          />
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-[#0B3C5D]">
              Display <span className="text-[#F4D35E]"> *</span>
            </span>
            <select
              className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
              value={form.display}
              onBlur={() => touch("display")}
              onChange={(event) => setForm((prev) => ({ ...prev, display: event.target.value }))}
              required
            >
              <option value="">Select display</option>
              {ROSTER_DISPLAY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldErrors.display ? (
              <p className="text-xs font-medium text-[#0B3C5D]">{fieldErrors.display}</p>
            ) : null}
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-[#0B3C5D]">
              Grade / class (1–12) <span className="text-[#F4D35E]"> *</span>
            </span>
            <select
              className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
              value={form.grade}
              onBlur={() => touch("grade")}
              onChange={(event) => setForm((prev) => ({ ...prev, grade: event.target.value }))}
              required
            >
              <option value="">Select grade</option>
              {Array.from({ length: 12 }, (_, idx) => String(idx + 1)).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            {fieldErrors.grade ? <p className="text-xs font-medium text-[#0B3C5D]">{fieldErrors.grade}</p> : null}
          </label>
          <div className="md:col-span-2">
            <Input
              tone="admin"
              label="Batch name"
              placeholder="e.g. Morning Science A"
              value={form.batchName}
              maxLength={120}
              error={fieldErrors.batchName}
              onBlur={() => touch("batchName")}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, batchName: event.target.value }));
              }}
              required
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
            <Button type="submit" variant="adminPrimary" disabled={loading || uploading}>
              {loading ? <Loader label="Saving…" variant="admin" /> : "Add to database"}
            </Button>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel>
        <div className="mb-5 flex flex-col gap-3 border-b border-[#F5F5F5] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#0B3C5D]">Students in database</h2>
            <p className="mt-1 text-sm font-medium text-[#1E73D8]/85">
              {pagination.total > 0
                ? `${pagination.total} record${pagination.total === 1 ? "" : "s"} stored`
                : "Roster appears after your first successful import"}
            </p>
          </div>
          <Button type="button" variant="adminGhost" onClick={() => loadStudents(page)} disabled={loading}>
            {loading ? "…" : "Refresh list"}
          </Button>
        </div>
        <div className="mb-4 grid gap-3 rounded-2xl border border-[#8BBCEB]/30 bg-[#FFFFFF] p-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-[#0B3C5D]">Filter by grade</span>
            <select
              className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
              value={gradeFilter}
              onChange={(event) => {
                setGradeFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All grades</option>
              {Array.from({ length: 12 }, (_, idx) => String(idx + 1)).map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-[#0B3C5D]">Filter by channel</span>
            <select
              className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
              value={displayFilter}
              onChange={(event) => {
                setDisplayFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All channels</option>
              {ROSTER_DISPLAY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              variant="adminGhost"
              onClick={() => {
                setGradeFilter("");
                setDisplayFilter("");
                setPage(1);
              }}
              disabled={!gradeFilter && !displayFilter}
            >
              Clear filters
            </Button>
          </div>
        </div>
        {loading && !savedRoster.length ? (
          <div className="flex justify-center py-10">
            <Loader label="Loading roster…" variant="admin" />
          </div>
        ) : !savedRoster.length ? (
          <EmptyState tone="admin" title="No students yet" description="Add a student using the form above." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-[#8BBCEB]/30 bg-[#F5F5F5]/50">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#8BBCEB]/40 bg-[#FFFFFF] text-[11px] uppercase tracking-wide text-[#0B3C5D]">
                    <th className="px-4 py-3 font-bold">User ID</th>
                    <th className="px-4 py-3 font-bold">Name</th>
                    <th className="px-4 py-3 font-bold">Phone</th>
                    <th className="px-4 py-3 font-bold">Grade</th>
                    <th className="px-4 py-3 font-bold">Display</th>
                    <th className="px-4 py-3 font-bold">Batch ID</th>
                    <th className="px-4 py-3 font-bold">Batch name</th>
                  </tr>
                </thead>
                <tbody>
                  {savedRoster.map((student) => (
                    <tr
                      key={student._id}
                      className="border-b border-[#8BBCEB]/20 bg-[#FFFFFF] transition hover:bg-[#F4D35E]/10"
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-[#0B3C5D]">{student.userId}</td>
                      <td className="px-4 py-3 font-semibold text-[#0B3C5D]">{student.name}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-[#1E73D8]">{student.mobile}</td>
                      <td className="px-4 py-3 font-medium text-[#0B3C5D]">{student.grade}</td>
                      <td className="px-4 py-3 text-[#0B3C5D]">{student.display}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#0B3C5D]">{student.batchId}</td>
                      <td className="px-4 py-3 text-[#1E73D8]/90">{student.batchName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#8BBCEB]/25 bg-[#FFFFFF] px-4 py-3">
              <p className="text-xs font-semibold text-[#0B3C5D]">
                Page {pagination.page} of {pagination.totalPages} · Showing {savedRoster.length} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="adminGhost"
                  disabled={!pagination.hasPrev || loading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="adminGhost"
                  disabled={!pagination.hasNext || loading}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </AdminPanel>
      <InfoModal
        open={bulkPreview.open}
        tone="admin"
        title="Review student Excel import"
        onClose={closeBulkPreview}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="adminGhost" onClick={closeBulkPreview} disabled={uploading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="adminPrimary"
              onClick={confirmBulkImport}
              disabled={uploading || bulkPreview.validRows.length === 0}
            >
              {uploading ? "Importing..." : `Confirm import (${bulkPreview.validRows.length})`}
            </Button>
          </div>
        }
      >
        <p className="text-sm font-semibold text-[#0B3C5D]">
          Total rows: {bulkPreview.totalRows} · Valid: {bulkPreview.validRows.length} · Invalid:{" "}
          {bulkPreview.invalidRows.length}
        </p>
        {bulkPreview.validRows.length ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#8BBCEB]/35">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-[#F5F5F5] text-[#0B3C5D]">
                <tr>
                  <th className="px-3 py-2">User ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Display</th>
                  <th className="px-3 py-2">Batch ID</th>
                  <th className="px-3 py-2">Batch name</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreview.validRows.slice(0, 15).map((row, idx) => (
                  <tr key={`${row.userId}-${idx}`} className="border-t border-[#8BBCEB]/20">
                    <td className="px-3 py-2">{row.userId}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.mobile}</td>
                    <td className="px-3 py-2">{row.grade}</td>
                    <td className="px-3 py-2">{row.display}</td>
                    <td className="px-3 py-2">{row.batchId}</td>
                    <td className="px-3 py-2">{row.batchName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bulkPreview.validRows.length > 15 ? (
              <p className="px-3 py-2 text-xs font-medium text-[#1E73D8]">
                Showing first 15 valid rows. Remaining rows will also be imported.
              </p>
            ) : null}
          </div>
        ) : null}
        {bulkPreview.invalidRows.length ? (
          <div className="mt-4 rounded-xl border border-[#F59E0B]/35 bg-[#FFF7ED] p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9A3412]">Invalid rows</p>
            <ul className="mt-2 space-y-1 text-xs font-medium text-[#9A3412]">
              {bulkPreview.invalidRows.slice(0, 8).map((row) => (
                <li key={`invalid-${row.rowNumber}`}>
                  Row {row.rowNumber}: {row.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </InfoModal>
    </div>
  );
};
