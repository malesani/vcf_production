import React, { useState, useEffect } from "react";
import {
  MDBInput,
  MDBRow,
  MDBCol,
  MDBValidation,
  MDBValidationItem,
  MDBBtn
} from "mdb-react-ui-kit";
import { getUserInfo, updateUserInfo } from "../api_module_v1/UserRequest"; // Assicurati che il path sia corretto

// Interfaccia definita per i dati restituiti dall'API (da getUserInfo)
export interface APIUserInfo {
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

// Interfaccia usata dal form
interface FormUserInfo {
  FName: string;
  LName: string;
  generalEmail: string;
  phoneNumber: string;
}

const UserProfileForm: React.FC = () => {
  // Stato per i dati originali (presi dall'API)
  const [initialData, setInitialData] = useState<FormUserInfo>({
    FName: "",
    LName: "",
    generalEmail: "",
    phoneNumber: ""
  });

  // Stati per i campi del form
  const [FName, setFName] = useState<string>("");
  const [LName, setLName] = useState<string>("");
  const [generalEmail, setGeneralEmail] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  // Stati per il salvataggio e la validazione
  const [isModified, setIsModified] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validated, setValidated] = useState<boolean>(false);

  // Carica i dati utente dall'API reale
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await getUserInfo();
        if (response.response.success && response.data) {
          // Supponiamo che l'API restituisca un array con un solo oggetto utente
          const apiUser: APIUserInfo = response.data;
          const user: FormUserInfo = {
            FName: apiUser.first_name,
            LName: apiUser.last_name,
            generalEmail: apiUser.email,
            phoneNumber: apiUser.phone || ""
          };
          setInitialData(user);
          setFName(user.FName);
          setLName(user.LName);
          setGeneralEmail(user.generalEmail);
          setPhoneNumber(user.phoneNumber);
        } else {
          console.error(response.response.message);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchUserInfo();
  }, []);

  // Controlla se i valori attuali differiscono dai valori iniziali
  useEffect(() => {
    if (
      FName !== initialData.FName ||
      LName !== initialData.LName ||
      generalEmail !== initialData.generalEmail ||
      phoneNumber !== initialData.phoneNumber
    ) {
      setIsModified(true);
    } else {
      setIsModified(false);
    }
  }, [FName, LName, generalEmail, phoneNumber, initialData]);

  // Funzione per applicare uno stile "modificato" (azzurro) se il valore corrente differisce da quello originale
  const modifiedStyle = (current: string, original: string) => {
    return current !== original ? { backgroundColor: "#d0eaff" } : {};
  };

  // Handler per il submit del form (salvataggio)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidated(true);

    // Se il form non è valido, esci
    if (!e.currentTarget.checkValidity()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        email: generalEmail,
        first_name: FName,
        last_name: LName,
        phone: phoneNumber // invia stringa vuota se non presente
      };
      const { response, data } = await updateUserInfo(payload);
      if (response.success && data) {
        var user_info = data;
        setInitialData({
          FName: user_info.first_name,
          LName: user_info.last_name,
          generalEmail: user_info.email,
          phoneNumber: user_info.phone || ""
        });

        setValidated(false);
        alert("Profilo aggiornato con successo!");
      } else {
        console.error(response.error || response.message);
        alert("Si è verificato un errore durante il salvataggio.");
      }
    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore imprevisto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <MDBValidation onSubmit={handleSubmit} isValidated={validated}>
        {/* Header con titolo a sinistra e bottone "Salva modifiche" a destra */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="text-start mb-0">Informazioni Utente - Amministratore</h5>
          <MDBBtn type="submit" color="primary" disabled={!isModified || isSaving}>
            {isSaving ? "Salvataggio in corso..." : "Salva modifiche"}
          </MDBBtn>
        </div>
        <MDBRow>
          <MDBCol md="6">
            <MDBValidationItem feedback="Il nome è richiesto." invalid>
              <MDBInput
                wrapperClass="mb-4"
                label="Nome"
                value={FName}
                onChange={(e) => setFName(e.target.value)}
                style={modifiedStyle(FName, initialData.FName)}
                required
              />
            </MDBValidationItem>
          </MDBCol>
          <MDBCol md="6">
            <MDBValidationItem feedback="Il cognome è richiesto." invalid>
              <MDBInput
                wrapperClass="mb-4"
                label="Cognome"
                value={LName}
                onChange={(e) => setLName(e.target.value)}
                style={modifiedStyle(LName, initialData.LName)}
                required
              />
            </MDBValidationItem>
          </MDBCol>
          <MDBCol sm="12" lg="8">
            <MDBValidationItem feedback="L'email è obbligatoria" invalid>
              <MDBInput
                wrapperClass="mb-4"
                type="email"
                label="Email"
                value={generalEmail}
                onChange={(e) => setGeneralEmail(e.target.value)}
                style={modifiedStyle(generalEmail, initialData.generalEmail)}
                required
              />
            </MDBValidationItem>
          </MDBCol>
          <MDBCol sm="12" lg="4">
            <MDBValidationItem>
              <MDBInput
                type="tel"
                wrapperClass="mb-4"
                label="Numero di Telefono"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={modifiedStyle(phoneNumber, initialData.phoneNumber)}
              />
            </MDBValidationItem>
          </MDBCol>
        </MDBRow>
      </MDBValidation>
    </>
  );
};

export default UserProfileForm;
