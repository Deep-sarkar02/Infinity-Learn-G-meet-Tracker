import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { FiMail, FiUser } from "react-icons/fi";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { InfoModal } from "../../components/ui/InfoModal";
import { useAdminController } from "../../controllers/admin.controller";
import { adminService } from "../../services/admin.service";
import {
  computeTeacherFormErrors,
  TEACHER_DISPLAY_OPTIONS,
  validateTeacherForm,
} from "../../utils/validators";
import { useToast } from "../../hooks/useToast";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";

const TEACHER_REQUIRED_HEADERS = [
  "Full Name",
  "Work email",
  "Grade",
  "Display",
  "Batch ID",
  "Batch name",
];

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const HEADER_ALIASES = {
  fullName: ["full name", "fullname", "name"],
  workEmail: ["work email", "email", "work mail", "teacher email"],
  grade: ["grade", "class"],
  display: ["display", "channel"],
  batchId: ["batch id", "batchid"],
  batchName: ["batch name", "batchname"],
};

const findHeader = (normalizedToActual, aliases) => {
  for (const alias of aliases) {
    const actual = normalizedToActual.get(alias);
    if (actual) return actual;
  }
  return null;
};

export const AddTeacherPage = () => {
  const GRADE_OPTIONS = Array.from({ length: 12 }, (_, idx) => String(idx + 1));
  const { pushToast } = useToast();
  const { addTeacher, loading } = useAdminController();
  const [form, setForm] = useState({
    name: "",
    email: "",
    grade: "",
    display: "",
    batchId: "",
    batchName: "",
  });
  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [touched, setTouched] = useState({});
  const [lastGeneratedPassword, setLastGeneratedPassword] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState({
    open: false,
    totalRows: 0,
    validRows: [],
    invalidRows: [],
  });
  const fieldErrors = useMemo(
    () => computeTeacherFormErrors(form, { touched, submitAttempt }),
    [form, touched, submitAttempt],
  );

  const touch = (key) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const copyPassword = async () => {
    if (!lastGeneratedPassword) return;
    try {
      await navigator.clipboard.writeText(lastGeneratedPassword);
      pushToast({ title: "Generated password copied" });
    } catch {
      pushToast({ title: "Could not copy password", variant: "error" });
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const { ok, values } = validateTeacherForm(form);
    if (!ok) {
      setSubmitAttempt(true);
      setTouched({
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

    const created = await addTeacher(values);
    if (created) {
      setLastGeneratedPassword(created.generatedPassword || "");
      setForm({ name: "", email: "", grade: "", display: "", batchId: "", batchName: "" });
      setTouched({});
      setSubmitAttempt(false);
    }
  };

  const closeBulkPreview = () => {
    setBulkPreview({
      open: false,
      totalRows: 0,
      validRows: [],
      invalidRows: [],
    });
  };

  const confirmBulkUpload = async () => {
    if (!bulkPreview.validRows.length) {
      pushToast({ title: "No valid teacher rows to upload", variant: "error" });
      return;
    }
    setBulkUploading(true);
    try {
      const { data } = await adminService.bulkCreateTeachers(bulkPreview.validRows);
      const created = data.data.created?.length ?? 0;
      const skipped = data.data.skipped?.length ?? 0;
      const failed = data.data.failed?.length ?? 0;
      pushToast({
        title: `Processed ${bulkPreview.validRows.length} valid row(s): ${created} created, ${skipped} duplicate, ${failed} failed, ${bulkPreview.invalidRows.length} invalid.`,
      });
      closeBulkPreview();
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not import teacher Excel",
        variant: "error",
      });
    } finally {
      setBulkUploading(false);
    }
  };

  const handleTeacherExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBulkUploading(true);
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

      const headerMap = {
        name: findHeader(normalizedToActual, HEADER_ALIASES.fullName),
        email: findHeader(normalizedToActual, HEADER_ALIASES.workEmail),
        grade: findHeader(normalizedToActual, HEADER_ALIASES.grade),
        display: findHeader(normalizedToActual, HEADER_ALIASES.display),
        batchId: findHeader(normalizedToActual, HEADER_ALIASES.batchId),
        batchName: findHeader(normalizedToActual, HEADER_ALIASES.batchName),
      };

      const missingHeaders = [];
      if (!headerMap.name) missingHeaders.push("Full Name");
      if (!headerMap.email) missingHeaders.push("Work email");
      if (!headerMap.grade) missingHeaders.push("Grade");
      if (!headerMap.display) missingHeaders.push("Display");
      if (!headerMap.batchId) missingHeaders.push("Batch ID");
      if (!headerMap.batchName) missingHeaders.push("Batch name");

      if (missingHeaders.length > 0) {
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
          name: String(row[headerMap.name] ?? "").trim(),
          email: String(row[headerMap.email] ?? "").trim(),
          grade: String(row[headerMap.grade] ?? "").trim(),
          display: String(row[headerMap.display] ?? "").trim(),
          batchId: String(row[headerMap.batchId] ?? "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .trim()
            .slice(0, 80),
          batchName: String(row[headerMap.batchName] ?? "")
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .trim()
            .slice(0, 120),
        };
        const { ok, values, errors } = validateTeacherForm(mapped, { skipNameValidation: true });
        if (ok) {
          validRows.push(values);
        } else {
          invalidRows.push({
            rowNumber: index + 2,
            reason: Object.values(errors).join("; "),
          });
        }
      });

      // Enforce unique teacher emails: no existing DB emails, no duplicates within this sheet.
      const existingEmailSet = new Set();
      try {
        const { data } = await adminService.listTeachers();
        const teachers = Array.isArray(data?.data) ? data.data : [];
        teachers.forEach((teacher) => {
          const email = String(teacher?.email || "").trim().toLowerCase();
          if (email) existingEmailSet.add(email);
        });
      } catch {
        // If teacher list fetch fails, continue with row validation and backend duplicate protection.
      }

      const seenUploadEmails = new Set();
      const dedupedValidRows = [];
      for (const row of validRows) {
        const email = String(row.email || "").trim().toLowerCase();
        if (!email) {
          dedupedValidRows.push(row);
          continue;
        }
        if (existingEmailSet.has(email)) {
          invalidRows.push({
            rowNumber: "—",
            reason: `Email already exists: ${email}`,
          });
          continue;
        }
        if (seenUploadEmails.has(email)) {
          invalidRows.push({
            rowNumber: "—",
            reason: `Duplicate email in uploaded file: ${email}`,
          });
          continue;
        }
        seenUploadEmails.add(email);
        dedupedValidRows.push(row);
      }

      setBulkPreview({
        open: true,
        totalRows: rows.length,
        validRows: dedupedValidRows,
        invalidRows,
      });
      if (!dedupedValidRows.length) {
        pushToast({ title: "No valid teacher rows found. Review errors in preview.", variant: "error" });
      }
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Could not import teacher Excel",
        variant: "error",
      });
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <AdminPageHero
        eyebrow="Faculty onboarding"
        title="Add a teacher"
        description="Create an instructor profile with grade and batch routing. A secure password is generated on submit and emailed automatically."
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#8BBCEB]">
          <span className="h-2 w-2 rounded-full bg-[#25D366]" />
          Auto email invite
        </span>
      </AdminPageHero>

      <AdminPanel className="max-w-4xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#8BBCEB]/35 bg-[#F5F5F5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1E73D8]">Upload from Excel</p>
            <h2 className="mt-2 font-heading text-lg font-bold text-[#0B3C5D]">Bulk teacher import</h2>
            <p className="mt-2 text-xs font-medium leading-relaxed text-[#1E73D8]/90">
              Required headers:{" "}
              <span className="font-bold text-[#0B3C5D]">
                Full Name, Work email, Grade, Display, Batch ID, Batch name
              </span>
              .
            </p>
            <label className="mt-4 block">
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleTeacherExcelUpload}
                disabled={bulkUploading || loading}
              />
              <span className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#8BBCEB]/60 bg-[#FFFFFF] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#0B3C5D] transition hover:border-[#1E73D8]">
                {bulkUploading ? "Uploading..." : "Upload Excel"}
              </span>
            </label>
          </div>
          <div className="rounded-2xl border border-[#8BBCEB]/35 bg-[#FFFFFF] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1E73D8]">Add manually</p>
            <h2 className="mt-2 font-heading text-lg font-bold text-[#0B3C5D]">Single teacher form</h2>
            <p className="mt-2 text-xs font-medium leading-relaxed text-[#1E73D8]/90">
              Use the form below to add one teacher at a time with grade, channel, batch ID, and batch name.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Input
            tone="admin"
            label="Full name"
            icon={FiUser}
            value={form.name}
            error={fieldErrors.name}
            onBlur={() => touch("name")}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <Input
            tone="admin"
            label="Work email"
            icon={FiMail}
            type="email"
            value={form.email}
            error={fieldErrors.email}
            onBlur={() => touch("email")}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-[#0B3C5D]">
                Grade <span className="text-[#F4D35E]">*</span>
              </span>
              <select
                className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0B3C5D] outline-none transition focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                value={form.grade}
                onBlur={() => touch("grade")}
                onChange={(event) => setForm((prev) => ({ ...prev, grade: event.target.value }))}
                required
              >
                <option value="">Select grade</option>
                {GRADE_OPTIONS.map((gradeOption) => (
                  <option key={gradeOption} value={gradeOption}>
                    Grade {gradeOption}
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
                value={form.display}
                onBlur={() => touch("display")}
                onChange={(event) => setForm((prev) => ({ ...prev, display: event.target.value }))}
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              tone="admin"
              label="Batch ID"
              value={form.batchId}
              error={fieldErrors.batchId}
              onBlur={() => touch("batchId")}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  batchId: event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 80),
                }))
              }
              required
            />
          </div>
          <Input
            tone="admin"
            label="Batch name"
            value={form.batchName}
            maxLength={120}
            error={fieldErrors.batchName}
            onBlur={() => touch("batchName")}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                batchName: event.target.value.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 120),
              }))
            }
            required
          />
          <div className="pt-2">
            <Button type="submit" variant="adminPrimary" disabled={loading || bulkUploading} className="min-w-[200px]">
              {loading ? <Loader label="Saving…" variant="admin" /> : "Create teacher account"}
            </Button>
          </div>
        </form>

        {lastGeneratedPassword ? (
          <div className="mt-8 rounded-2xl border border-[#8BBCEB]/45 bg-[#F5F5F5] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0B3C5D]">Generated password</p>
              <span className="rounded-full bg-[#25D366]/25 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0B3C5D]">
                Copy once
              </span>
            </div>
            <p className="mt-3 break-all rounded-xl border border-[#FFFFFF] bg-[#FFFFFF] px-4 py-3 font-mono text-sm font-medium text-[#0B3C5D]">
              {lastGeneratedPassword}
            </p>
            <div className="mt-3">
              <Button type="button" variant="adminGhost" onClick={copyPassword}>
                Copy to clipboard
              </Button>
            </div>
          </div>
        ) : null}
      </AdminPanel>

      <InfoModal
        open={bulkPreview.open}
        tone="admin"
        title="Review teacher Excel import"
        onClose={closeBulkPreview}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="adminGhost" onClick={closeBulkPreview} disabled={bulkUploading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="adminPrimary"
              onClick={confirmBulkUpload}
              disabled={bulkUploading || bulkPreview.validRows.length === 0}
            >
              {bulkUploading ? "Importing..." : `Confirm import (${bulkPreview.validRows.length})`}
            </Button>
          </div>
        }
      >
        <p className="text-sm font-semibold text-[#0B3C5D]">
          Total rows: {bulkPreview.totalRows} · Valid: {bulkPreview.validRows.length} · Invalid:{" "}
          {bulkPreview.invalidRows.length}
        </p>
        <p className="mt-2 text-xs font-medium text-[#1E73D8]/90">
          Teacher Batch ID is stored as letters and numbers only (symbols removed from Excel). Batch name allows letters,
          numbers, and spaces.
        </p>
        {bulkPreview.validRows.length ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#8BBCEB]/35">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-[#F5F5F5] text-[#0B3C5D]">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Display</th>
                  <th className="px-3 py-2">Batch ID</th>
                  <th className="px-3 py-2">Batch name</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreview.validRows.slice(0, 15).map((row, idx) => (
                  <tr key={`${row.email}-${idx}`} className="border-t border-[#8BBCEB]/20">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.email}</td>
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
