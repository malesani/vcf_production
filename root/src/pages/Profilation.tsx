// src/pages/Profilation.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MDBContainer } from "mdb-react-ui-kit";
import ProfilationForm from "../components/profilation/ProfilationForm";
import { useAuth } from "../auth_module/AuthContext";

const Profilation: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, authLoading, userInfo } = useAuth();

  const [profilationForm, setProfilationForm] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // NON loggato: resta su /quiz
    if (!isAuthenticated) return;

    // loggato ma userInfo non ancora pronto: aspetta
    if (!userInfo) return;

    // loggato + quiz completato => vai in dashboard (URL cambia)
    if (userInfo.quiz === 1) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, userInfo, navigate]);

  // opzionale: evita flash mentre carichi userInfo
  if (authLoading || (isAuthenticated && !userInfo)) {
    return <MDBContainer className="py-4" />;
  }

  return (
    <MDBContainer className="py-4">
      {profilationForm && (
        <ProfilationForm setProfilationForm={setProfilationForm} />
      )}
    </MDBContainer>
  );
};

export default Profilation;
