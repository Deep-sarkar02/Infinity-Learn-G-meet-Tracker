import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiUserPlus } from "react-icons/fi";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { adminService } from "../../services/admin.service";
import { useToast } from "../../hooks/useToast";
import { ROSTER_DISPLAY_OPTIONS } from "../../utils/validators";
import { AdminPageHero, AdminPanel } from "../../components/admin/AdminPageChrome";

export const RosterStudentsPage = () => {
  const { pushToast } = useToast();
  const [savedRoster, setSavedRoster] = useState([]);
  const [gradeFilter, setGradeFilter] = useState("");
  const [displayFilter, setDisplayFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
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

  const loadStudents = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      try {
        const params = {
          page: targetPage,
          limit: 10,
          ...(gradeFilter ? { grade: gradeFilter } : {}),
          ...(displayFilter ? { display: displayFilter } : {}),
          ...(appliedSearch ? { search: appliedSearch } : {}),
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
    [appliedSearch, displayFilter, gradeFilter, pushToast],
  );

  useEffect(() => {
    loadStudents(page);
  }, [loadStudents, page]);

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-4">
      <AdminPageHero
        eyebrow="Learner data"
        title="Student roster"
        description="Browse roster learners for open booking. Search by name, user ID, phone, or batch."
      >
        <Link
          to="/admin/roster/add"
          className="inline-flex items-center gap-2 rounded-full border border-[#FFFFFF]/25 bg-[#FFFFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#8BBCEB] transition hover:bg-[#FFFFFF]/20"
        >
          <FiUserPlus className="h-4 w-4" />
          Add student
        </Link>
      </AdminPageHero>

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

        <div className="mb-4 space-y-3 rounded-2xl border border-[#8BBCEB]/30 bg-[#FFFFFF] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8BBCEB]"
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Search by name, user ID, phone, or batch…"
                className="w-full rounded-xl border border-[#8BBCEB]/50 bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-sm font-medium text-[#0B3C5D] outline-none transition placeholder:text-[#1E73D8]/40 focus:border-[#1E73D8] focus:ring-2 focus:ring-[#8BBCEB]/35"
                aria-label="Search roster students"
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="adminPrimary" onClick={runSearch} disabled={loading}>
                <span className="inline-flex items-center gap-2">
                  <FiSearch className="h-4 w-4" aria-hidden />
                  Search
                </span>
              </Button>
              {appliedSearch ? (
                <Button type="button" variant="adminGhost" onClick={clearSearch} disabled={loading}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
          {appliedSearch ? (
            <p className="text-xs font-semibold text-[#1E73D8]">
              Showing results for: <span className="text-[#0B3C5D]">&ldquo;{appliedSearch}&rdquo;</span>
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
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
        </div>

        {loading && !savedRoster.length ? (
          <div className="flex justify-center py-10">
            <Loader label="Loading roster…" variant="admin" />
          </div>
        ) : !savedRoster.length ? (
          <>
            <EmptyState
              tone="admin"
              title="No students found"
              description={
                appliedSearch || gradeFilter || displayFilter
                  ? "Try a different search or clear filters."
                  : "Add students from the Add student page."
              }
            />
            {!appliedSearch && !gradeFilter && !displayFilter ? (
              <div className="mt-4 flex justify-center">
                <Link to="/admin/roster/add">
                  <Button type="button" variant="adminPrimary">
                    Add student
                  </Button>
                </Link>
              </div>
            ) : null}
          </>
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
    </div>
  );
};
