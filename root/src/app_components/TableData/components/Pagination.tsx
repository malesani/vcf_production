import React from "react";
import {
  MDBPagination,
  MDBPaginationItem,
  MDBPaginationLink,
} from "mdb-react-ui-kit";

interface PaginationComponentProps {
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  windowSize?: number; // opcional, cuántos números mostrar
}

const PaginationComponent: React.FC<PaginationComponentProps> = ({
  totalPages,
  currentPage,
  setCurrentPage,
  windowSize = 3,
}) => {
  // función para cambiar de página
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // calcula el rango de páginas a mostrar
  const half = Math.floor(windowSize / 2);
  let start = currentPage - half;
  let end = currentPage + half;

  // corrige si el rango se sale de los límites
  if (start < 1) {
    start = 1;
    end = Math.min(windowSize, totalPages);
  } else if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, totalPages - windowSize + 1);
  }

  const pages = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav aria-label="Page navigation example">
      <MDBPagination className="mb-0 p-3 d-flex justify-content-center">
        {/* Botón Anterior */}
        <MDBPaginationItem disabled={currentPage === 1}>
          <MDBPaginationLink
            href="#"
            aria-label="Previous"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(currentPage - 1);
            }}
          >
            <span aria-hidden="true">«</span>
          </MDBPaginationLink>
        </MDBPaginationItem>

        {/* Números de página (limitados) */}
        {pages.map((page) => (
          <MDBPaginationItem
            key={page}
            active={page === currentPage}
            onClick={() => handlePageChange(page)}
          >
            <MDBPaginationLink href="#">{page}</MDBPaginationLink>
          </MDBPaginationItem>
        ))}

        {/* Botón Siguiente */}
        <MDBPaginationItem disabled={currentPage === totalPages}>
          <MDBPaginationLink
            href="#"
            aria-label="Next"
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(currentPage + 1);
            }}
          >
            <span aria-hidden="true">»</span>
          </MDBPaginationLink>
        </MDBPaginationItem>
      </MDBPagination>
    </nav>
  );
};

export default PaginationComponent;
