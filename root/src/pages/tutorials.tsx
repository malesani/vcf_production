import React, { useState } from "react";
import {
  MDBAccordion,
  MDBAccordionItem,
  MDBBadge,
  MDBBtn,
  MDBCard,
  MDBCardBody,
  MDBCol,
  MDBContainer,
  MDBDropdown,
  MDBDropdownItem,
  MDBDropdownMenu,
  MDBDropdownToggle,
  MDBIcon,
  MDBRow,
  MDBTabs,
  MDBTabsItem,
  MDBTabsLink,
} from "mdb-react-ui-kit";

// ----- Card singola tutorial -----
type Level = "Principiante" | "Intermedio" | "Avanzato";

interface TutorialCardProps {
  title: string;
  level: Level;
  levelColor: string || any;
  description: string;
  ctaLabel: string;
}

const TutorialCard: React.FC<TutorialCardProps> = ({
  title,
  level, levelColor, description, ctaLabel,
}) => (
  <MDBCard className="h-100 shadow-1" style={{ borderRadius: "18px" }}>
    {/* Header / video placeholder */}
    <div
      style={{
        backgroundColor: "#d3d3d3",
        height: "180px",
        borderTopLeftRadius: "18px",
        borderTopRightRadius: "18px",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(0,0,0,0.4)",
        fontWeight: 600,
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          backgroundColor: "rgba(255,255,255,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
        }}
      >
        <MDBIcon fas icon="play" />
      </div>
    </div>

    <MDBCardBody className="d-flex flex-column">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h5 className="fw-bold mb-0">{title}</h5>
        <MDBBadge color={levelColor} className="px-3 py-2">
          {level}
        </MDBBadge>
      </div>

      <p className="text-muted mb-4" style={{ fontSize: "0.95rem" }}>
        {description}
      </p>

      <div className="mt-auto">
        <MDBBtn
          color="dark"
          className="px-4"
          style={{ borderRadius: "999px", backgroundColor: "#0b2650" }}
        >
          {ctaLabel}
        </MDBBtn>
      </div>
    </MDBCardBody>
  </MDBCard>
);

// ----- Pagina Tutorials -----
const Tutorials: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("tutti");
  const [difficulty, setDifficulty] = useState<string>("Filtra per Difficoltà");

  const handleTabClick = (value: string) => {
    if (value === activeTab) return;
    setActiveTab(value);
  };

  return (
    <>
      {/* HERO */}
      <MDBCard
        style={{
          background: "linear-gradient(180deg, #2C3A55 0%, #1D2A3D 100%)",
          padding: "120px 0",
          textAlign: "center",
          color: "white",
        }}
        className="border-3 mb-5"
      >
        <MDBContainer>
          <h1 className="fw-bold mb-3" style={{ fontSize: "3rem" }}>
            Migliora le Tue Conoscenze Finanziarie
          </h1>

          <p
            className="text-light"
            style={{ fontSize: "1.2rem", maxWidth: "700px", margin: "0 auto" }}
          >
            Guide complete, video esplicativi e strategie di trading per ogni
            livello.
          </p>
        </MDBContainer>
      </MDBCard>

      {/* TITOLO + DESCRIZIONE */}
      <MDBContainer className="text-center mb-5">
        <h2 className="fw-bold mb-3" style={{ fontSize: "2.2rem" }}>
          Vasta scorta di materiali di apprendimento
        </h2>
        <p
          className="text-muted"
          style={{ maxWidth: "720px", margin: "0 auto", fontSize: "1.05rem" }}
        >
          Esplora i nostri contenuti, filtrali per argomento e livello di
          difficoltà, e inizia il tuo percorso di apprendimento.
        </p>
      </MDBContainer>

      {/* TABS + DROPDOWN */}
      <MDBContainer>
        <MDBRow className="justify-content-center">
          <MDBCol md="12">
            <div
              className="d-flex align-items-center justify-content-between px-3 px-md-4 py-3"
              style={{
                backgroundColor: "#f4f3ef",
                borderRadius: "16px",
                border: "1px solid #f0ede6",
              }}
            >
              <MDBTabs className="border-0">
                <MDBTabsItem>
                  <MDBTabsLink
                    onClick={() => handleTabClick("tutti")}
                    active={activeTab === "tutti"}
                    className="px-4"
                    style={{
                      borderRadius: "12px 12px 0 0",
                      backgroundColor:
                        activeTab === "tutti" ? "#ffffff" : "transparent",
                    }}
                  >
                    Tutti
                  </MDBTabsLink>
                </MDBTabsItem>
                <MDBTabsItem>
                  <MDBTabsLink
                    onClick={() => handleTabClick("video")}
                    active={activeTab === "video"}
                    className="px-4"
                    style={{
                      borderRadius: "12px 12px 0 0",
                      backgroundColor:
                        activeTab === "video" ? "#ffffff" : "transparent",
                    }}
                  >
                    Video
                  </MDBTabsLink>
                </MDBTabsItem>
                <MDBTabsItem>
                  <MDBTabsLink
                    onClick={() => handleTabClick("articoli")}
                    active={activeTab === "articoli"}
                    className="px-4"
                    style={{
                      borderRadius: "12px 12px 0 0",
                      backgroundColor:
                        activeTab === "articoli" ? "#ffffff" : "transparent",
                    }}
                  >
                    Articoli
                  </MDBTabsLink>
                </MDBTabsItem>
              </MDBTabs>

              <MDBDropdown className="ms-3">
                <MDBDropdownToggle
                  color="light"
                  className="shadow-0"
                  style={{
                    borderRadius: "12px",
                    border: "1px solid #3f3f3f",
                    minWidth: "210px",
                    textAlign: "left",
                  }}
                >
                  {difficulty}
                </MDBDropdownToggle>
                <MDBDropdownMenu>
                  <MDBDropdownItem
                    link
                    onClick={() => setDifficulty("Tutti i livelli")}
                  >
                    Tutti i livelli
                  </MDBDropdownItem>
                  <MDBDropdownItem
                    link
                    onClick={() => setDifficulty("Principiante")}
                  >
                    Principiante
                  </MDBDropdownItem>
                  <MDBDropdownItem
                    link
                    onClick={() => setDifficulty("Intermedio")}
                  >
                    Intermedio
                  </MDBDropdownItem>
                  <MDBDropdownItem
                    link
                    onClick={() => setDifficulty("Avanzato")}
                  >
                    Avanzato
                  </MDBDropdownItem>
                </MDBDropdownMenu>
              </MDBDropdown>
            </div>
          </MDBCol>
        </MDBRow>
      </MDBContainer>

      {/* GRID DI CARD */}
      <MDBContainer className="py-5">
        <MDBRow className="gy-4">
          <MDBCol md="4">
            <TutorialCard
              title="Introduzione alle Azioni"
              level="Principiante"
              levelColor="success"
              description="Impara cosa sono le azioni, come funzionano e perché sono una componente fondamentale di un portafoglio di investimenti."
              ctaLabel="Guarda Tutorial"
            />
          </MDBCol>

          <MDBCol md="4">
            <TutorialCard
              title="Strategie di Trading Avanzate"
              level="Avanzato"
              levelColor="danger"
              description="Un'analisi approfondita delle strategie di trading complesse, inclusi swing trading, day trading e arbitraggio statistico."
              ctaLabel="Leggi Articolo"
            />
          </MDBCol>

          <MDBCol md="4">
            <TutorialCard
              title="Le Basi dell'Analisi Tecnica"
              level="Intermedio"
              levelColor="warning"
              description="Scopri come interpretare i grafici, identificare i trend e utilizzare gli indicatori tecnici per prendere decisioni di trading informate."
              ctaLabel="Guarda Tutorial"
            />
          </MDBCol>
        </MDBRow>
      </MDBContainer>

      {/* FAQ */}
      <div style={{ padding: "60px 0" }}>
        <MDBContainer style={{ maxWidth: "800px" }}>
          <MDBAccordion flush initialActive={1}>
            <MDBAccordionItem
              collapseId={1}
              headerTitle="I tutorial sono adatti ai principianti assoluti?"
            >
              Assolutamente sì. Abbiamo una sezione dedicata ai&nbsp;
              <strong>&quot;Fondamentali degli Investimenti&quot;</strong>
              &nbsp;pensata appositamente per chi parte da zero. I nostri
              materiali per principianti coprono tutti i concetti di base in
              modo chiaro e semplice.
            </MDBAccordionItem>

            <MDBAccordionItem
              collapseId={2}
              headerTitle="Con quale frequenza vengono aggiunti nuovi contenuti?"
            >
              Aggiungiamo nuovi contenuti con cadenza regolare, in genere ogni
              settimana. In questo modo hai sempre nuovi spunti per continuare a
              imparare e migliorare le tue competenze.
            </MDBAccordionItem>

            <MDBAccordionItem
              collapseId={3}
              headerTitle="Posso richiedere un tutorial su un argomento specifico?"
            >
              Certo! Puoi inviarci le tue richieste e suggerimenti: teniamo
              conto dei feedback degli utenti per pianificare i prossimi
              contenuti e creare tutorial su misura per le esigenze più
              richieste.
            </MDBAccordionItem>

            <MDBAccordionItem
              collapseId={4}
              headerTitle="I materiali sono gratuiti?"
            >
              Offriamo sia materiali gratuiti che contenuti premium. I contenuti
              gratuiti ti permettono di iniziare subito, mentre i corsi premium
              offrono percorsi più approfonditi e strutturati.
            </MDBAccordionItem>
          </MDBAccordion>
        </MDBContainer>
      </div>
    </>
  );
};

export default Tutorials;
