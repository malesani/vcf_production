import React, { useEffect, useState } from 'react';
import {
    MDBRow,
    MDBCol,
    MDBCard,
} from 'mdb-react-ui-kit';

import { GeneralForm, FieldConfig } from "../app_components/GeneralForm";
import { APICustomerB2BInfo,  createCustomerB2BInfo } from '../api_module_v1/CustomerB2BRequest';


const customerB2BFields: FieldConfig<APICustomerB2BInfo>[] = [
  { name: "business_name",            label: "Ragione Sociale",                   required: true,     grid: { md: 6 } },
  { name: "address",                  label: "Indirizzo",                         required: false,    grid: { md: 6 } },
  { name: "city",                     label: "Città",                             required: true,     grid: { md: 5 } },
  { name: "province",                 label: "Provincia",                         required: true,     grid: { md: 4 } },
  { name: "zip_code",                 label: "CAP",                               required: true,     type: "number", grid: { md: 3 } },
  { name: "general_email",            label: "Email Generale",                    required: true,     type: "email",  grid: { md: 6 } },
  { name: "website",                  label: "Sito Web",                          required: false,    grid: { md: 6 } },
  { name: "vat_number",               label: "Partita IVA",                       required: true,     grid: { md: 6 } },
  { name: "fiscal_code",              label: "Codice Fiscale",                    required: false,    grid: { md: 6 } },
  { name: "sdi_code",                 label: "Codice SDI",                        required: false,    grid: { md: 6 } },
  { name: "pec",                      label: "PEC",                               required: false,    type: "email",  grid: { md: 6 }, hrAfter:true },
  { name: "deposit_payment_method",   label: "Metodo di Pagamento Acconto",       required: false,    grid: { md: 6 } },
  { name: "balance_payment_method",   label: "Metodo di Pagamento Saldo",         required: false,    grid: { md: 6 } },
  { name: "payment_terms",            label: "Termini di Pagamento",              required: false,    grid: { md: 6 } },
  { name: "iban",                     label: "IBAN",                              required: false,    grid: { md: 6 }, hrAfter:true },
  { name: "additional_requirements",  label: "Requisiti Aggiuntivi",              required: false,    type: "text_area", grid: { md: 12 } },
  { name: "intent_declaration",       label: "Dichiarazione d'Intento",           required: false,    type: "checkbox", grid: { md: 6 } },
  { name: "financing_tender",         label: "Bando Finanziamento",               required: false,    type: "checkbox", grid: { md: 6 } },
];

const NewCustomer: React.FC = () => {

  return (
    <MDBRow className="d-flex justify-content-center align-items-center">
        <MDBCol className="mb-3" md="12">
            <MDBCard className="p-4 pb-2">
                <GeneralForm<APICustomerB2BInfo>
                    mode="create"
                    title="Nuovo Cliente"
                    icon='user-plus'
                    fields={customerB2BFields}
                    createData={createCustomerB2BInfo}
                    onSuccess={(created) => {
                      console.log("Creato:", created);
                    }}
                />
            </MDBCard>
        </MDBCol>
    </MDBRow>
  );
};

export default NewCustomer;
