import React, { useEffect, useState } from 'react';
import {
  MDBContainer,
  MDBCard,
  MDBCardBody,
  MDBBtn,
  MDBIcon,
  MDBRow,
  MDBCol,
  MDBTable,
  MDBTableHead,
  MDBTableBody,
  MDBInputGroup
} from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import { CompaniesData } from '../auth_module/loginFunctions';
import { useAuth } from '../auth_module/AuthContext';
import { useLogos } from '../hooks/AssetsManager';

interface CompanyWithLogo extends CompaniesData {
  logoPath: string;
}

const ChooseCompany: React.FC = () => {
  const { logo_default } = useLogos();
  const { authLoading, companiesData, selectCompany } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!authLoading && companiesData.length <= 1) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, companiesData, navigate]);

  // Debug logs
  console.log('ChooseCompany - loading:', authLoading);
  console.log('ChooseCompany - raw companiesData:', companiesData);

  const handleChooseCompany = async (companyUid: string) => {
    await selectCompany(companyUid);
    navigate('/dashboard', { replace: true });
  };

  if (authLoading) {
    return (
      <MDBContainer className="text-center py-5">
        <p>Caricamento aziende…</p>
      </MDBContainer>
    );
  }

  // Enrich companiesData with logoPath
  const enrichedCompanies: CompanyWithLogo[] = companiesData.map((company) => ({
    ...company,
    logoPath: `/${company.company_uid}/logo.png`,
  }));

  console.log('ChooseCompany - enrichedCompanies:', enrichedCompanies);
  console.log('ChooseCompany - logoPaths:', enrichedCompanies.map(c => c.logoPath));

  // Case: exactly 2 companies -> display two cards
  if (enrichedCompanies.length === 2) {
    return (
      <MDBContainer className="mt-5">
        <MDBRow>
          {enrichedCompanies.map((company) => (
            <MDBCol md="6" key={company.company_uid} className="mb-4">
              <MDBCard>
                <MDBCardBody>
                  <div className="text-center mb-3">
                    <img
                      src={company.logoPath}
                      alt={`${company.name} logo`}
                      onLoad={() => console.log(`Logo loaded: ${company.logoPath}`)}
                      onError={(e) => {
                        console.warn(`Logo missing: ${company.logoPath}`);
                        (e.currentTarget as HTMLImageElement).src = logo_default;
                      }}
                      style={{ maxHeight: '100px' }}
                    />
                  </div>

                  <p><strong>ID:</strong> {company.company_uid}</p>
                  <p><strong>Nome:</strong> {company.name}</p>
                  <p><strong>Indirizzo:</strong> {company.address ?? '–'}</p>
                  <p><strong>Telefono:</strong> {company.phone ?? '–'}</p>
                  <p><strong>Email:</strong> {company.email ?? '–'}</p>

                  <MDBBtn
                    color="primary"
                    onClick={() => handleChooseCompany(company.company_uid)}
                  >
                    <MDBIcon fas icon="check" className="me-2" />
                    Seleziona
                  </MDBBtn>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          ))}
        </MDBRow>
      </MDBContainer>
    );
  }

  // Case: 3 or more companies -> table with search
  const filteredCompanies = enrichedCompanies.filter((company) => {
    const term = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(term) ||
      company.company_uid.toLowerCase().includes(term) ||
      (company.address && company.address.toLowerCase().includes(term)) ||
      (company.email && company.email.toLowerCase().includes(term)) ||
      (company.phone && company.phone.includes(term))
    );
  });

  console.log('ChooseCompany - searchTerm:', searchTerm);
  console.log('ChooseCompany - filteredCompanies:', filteredCompanies);

  return (
    <MDBContainer className="mt-5">
      <h4 className="mb-4">Scegli la tua azienda</h4>

      {/* Search input */}
      <MDBInputGroup className="mb-3">
        <input
          className="form-control"
          placeholder="Cerca azienda"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <MDBBtn outline>
          <MDBIcon fas icon="search" />
        </MDBBtn>
      </MDBInputGroup>

      {/* Companies table */}
      <MDBTable bordered>
        <MDBTableHead>
          <tr>
            <th>Logo</th>
            <th>ID</th>
            <th>Nome</th>
            <th>Indirizzo</th>
            <th>Telefono</th>
            <th>Email</th>
            <th>Azione</th>
          </tr>
        </MDBTableHead>
        <MDBTableBody>
          {filteredCompanies.map((company) => (
            <tr key={company.company_uid}>
              <td>
                <img
                  src={company.logoPath}
                  alt={`${company.name} logo`}
                  onLoad={() => console.log(`Logo loaded: ${company.logoPath}`)}
                  onError={(e) => {
                    console.warn(`Logo missing: ${company.logoPath}`);
                    (e.currentTarget as HTMLImageElement).src = logo_default;
                  }}
                  style={{ maxHeight: '50px' }}
                />
              </td>
              <td>{company.company_uid}</td>
              <td>{company.name}</td>
              <td>{company.address ?? '–'}</td>
              <td>{company.phone ?? '–'}</td>
              <td>{company.email ?? '–'}</td>
              <td>
                <MDBBtn
                  size="sm"
                  color="primary"
                  onClick={() => handleChooseCompany(company.company_uid)}
                >
                  <MDBIcon fas icon="check" className="me-2" />
                  Seleziona
                </MDBBtn>
              </td>
            </tr>
          ))}
        </MDBTableBody>
      </MDBTable>
    </MDBContainer>
  );
};

export default ChooseCompany;
