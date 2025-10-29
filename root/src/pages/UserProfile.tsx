import {
    MDBRow,
    MDBCol,
    MDBCard,
  } from 'mdb-react-ui-kit';
  
import { GeneralForm, FieldConfig } from "../app_components/GeneralForm";
import { getUserInfo, updateUserInfo, APIUserInfo } from "../api_module_v1/UserRequest";
import { getCompanyInfo, updateCompanyInfo, APICompanyInfo } from "../api_module_v1/CompanyRequest";
import { getCustomerB2BInfo, updateCustomerB2BInfo, APICustomerB2BInfo } from "../api_module_v1/CustomerB2BRequest";

const UserProfile = () => {
    const userFields: FieldConfig<APIUserInfo>[] = [
        { name: "first_name",   label: "Nome",              required: true, grid: { md: 6 } },
        { name: "last_name",    label: "Cognome",           required: true, grid: { md: 6 } },
        { name: "email",        label: "Email",             type: "email", required: true, grid: { md: 8 } },
        { name: "phone",        label: "Telefono",          type: "tel", grid: { md: 4 } }
    ];

    const companyFields: FieldConfig<APICompanyInfo>[] = [
        { name: "name",         label: "Ragione Sociale",   required: true, grid: { md: 6 } },
        { name: "address",      label: "Indirizzo",         required: false, grid: { md: 6 } },
        { name: "phone",        label: "Telefono",          type: "tel", required: false, grid: { md: 6 } },
        { name: "fax",          label: "Fax",               type: "text", required: false, grid: { md: 6 } },
        { name: "email",        label: "Email",             type: "email", required: false, grid: { md: 8 } },
        { name: "vat",          label: "Partita IVA",       required: false, grid: { md: 4 } },
    ];

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

    const CustomerInfoUpdateForm = GeneralForm<
        APICustomerB2BInfo,
        { customer_uid: string }
    >;

    return (
    <MDBRow className="d-flex justify-content-center align-items-center">
        <MDBCol className="mb-3" md="12">
            <MDBCard className="p-4 pb-2">
                <GeneralForm<APIUserInfo>
                    mode="update"
                    title="Informazioni Utente"
                    icon="user-cog"
                    fields={userFields}
                    getData={getUserInfo}
                    updateData={updateUserInfo}
                    onSuccess={(updated) => console.log("Aggiornato:", updated)}  />
            </MDBCard>
        </MDBCol>

        <MDBCol className="mb-3" md="12">
            <MDBCard className="p-4 pb-2">
                <CustomerInfoUpdateForm
                    mode="update"
                    title="Informazioni Aziendali B2B"
                    icon="building"
                    fields={customerB2BFields}
                    params={{ customer_uid: 'odV0CRQu' }}
                    getData={getCustomerB2BInfo}
                    updateData={updateCustomerB2BInfo}
                    onSuccess={(updated) => console.log("Aggiornato:", updated)}  />
            </MDBCard>
        </MDBCol>
        
        <MDBCol className="mb-3" md="12">
            <MDBCard className="p-4 pb-2">
                <GeneralForm<APICompanyInfo>
                    mode="update"
                    title="Informazioni Aziendali"
                    icon="building"
                    fields={companyFields}
                    getData={getCompanyInfo}
                    updateData={updateCompanyInfo}
                    onSuccess={(updated) => console.log("Aggiornato:", updated)}  />
            </MDBCard>
        </MDBCol>
    </MDBRow>   
    );
};
    
export default UserProfile;