import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base Shimmer Skeleton component
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-slate-200/80 rounded-lg ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton for standard KPI / summary metric cards
 */
export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <div className="mt-3">
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Skeleton className="h-3 w-40 rounded" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100" />
    </div>
  );
}

/**
 * Skeleton rows for <tbody> elements in tables
 */
interface TableRowsSkeletonProps {
  rows?: number;
  cols?: number;
  cellWidths?: string[];
}

export function TableRowsSkeleton({
  rows = 5,
  cols = 6,
  cellWidths = [],
}: TableRowsSkeletonProps) {
  // Pre-determined natural width variations for realism
  const defaultWidths = [
    "w-20",
    "w-36",
    "w-28",
    "w-24",
    "w-16",
    "w-20",
    "w-14",
    "w-24",
    "w-16",
    "w-28",
  ];

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skel-row-${rIdx}`} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, cIdx) => {
            const widthClass =
              cellWidths[cIdx] ||
              defaultWidths[(cIdx + rIdx) % defaultWidths.length];
            return (
              <td key={`skel-col-${cIdx}`} className="py-3.5 px-4">
                <Skeleton className={`h-4 ${widthClass} rounded`} />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/**
 * Complete standalone table placeholder with toolbar and rows
 */
export function TableCardSkeleton({
  rows = 5,
  cols = 6,
  title,
}: {
  rows?: number;
  cols?: number;
  title?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        {title ? (
          <span className="font-semibold text-sm text-slate-800">{title}</span>
        ) : (
          <Skeleton className="h-4 w-36 rounded" />
        )}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-200">
            <tr>
              {Array.from({ length: cols }).map((_, idx) => (
                <th key={idx} className="py-3 px-4">
                  <Skeleton className="h-3 w-16 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRowsSkeleton rows={rows} cols={cols} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Skeleton for document letterhead / customer statement preview
 */
export function DocumentSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm space-y-8">
      {/* Header / Letterhead */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-3.5 w-72 rounded" />
          <Skeleton className="h-3 w-40 rounded" />
          <Skeleton className="h-3 w-64 rounded" />
        </div>
        <div className="text-right space-y-2 self-start sm:self-auto">
          <Skeleton className="h-8 w-44 rounded-lg ml-auto" />
          <Skeleton className="h-3.5 w-32 rounded ml-auto" />
          <Skeleton className="h-3 w-28 rounded ml-auto" />
        </div>
      </div>

      {/* Customer Info Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-5 rounded-xl border border-slate-100">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-100 p-3 flex gap-4">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-3.5 w-48 rounded" />
          <Skeleton className="h-3.5 w-24 rounded ml-auto" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
      </div>

      {/* Totals Summary */}
      <div className="flex justify-end">
        <div className="w-72 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-3.5 w-20 rounded" />
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <Skeleton className="h-5 w-28 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
