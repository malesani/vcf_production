import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MDBStepper,
  MDBStepperStep,
  MDBStepperForm,
  MDBIcon,
  MDBInput,
  MDBRow,
  MDBCol,
  MDBCheckbox,
  MDBBtn,
  MDBValidationItem,
  MDBTextArea
} from 'mdb-react-ui-kit';


const CustomerDataForm: React.FC = () => {
  // Modifichiamo i tipi dei ref in HTMLAllCollection per essere compatibili con MDBBtn
  const wizardNextRef = useRef<HTMLAllCollection | null>(null);
  const wizardPrevRef = useRef<HTMLAllCollection | null>(null);
  const [wizardRefs, setWizardRefs] = useState<{
    prev: React.MutableRefObject<HTMLAllCollection | null> | null;
    next: React.MutableRefObject<HTMLAllCollection | null> | null;
  }>({ prev: null, next: null });

  // Responsive Mode

    const [mode, setMode] = useState<'horizontal' | 'vertical'>(window.innerWidth > 768 ? 'horizontal' : 'vertical');

    const handleResize = useCallback(() => {
        const width = window.innerWidth;

        if (width > 768) {
        setMode('horizontal');
        } else if (width <= 768) {
        setMode('vertical');
        }
    }, []);

    useEffect(() => {
        window.addEventListener('resize', handleResize);

        return () => {
        window.removeEventListener('resize', handleResize);
        };
    }, [handleResize]);
  // end 

  useEffect(() => {
    setWizardRefs({ prev: wizardPrevRef, next: wizardNextRef });
  }, []);

  // Stati per i campi del form - Customer Data
  const [businessName, setBusinessName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [vatNumber, setVatNumber] = useState<string>('');
  const [fiscalCode, setFiscalCode] = useState<string>('');
  const [sdiCode, setSdiCode] = useState<string>('');
  const [pec, setPec] = useState<string>('');

  // Stati per i campi del form - Payment Data
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<string>('');
  const [balancePaymentMethod, setBalancePaymentMethod] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [iban, setIban] = useState<string>('');

  // Stati per i campi del form - Additional Information
  const [additionalRequirements, setAdditionalRequirements] = useState<string>('');
  const [intentDeclaration, setIntentDeclaration] = useState<boolean>(false);
  const [financingTender, setFinancingTender] = useState<boolean>(false);

  // Handler per il submit del form
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Qui inserisci la logica per inviare i dati ad un API o simili
    console.log({
      businessName,
      address,
      city,
      zipCode,
      province,
      website,
      vatNumber,
      fiscalCode,
      sdiCode,
      pec,
      depositPaymentMethod,
      balancePaymentMethod,
      paymentTerms,
      iban,
      additionalRequirements,
      intentDeclaration,
      financingTender
    });
  };

  return (
    <>
    <h5 className="text-center mt-2">Informazioni Aziendali</h5>
    <MDBStepper externalNext={wizardRefs.next} externalPrev={wizardRefs.prev} type={mode} linear={false}>
        <MDBStepperForm onSubmit={handleSubmit}>
            {/* Step 1 - Dati Amministrativi */}
            <MDBStepperStep headIcon={<MDBIcon fas icon='user' />} headText="Dati Amministrativi" itemId={1}>
                <MDBRow>
                <MDBCol md="6">
                    <MDBValidationItem feedback="La ragione sociale è obbligatoria" invalid>
                        <MDBInput
                        wrapperClass="mb-4"
                        label="Ragione Sociale"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                        />
                    </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="L'indirizzo è obbligatorio" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Indirizzo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="La città è obbligatoria" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Città"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="Il CAP è obbligatorio" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="CAP"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="La provincia è obbligatoria" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Provincia"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="Il sito internet è obbligatorio" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Sito Internet"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="La partita IVA è obbligatoria" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="P.IVA"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="Il codice fiscale è obbligatorio" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Codice Fiscale"
                    value={fiscalCode}
                    onChange={(e) => setFiscalCode(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="Il codice SDI è obbligatorio" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Codice SDI"
                    value={sdiCode}
                    onChange={(e) => setSdiCode(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="La PEC è obbligatoria" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    type="email"
                    label="PEC"
                    value={pec}
                    onChange={(e) => setPec(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
            </MDBRow>
            </MDBStepperStep>

            {/* Step 2 - Dati di Pagamento */}
            <MDBStepperStep headIcon={<MDBIcon fas icon="credit-card" />} headText="Dati di Pagamento" itemId={2}>
            <MDBRow>
                <MDBCol md="6">
                <MDBValidationItem feedback="Il metodo di pagamento acconto è obbligatorio" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Metodo di Pagamento Acconto"
                    value={depositPaymentMethod}
                    onChange={(e) => setDepositPaymentMethod(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="Il metodo di pagamento saldo è obbligatorio" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Metodo di Pagamento Saldo"
                    value={balancePaymentMethod}
                    onChange={(e) => setBalancePaymentMethod(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="I tempi di pagamento sono obbligatori" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="Tempi di Pagamento"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem feedback="L'IBAN è obbligatorio" invalid>
                    <MDBInput
                    wrapperClass="mb-4"
                    label="IBAN"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
            </MDBRow>
            </MDBStepperStep>

            {/* Step 3 - Informazioni Aggiuntive */}
            <MDBStepperStep headIcon={<MDBIcon fas icon="list-alt" />} headText="Informazioni Aggiuntive" itemId={3}>
            <MDBRow>
                <MDBCol md="12">
                <MDBValidationItem feedback="Le richieste aggiuntive sono obbligatorie" invalid>
                    <MDBTextArea
                    wrapperClass="mb-4"
                    label="Richieste Aggiuntive"
                    value={additionalRequirements}
                    onChange={(e) => setAdditionalRequirements(e.target.value)}
                    rows={4}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem>
                    <MDBCheckbox
                    wrapperClass="d-flex justify-content-start mb-4"
                    label="Dichiarazione di Intento"
                    checked={intentDeclaration}
                    onChange={(e) => setIntentDeclaration(e.target.checked)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="6">
                <MDBValidationItem>
                    <MDBCheckbox
                    wrapperClass="d-flex justify-content-start mb-4"
                    label="Bando di Finanziamento"
                    checked={financingTender}
                    onChange={(e) => setFinancingTender(e.target.checked)}
                    required
                    />
                </MDBValidationItem>
                </MDBCol>
                <MDBCol md="12">
                <MDBBtn type="submit" block color="success" className="mb-4">
                    Invia
                </MDBBtn>
                </MDBCol>
            </MDBRow>
            </MDBStepperStep>
        </MDBStepperForm>
        <MDBBtn className="d-none w-50" ref={wizardPrevRef}>
            Previous Step
        </MDBBtn>
        <MDBBtn className="d-none" ref={wizardNextRef}>
            Next Step
        </MDBBtn>
    </MDBStepper>
    </>
    
  );
};

export default CustomerDataForm;
