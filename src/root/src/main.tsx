import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'mdb-react-ui-kit/dist/css/mdb.min.css';
import 'mdb-react-table-editor/dist/css/table-editor.min.css';
import 'mdb-react-file-upload/dist/css/file-upload.min.css';
import "@fortawesome/fontawesome-free/css/all.min.css";
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
