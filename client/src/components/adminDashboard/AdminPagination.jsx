export function AdminPagination({ page, pages, onPageChange }) {
  if (!pages || pages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return (
    <div className="admin-pagination">
      <p>
        Page <span className="font-semibold text-foreground">{page}</span> of{" "}
        <span className="font-semibold text-foreground">{pages}</span>
      </p>
      <div className="admin-pagination-nav">
        <button
          type="button"
          disabled={prevDisabled}
          onClick={() => onPageChange(page - 1)}
          className="admin-pagination-button"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => onPageChange(page + 1)}
          className="admin-pagination-button"
        >
          Next
        </button>
      </div>
    </div>
  );
}

