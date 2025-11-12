import React, { useEffect, useState } from 'react';
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBBtn,
  MDBInput,
  MDBTable,
  MDBTableHead,
  MDBTableBody,
} from 'mdb-react-ui-kit';
import { getPagesAppPagesInfo } from '../auth_module/pagesManager';
import { requestFunction } from '../hooks/RequestFunction';

interface Page {
  id: number;
  name: string;
  path: string;
}

const GodPagesManager: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  const [error, setError] = useState('');

  // GET
  const loadPages = async () => {
    try {
      const { pages } = await getPagesAppPagesInfo();
      setPages(pages);
    } catch (err) {
      console.error("Errore nel caricamento delle pagine", err);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  // CREATE
  const addPage = async () => {
    if (!newPageName || !newPagePath) {
      setError('Inserisci tutti i campi richiesti.');
      return;
    }
    try {
      const response = await requestFunction(
        '/auth/api/pages.php',
        'POST',
        'admin_addPage',
        { name: newPageName, path: newPagePath }
      );
      if (response.success) {
        setNewPageName('');
        setNewPagePath('');
        setError('');
        loadPages();
      } else {
        setError(response.error || 'Errore durante l\'aggiunta della pagina.');
      }
    } catch (err) {
      console.error("Errore durante l'aggiunta della pagina", err);
      setError('Errore nella richiesta.');
    }
  };

  // DELETE
  const removePage = async (pageId: number) => {
    try {
      const response = await requestFunction(
        '/auth/api/pages.php',
        'DELETE',
        'admin_deletePage',
        { id: pageId }
      );
      if (response.success) {
        loadPages();
      } else {
        setError(response.error || 'Errore durante l\'eliminazione della pagina.');
      }
    } catch (err) {
      console.error("Errore durante l'eliminazione della pagina", err);
      setError('Errore nella richiesta.');
    }
  };

  return (
    <MDBContainer className="mt-4">
      <h3>Gestione Pagine CMS</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Sezione per l'inserimento di una nuova pagina */}
      <MDBRow>
        <MDBCol md="6">
          <MDBCard className="p-3">
            <h5>Aggiungi Nuova Pagina</h5>
            <MDBInput
              label="Nome Pagina"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              className="mb-3"
            />
            <MDBInput
              label="Percorso Pagina"
              value={newPagePath}
              onChange={(e) => setNewPagePath(e.target.value)}
              className="mb-3"
            />
            <MDBBtn onClick={addPage}>Aggiungi Pagina</MDBBtn>
          </MDBCard>
        </MDBCol>
      </MDBRow>

      {/* Sezione per la lista delle pagine con possibilità di eliminazione */}
      <MDBRow className="mt-4">
        <MDBCol>
          <MDBTable>
            <MDBTableHead>
              <tr>
                <th>ID</th>
                <th>Nome Pagina</th>
                <th>Percorso</th>
                <th>Azioni</th>
              </tr>
            </MDBTableHead>
            <MDBTableBody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>{page.id}</td>
                  <td>{page.name}</td>
                  <td>{page.path}</td>
                  <td>
                    <MDBBtn color="danger" size="sm" onClick={() => removePage(page.id)}>
                      Elimina
                    </MDBBtn>
                  </td>
                </tr>
              ))}
            </MDBTableBody>
          </MDBTable>
        </MDBCol>
      </MDBRow>
    </MDBContainer>
  );
};

export default GodPagesManager;
