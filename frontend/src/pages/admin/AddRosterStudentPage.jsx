import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { FiDatabase, FiUserPlus } from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
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

const DUPLICATE_STUDENT_MSG =
  "Duplicate student (same phone & name, or same user ID, phone, grade, channel, and batch)";

const rosterNameLower = (name) => String(name ?? "").trim().toLowerCase();

const isRosterDuplicate = (a, b) => {
  if (a.mobile === b.mobile && rosterNameLower(a.name) === rosterNameLower(b.name)) return true;
  return (
    a.userId === b.userId &&
    a.mobile === b.mobile &&
    a.grade === b.grade &&
    a.display === b.display &&
    a.batchId === b.batchId &&
    a.batchName === b.batchName
  );
};

const emptyBulkPreview = () => ({
  open: false,
  phase: "review",
  totalRows: 0,
  validRows: [],
  invalidRows: [],
  duplicateRows: [],
  createdCount: 0,
});

export const AddRosterStudentPage = () => {
  const { pushToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(emptyBulkPreview);
  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [touched, setTouched] = useState({});

  const fieldErrors = useMemo(
    () => computeRosterFormErrors(form, { touched, submitAttempt }),
    [form, touched, submitAttempt],
  );

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
        setForm(emptyForm());
        setTouched({});
        setSubmitAttempt(false);
      } else {
        pushToast({
          title: "This student is already on the roster (duplicate: same phone & name, or same user ID, phone, grade, channel, and batch).",
          variant: "error",
        });
      }
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
    setBulkPreview(emptyBulkPreview());
  };

  const confirmBulkImport = async () => {
    if (!bulkPreview.validRows.length) {
      pushToast({ title: "No valid student rows to upload", variant: "error" });
      return;
    }
    setUploading(true);
    try {
      const payload = bulkPreview.validRows.map(({ rowNumber: _rowNumber, ...row }) => row);
      const { data } = await adminService.bulkImportRoster(payload);
      const created = data.data.created?.length ?? 0;
      const skipped = data.data.skipped ?? [];
      const duplicateRows = skipped.map((skip) => {
        const match = bulkPreview.validRows.find((row) => isRosterDuplicate(row, skip));
        return {
          rowNumber: match?.rowNumber ?? null,
          userId: skip.userId,
          name: skip.name,
          mobile: skip.mobile,
          reason: `${DUPLICATE_STUDENT_MSG}. Already on roster.`,
        };
      });

      setBulkPreview((prev) => ({
        ...prev,
        phase: "result",
        createdCount: created,
        duplicateRows,
      }));

      const invalidCount = bulkPreview.invalidRows.length;
      const duplicateCount = duplicateRows.length;

      if (created === 0 && duplicateCount > 0) {
        pushToast({
          title:
            invalidCount > 0
              ? `No students added. ${duplicateCount} duplicate row(s) on roster, ${invalidCount} invalid row(s) in file.`
              : `No students added. ${duplicateCount} row(s) are duplicates already on the roster.`,
          variant: "error",
        });
      } else if (created > 0 && (duplicateCount > 0 || invalidCount > 0)) {
        pushToast({
          title: `${created} added. ${duplicateCount} duplicate(s) skipped${invalidCount > 0 ? `, ${invalidCount} invalid in file` : ""}.`,
          variant: "warning",
        });
      } else if (created > 0) {
        pushToast({ title: `${created} student(s) added to database.` });
        closeBulkPreview();
      } else {
        pushToast({
          title: invalidCount > 0 ? "No valid rows to import. Fix invalid rows in the file." : "No students were added.",
          variant: "error",
        });
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
        const rowNumber = index + 2;
        if (ok) {
          const duplicateOf = validRows.find((prev) => isRosterDuplicate(prev, values));
          if (duplicateOf) {
            invalidRows.push({
              rowNumber,
              reason: `${DUPLICATE_STUDENT_MSG}. Matches row ${duplicateOf.rowNumber} in this file.`,
            });
          } else {
            validRows.push({ ...values, rowNumber });
          }
        } else {
          invalidRows.push({
            rowNumber,
            reason: Object.values(errors).join("; "),
          });
        }
      });

      setBulkPreview({
        ...emptyBulkPreview(),
        open: true,
        phase: "review",
        totalRows: rows.length,
        validRows,
        invalidRows,
      });
      if (!validRows.length) {
        pushToast({ title: "No valid rows found. Review invalid rows in preview.", variant: "error" });
      } else if (invalidRows.length) {
        pushToast({
          title: `${invalidRows.length} invalid row(s) in file. Review before importing.`,
          variant: "warning",
        });
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
        title="Add student"
        description="Add roster learners for open booking flows. Phone is the unique key; students add email when they book."
      >
        <Link
          to="/admin/roster"
          className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#8BBCEB] transition hover:bg-[#FFFFFF]/20"
        >
          <FiDatabase className="h-4 w-4" />
          View roster
        </Link>
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
              User ID and mobile are required; grade and channel must match dropdown options.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#1E73D8]">
              <FiUserPlus className="h-4 w-4" />
              One student at a time
            </span>
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
          <div className="flex flex-wrap gap-2 pt-2 md:col-span-2">
            <Button type="submit" variant="adminPrimary" disabled={loading || uploading}>
              {loading ? <Loader label="Saving…" variant="admin" /> : "Add to database"}
            </Button>
            <Link to="/admin/roster">
              <Button type="button" variant="adminGhost">
                Back to roster
              </Button>
            </Link>
          </div>
        </form>
      </AdminPanel>

      <InfoModal
        open={bulkPreview.open}
        tone="admin"
        title={bulkPreview.phase === "result" ? "Import results" : "Review student Excel import"}
        onClose={closeBulkPreview}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="adminGhost" onClick={closeBulkPreview} disabled={uploading}>
              Close
            </Button>
            {bulkPreview.phase === "review" ? (
              <Button
                type="button"
                variant="adminPrimary"
                onClick={confirmBulkImport}
                disabled={uploading || bulkPreview.validRows.length === 0}
              >
                {uploading ? "Importing..." : `Confirm import (${bulkPreview.validRows.length})`}
              </Button>
            ) : null}
          </div>
        }
      >
        {bulkPreview.phase === "result" ? (
          <p className="text-sm font-semibold text-[#0B3C5D]">
            Added: {bulkPreview.createdCount} · Duplicates skipped: {bulkPreview.duplicateRows.length} · Invalid in
            file: {bulkPreview.invalidRows.length}
          </p>
        ) : (
          <p className="text-sm font-semibold text-[#0B3C5D]">
            Total rows: {bulkPreview.totalRows} · Valid: {bulkPreview.validRows.length} · Invalid:{" "}
            {bulkPreview.invalidRows.length}
          </p>
        )}
        {bulkPreview.duplicateRows.length ? (
          <div className="mt-4 rounded-xl border border-[#DC2626]/35 bg-[#FEF2F2] p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#991B1B]">Duplicate rows (not added)</p>
            <ul className="mt-2 space-y-1 text-xs font-medium text-[#991B1B]">
              {bulkPreview.duplicateRows.slice(0, 12).map((row, idx) => (
                <li key={`dup-${row.rowNumber ?? idx}-${row.mobile}`}>
                  {row.rowNumber ? `Row ${row.rowNumber}: ` : ""}
                  {row.name} ({row.mobile}) — {row.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {bulkPreview.invalidRows.length ? (
          <div className="mt-4 rounded-xl border border-[#F59E0B]/35 bg-[#FFF7ED] p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9A3412]">Invalid rows</p>
            <ul className="mt-2 space-y-1 text-xs font-medium text-[#9A3412]">
              {bulkPreview.invalidRows.slice(0, 12).map((row) => (
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
