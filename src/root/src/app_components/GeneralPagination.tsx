import React from "react";
import { MDBPagination, MDBPaginationItem, MDBPaginationLink } from 'mdb-react-ui-kit';

export type GeneralPaginationProps = {
    page: number;
    perPage: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
    onPerPageChange?: (newPerPage: number) => void;
};

export default function GeneralPagination({
    page,
    perPage,
    totalPages,
    onPageChange,
    onPerPageChange
}: GeneralPaginationProps) {
    const prev = () => onPageChange(Math.max(1, page - 1));
    const next = () => onPageChange(Math.min(totalPages, page + 1));
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="d-flex align-items-center">
            {onPerPageChange && (
                <select
                    className="form-select form-select-sm me-3"
                    value={perPage}
                    onChange={e => onPerPageChange(Number(e.target.value))}
                >
                    {[5, 10, 25, 50].map(n => (
                        <option key={n} value={n}>
                            {n} / pag.
                        </option>
                    ))}
                </select>
            )}

            <nav aria-label="…">
                <MDBPagination className='mb-0'>
                    {/* Previous */}
                    <MDBPaginationItem disabled={page <= 1}>
                        <MDBPaginationLink
                            onClick={prev}
                            aria-disabled={page <= 1}
                            style={{ cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                        >
                            Previous
                        </MDBPaginationLink>
                    </MDBPaginationItem>

                    {/* Page Numbers */}
                    {pages.map(p => (
                        <MDBPaginationItem key={p} active={p === page}>
                            <MDBPaginationLink 
                                onClick={() => onPageChange(p)}
                                style={{ cursor: p === page ? 'default' : 'pointer' }}
                            >
                                {p}
                                {p === page && <span className='visually-hidden'>(current)</span>}
                            </MDBPaginationLink>
                        </MDBPaginationItem>
                    ))}

                    {/* Next */}
                    <MDBPaginationItem disabled={page >= totalPages}>
                        <MDBPaginationLink
                            onClick={next}
                            aria-disabled={page >= totalPages}
                            style={{ cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                        >
                            Next
                        </MDBPaginationLink>
                    </MDBPaginationItem>
                </MDBPagination>
            </nav>
        </div>
    );
}
