/** Grade, channel, and batch name (batch ID optional — hidden on student-facing views). */
export const BatchAssignmentMeta = ({
  grade,
  display,
  batchId,
  batchName,
  className = "",
  compact = false,
  showBatchId = false,
}) => {
  const lineClass = compact
    ? "text-xs font-semibold text-[#1E73D8]/90"
    : "text-sm font-medium text-[#1E73D8]/90";

  return (
    <div className={`space-y-0.5 ${className}`}>
      {(grade || display) && (
        <p className={lineClass}>
          {grade ? `Grade ${grade}` : ""}
          {grade && display ? " · " : ""}
          {display ? `Channel ${display}` : ""}
        </p>
      )}
      {showBatchId && batchId ? (
        <p className={`${lineClass} break-all font-mono`}>
          <span className="font-sans font-semibold">Batch ID:</span> {batchId}
        </p>
      ) : null}
      {batchName ? (
        <p className={`${lineClass} break-words`}>
          <span className="font-semibold">Batch name:</span> {batchName}
        </p>
      ) : null}
    </div>
  );
};
