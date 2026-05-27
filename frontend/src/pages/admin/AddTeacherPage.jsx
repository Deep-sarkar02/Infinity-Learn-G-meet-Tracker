import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { FiMail, FiUser } from "react-icons/fi";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { InfoModal } from "../../components/ui/InfoModal";
import { useAdminController } from "../../controllers/admin.controller";
import { adminService } from "../../services/admin.service";
import { computeTeacherFormErrors, validateTeacherForm } from "../../utils/validators";
import { useToast } from "../../hooks/useToast";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";
import {
  TeacherSingleAssignmentFields,
  emptySingleAssignmentForm,
  formToValidationShape,
  mapBatchFieldErrors,
  touchAssignmentField,
} from "../../components/admin/TeacherSingleAssignmentFields";
import { sanitizeBatchIdInput, sanitizeBatchNameInput } from "../../utils/batchFields";

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

const assignmentKey = ({ email, grade, display, batchId, batchName }) =>
  [
    String(email ?? "").trim().toLowerCase(),
    String(grade ?? "").trim().toLowerCase(),
    String(display ?? "").trim().toLowerCase(),
    String(batchId ?? "").trim().toLowerCase(),
    String(batchName ?? "").trim().toLowerCase(),
  ].join("|");

const listTeacherAssignments = (teacher) => {
  if (Array.isArray(teacher?.batches) && teacher.batches.length) {
    return teacher.batches.map((b) => ({
      grade: String(b.grade ?? "").trim(),
      display: String(b.display ?? "").trim(),
      batchId: String(b.batchId ?? "").trim(),
      batchName: String(b.batchName ?? "").trim(),
    }));
  }
  if (teacher?.grade && teacher?.display && teacher?.batchId && teacher?.batchName) {
    return [
      {
        grade: String(teacher.grade ?? "").trim(),
        display: String(teacher.display ?? "").trim(),
        batchId: String(teacher.batchId ?? "").trim(),
        batchName: String(teacher.batchName ?? "").trim(),
      },
    ];
  }
  return [];
};

export const AddTeacherPage = () => {
  const { pushToast } = useToast();
  const { addTeacher, loading } = useAdminController();
  const [form, setForm] = useState(emptySingleAssignmentForm);
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
  const validationForm = useMemo(() => formToValidationShape(form), [form]);

  const fieldErrors = useMemo(
    () => mapBatchFieldErrors(computeTeacherFormErrors(validationForm, { touched, submitAttempt })),
    [validationForm, touched, submitAttempt],
  );

  const touch = (key) => {
    setTouched((prev) => {
      const patch = touchAssignmentField(key);
      const next = { ...prev };
      for (const k of Object.keys(patch)) {
        if (!next[k]) next[k] = true;
      }
      return next;
    });
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
    const { ok, values } = validateTeacherForm(validationForm);
    if (!ok) {
      setSubmitAttempt(true);
      setTouched({
        name: true,
        email: true,
        batches: true,
        "batches.0.grade": true,
        "batches.0.display": true,
        "batches.0.batchId": true,
        "batches.0.batchName": true,
      });
      pushToast({ title: "Please fix the highlighted fields", variant: "error" });
      return;
    }

    const created = await addTeacher(values);
    if (created) {
      if (created.generatedPassword) {
        setLastGeneratedPassword(created.generatedPassword);
      }
      setForm({
        name: values.name,
        email: values.email,
        grade: "",
        display: "",
        batchId: "",
        batchName: "",
      });
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
      const payloadRows = bulkPreview.validRows.map(({ __rowNumber, ...row }) => row);
      const { data } = await adminService.bulkCreateTeachers(payloadRows);
      const created = data.data.created?.length ?? 0;
      const added = data.data.assignmentsAdded?.length ?? 0;
      const skipped = data.data.skipped?.length ?? 0;
      const failed = data.data.failed?.length ?? 0;
      pushToast({
        title: `Import done: ${created} new teacher(s), ${added} existing updated with more assignments, ${skipped} skipped, ${failed} failed, ${bulkPreview.invalidRows.length} invalid row(s).`,
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
          batchId: sanitizeBatchIdInput(String(row[headerMap.batchId] ?? "").trim()),
          batchName: sanitizeBatchNameInput(String(row[headerMap.batchName] ?? "").trim()),
        };
        const rowForm = {
          ...mapped,
          batches: [
            {
              grade: mapped.grade,
              display: mapped.display,
              batchId: mapped.batchId,
              batchName: mapped.batchName,
            },
          ],
        };
        const { ok, values, errors } = validateTeacherForm(rowForm, { skipNameValidation: true });
        if (ok) {
          validRows.push({ ...values, __rowNumber: index + 2 });
        } else {
          invalidRows.push({
            rowNumber: index + 2,
            reason: Object.values(errors).join("; "),
          });
        }
      });

      const existingKeySet = new Set();
      try {
        const teacherRes = await adminService.listTeachers();
        const teachers = Array.isArray(teacherRes?.data?.data) ? teacherRes.data.data : [];
        teachers.forEach((teacher) => {
          const email = String(teacher?.email ?? "").trim().toLowerCase();
          if (!email) return;
          listTeacherAssignments(teacher).forEach((assignment) => {
            existingKeySet.add(assignmentKey({ email, ...assignment }));
          });
        });
      } catch {
        // If list API fails, still allow preview/upload based on sheet validation only.
      }

      const dedupeSeen = new Set(existingKeySet);
      const finalValidRows = [];
      validRows.forEach((row) => {
        const key = assignmentKey(row);
        if (dedupeSeen.has(key)) {
          invalidRows.push({
            rowNumber: row.__rowNumber,
            reason: "This email is already linked with the same grade, channel, batch ID and batch name",
          });
          return;
        }
        dedupeSeen.add(key);
        finalValidRows.push(row);
      });

      setBulkPreview({
        open: true,
        totalRows: rows.length,
        validRows: finalValidRows,
        invalidRows,
      });
      if (!finalValidRows.length) {
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
        description="Add one assignment at a time (grade, channel, batch). Use the same email again later to add another batch with different details."
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
              Each save adds one assignment. Submit again with the same email to add another grade, channel, or batch. Excel: one row per assignment (same email on multiple rows is allowed).
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
          <TeacherSingleAssignmentFields
            grade={form.grade}
            display={form.display}
            batchId={form.batchId}
            batchName={form.batchName}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            errors={fieldErrors}
            onTouch={touch}
          />
          <div className="pt-2">
            <Button type="submit" variant="adminPrimary" disabled={loading || bulkUploading} className="min-w-[200px]">
              {loading ? <Loader label="Saving…" variant="admin" /> : "Save teacher / assignment"}
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
          Each Excel row is one assignment. The same email can appear across multiple rows with different grade/channel/batch
          combinations. Rows already linked in DB to the same assignment are marked invalid.
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
