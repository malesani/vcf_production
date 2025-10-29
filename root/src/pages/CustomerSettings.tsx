import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  MDBRow,
  MDBCol,
  MDBCard,
  MDBBtn
} from 'mdb-react-ui-kit';

import { DataResponse } from '../hooks/RequestFunction';
import { GeneralForm, FieldConfig } from '../app_components/GeneralForm';

// import GeneralTable_Editable, { ColumnConfig } from "../app_components/GeneralTable_Editable_OLD";
import GeneralTable, { ColumnConfig, ActionConfig } from "../app_components/GeneralTable";
import { General_Loading } from '../app_components/General_Loading';

import { getCustomerB2BInfo, updateCustomerB2BInfo, APICustomerB2BInfo } from "../api_module_v1/CustomerB2BRequest";
import {
  createCustomerTeamMemberInfo,
  getCustomerTeamMembersList, deleteCustomerTeamMember,
  updateCustomerTeamMemberInfo,
  APICustTeamMemberInfo,
  inviteCustomerTeamMemberInfo
} from "../api_module_v1/CustomerTeamMemberRequest";


const CustomerSettings: React.FC = () => {

  const { customer_uid: customer_uid } = useParams<{ customer_uid: string }>();
  if (!customer_uid) {
    return (<div className="alert alert-danger">
      UID del cliente mancante in URL!
    </div>);  // o qualsiasi fallback
  }

  // Loading state
  const [loadingMode, setLoadingMode] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<APICustomerB2BInfo>();
  const [custDataResponse, setCustDataResponse] = useState<DataResponse<APICustomerB2BInfo>>();

  const refreshTableRef = useRef<(withLoading?: boolean) => void>();


  /*
    const [UserInfo, setUserInfo] = useState<APIUserInfo>();
    const [TeamMembersList, setTeamMembersList] = useState<APICustomerB2BInfo>();
  */

  // customerB2B GeneralForm FieldConfig
  const customerB2BFields: FieldConfig<APICustomerB2BInfo>[] = [
    { name: "business_name", label: "Ragione Sociale", required: true, grid: { md: 6 } },
    { name: "address", label: "Indirizzo", required: false, grid: { md: 6 } },
    { name: "city", label: "Città", required: true, grid: { md: 5 } },
    { name: "province", label: "Provincia", required: true, grid: { md: 4 } },
    { name: "zip_code", label: "CAP", required: true, type: "number", grid: { md: 3 } },
    { name: "general_email", label: "Email Generale", required: true, type: "email", grid: { md: 6 } },
    { name: "website", label: "Sito Web", required: false, grid: { md: 6 } },
    { name: "vat_number", label: "Partita IVA", required: true, grid: { md: 6 } },
    { name: "fiscal_code", label: "Codice Fiscale", required: false, grid: { md: 6 } },
    { name: "sdi_code", label: "Codice SDI", required: false, grid: { md: 6 } },
    { name: "pec", label: "PEC", required: false, type: "email", grid: { md: 6 }, hrAfter: true },
    { name: "deposit_payment_method", label: "Metodo di Pagamento Acconto", required: false, grid: { md: 6 } },
    { name: "balance_payment_method", label: "Metodo di Pagamento Saldo", required: false, grid: { md: 6 } },
    { name: "payment_terms", label: "Termini di Pagamento", required: false, grid: { md: 6 } },
    { name: "iban", label: "IBAN", required: false, grid: { md: 6 }, hrAfter: true },
    { name: "additional_requirements", label: "Requisiti Aggiuntivi", required: false, type: "text_area", grid: { md: 12 } },
    { name: "intent_declaration", label: "Dichiarazione d'Intento", required: false, type: "checkbox", grid: { md: 6 } },
    { name: "financing_tender", label: "Bando Finanziamento", required: false, type: "checkbox", grid: { md: 6 } },
  ];

  // teamMemberFields GeneralForm FieldConfig
  const teamMemberFields: FieldConfig<APICustTeamMemberInfo>[] = [
    { name: "first_name", label: "Nome", required: true, grid: { md: 3 } },
    { name: "last_name", label: "Cognome", required: true, grid: { md: 3 } },
    { name: "email", label: "Email", required: true, type: "email", grid: { md: 6 } },
    { name: "phone", label: "Telefono", required: false, grid: { md: 6 } },
    {
      name: "teamRole_uid",
      label: "Ruolo",
      required: true,
      type: "selectbox",
      grid: { md: 6 },
      options: [
        { text: "Segreteria", value: "secretary" },
        { text: "Responsabile di Progetto", value: "projectManager" },
        { text: "Incaricato Consegna", value: "deliveryPerson" },
        { text: "Firmatario Contratto", value: "contractSigner" },
        { text: "Riferimento Amministrativo", value: "adminContact" },
      ],
    },
  ];

  const teamMemberActionsConfig: ActionConfig<APICustTeamMemberInfo>[] = [
    {
      icon: "envelope",
      buttonProps: { color: 'warning' },
      visible: u => { return u.user_uid ? false : true },
      onClick: async (u) => {
        try {
          const result = await inviteCustomerTeamMemberInfo({
            teamMember_uid: u.teamMember_uid,
            customer_uid: u.customer_uid
          });

          console.log("RE Invite by email:", result);
        } catch (err) {
          console.error("Invite failed:", err);
        }
      }
    },
    {
      icon: "user-tag",
      buttonProps: { color: 'success', disabled: true, className: "text-white" },
      visible: u => { return u.user_uid ? true : false },
      onClick: u => { console.log("User Logged: ", u.email); }
    }
  ];

  // FETCH DATA
  useEffect(() => {
    if (!customer_uid) return;

    setLoadingMode(true);
    getCustomerB2BInfo({ customer_uid })
      .then((resp) => {
        setCustDataResponse(resp);
        if (resp.response.success && resp.data) {
          setCustomerInfo(resp.data);
        }
      })
      .catch((err) => {
        console.error("Errore caricamento customer:", err);
      })
      .finally(() => {
        setLoadingMode(false);
      });
  }, [customer_uid]);

  // SET LOADING
  if (loadingMode) {
    return (<General_Loading theme="pageLoading" title='Impostazioni Cliente' />);
  }

  const teamMemberColumns: ColumnConfig<APICustTeamMemberInfo>[] = [
    { field: 'first_name', label: 'Nome' },
    { field: 'last_name', label: 'Cognome' },
    { field: 'email', label: 'Email' },
    { field: 'phone', label: 'Telefono' },
    {
      field: 'teamRole_uid',
      label: 'Ruolo'
    },
  ];

  return (
    <MDBRow className="d-flex justify-content-center align-items-center">
      <h3 className="mb-3">Impostazioni Cliente: "{customerInfo?.business_name}"</h3>
      <MDBCol className="mb-3" md="12">

        <MDBCard className="p-4 pb-2 mb-3">
          <GeneralForm<APICustomerB2BInfo>
            mode="update"
            title="Informazioni Aziendali B2B"
            icon="building"
            fields={customerB2BFields}
            formActions={[
              {
                icon: "envelope",
                label: "Bottone",
                buttonProps: { color: 'warning', floating: false },
                visible: u => { return u.user_uid ? false : true },
                onClick: () => { }
              },
              {
                icon: "user",
                label: "Bottone",
                buttonProps: { color: 'secondary', floating: false },
                visible: u => { return u.user_uid ? false : true },
                onClick: () => { }
              }
            ]}
            data={custDataResponse!.data || ({} as APICustomerB2BInfo)}
            response={custDataResponse!.response}
            updateData={updateCustomerB2BInfo}
            onSuccess={(updated) => {
              console.log("Aggiornato:", updated);
              setCustomerInfo(updated);
            }}
          />
        </MDBCard>

        <MDBCard className="p-4 pb-2">
          <div className="d-flex justify-content-end mb-3">
            {/* 2️⃣ Bottone “refresh” sempre col loading */}
            <MDBBtn
              color="primary"
              onClick={() => refreshTableRef.current?.(true)}
            >
              Aggiorna Membri
            </MDBBtn>
            {/* se vuoi un refresh “silenzioso” (no spinner): */}
            <MDBBtn
              color="secondary"
              onClick={() => refreshTableRef.current?.(false)}
              className="ms-2"
            >
              Refresh Muto
            </MDBBtn>
          </div>

          <GeneralTable
            title="Membri del Team"
            icon="users"
            columns={teamMemberColumns}
            fields={teamMemberFields}
            params={{ customer_uid }}
            rowKey='teamMember_uid'
            actions={teamMemberActionsConfig}
            getData={getCustomerTeamMembersList}
            createData={createCustomerTeamMemberInfo}
            updateData={updateCustomerTeamMemberInfo}
            deleteData={deleteCustomerTeamMember}
            enableCreate={true}
            visibleUpdate={row => row.email !== "team.member.2@stsmail.com"}
            visibleDelete={row => row.email !== "ciao@ciao.it"}
            disableNotVisible={{ update: false, delete: false }}
            onRegisterRefresh={(fn) => {
              refreshTableRef.current = fn;   // salva la funzione in ref
            }}
          />
        </MDBCard>

      </MDBCol>
    </MDBRow>
  );
};

export default CustomerSettings;
