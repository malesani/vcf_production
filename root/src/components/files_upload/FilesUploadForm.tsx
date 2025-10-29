import { useState } from 'react';
import {
  MDBCard,
  MDBCardHeader,
  MDBCardBody,
  MDBTable,
  MDBTableHead,
  MDBTableBody,
  MDBBtn,
  MDBIcon,
} from 'mdb-react-ui-kit';

import { GeneralForm } from "../../app_components/GeneralForm";
import { General_InfoBlock } from '../../app_components/General_InfoBlock';

type FilesUploadFormInfo = {
  title: string;
  note: string;
  files: FileList;
};

export function FilesUploadForm() {
  const [createdUploads, setCreatedUploads] = useState<FilesUploadFormInfo[]>([]);

  async function uploadFilesUploadFormInfoInfo(payload: FilesUploadFormInfo) {
    // aggiungo al mio state locale
    setCreatedUploads(prev => [...prev, payload]);
    // simulo risposta positiva
    return {
      data: payload,
      response: { success: true, message: 'File caricati con successo!' }
    };
  }

  return (<>
    {createdUploads.length > 0 && (
      <MDBCard className="mb-3">
        <MDBCardHeader>
          <h5 className="mb-0">Documenti caricati</h5>
        </MDBCardHeader>
        <MDBCardBody className="p-0 mb-0">
          <MDBTable hover responsive className="mb-0">
            <MDBTableHead>
              <tr>
                <th>Titolo</th>
                <th>Descrizione</th>
                <th className="text-end"></th>
              </tr>
            </MDBTableHead>
            <MDBTableBody>
              {createdUploads.map((u, idx) => (
                <tr key={idx}>
                  <td>{u.title}</td>
                  <td>{u.note}</td>
                  <td className="text-end">
                    <MDBBtn
                      color="light"
                      floating
                      size="sm"
                      onClick={() =>
                        setCreatedUploads(prev =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                    >
                      <MDBIcon fas icon="times" />
                    </MDBBtn>
                  </td>
                </tr>
              ))}
            </MDBTableBody>
          </MDBTable>
        </MDBCardBody>
      </MDBCard>
    )}

    <GeneralForm<FilesUploadFormInfo>
      mode="create"
      title="Carica Documenti"
      icon="file-upload"
      className="pt-3"
      hideHeader={true}
      fields={[
        {
          name: "title",
          label: "Titolo File/Documento",
          required: true,
          type: "text",
          grid: { md: 12 },
          extraElements: [{
            position: "before",
            grid: { md: 12 },
            element:
              <General_InfoBlock
                presetMode='info'
                icon='file-alt'
                className='mb-0'
                title='Istruzioni per il caricamento'
              >
                <p className="mb-1">
                  Usa questo form per caricare tutti i documenti relativi al progetto:
                </p>
                <ul className="mb-0 ps-3">
                  <li>PDF, DOCX o immagini (JPG/PNG).</li>
                  <li>Dimensione max: 10 MB per file.</li>
                  <li>Assicurati che il nome del file sia descrittivo.</li>
                </ul>
              </General_InfoBlock>
          }]
        },
        {
          name: "files",
          label: "Seleziona File",
          required: true,
          type: "file_upload",
          grid: { md: 12 },
        },
        {
          name: "note",
          label: "Descrizione Aggiuntiva",
          required: false,
          type: "text_area",
          grid: { md: 12 },
          extraElements: [{
            position: "after",
            grid: { md: 12 },
            element:
              <General_InfoBlock
                presetMode='suggestion'
                icon='info-circle'
                className='mb-0'
                title="Suggerimenti per i tuoi file:"
              >
                <ul className="m-0 ps-3">
                  <li>Verifica che i documenti siano leggibili e completi.</li>
                  <li>Se carichi più file correlati, usa nomi coerenti (es. Contratto_01.pdf).</li>
                  <li>In caso di più pagine, preferisci il formato PDF multipagina.</li>
                  <li>Evita caratteri speciali nel nome del file.</li>
                </ul>
              </General_InfoBlock>
          }]
        },
      ]}
      createData={uploadFilesUploadFormInfoInfo}
      onSuccess={(created) => {
        console.log('Caricato:', created);
      }}
    />
  </>);
}
