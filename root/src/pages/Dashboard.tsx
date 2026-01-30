import React, { useMemo } from "react";
import { useAuth } from "../auth_module/AuthContext";

import DashboardBase from "../components/dashboard/DashboardBase";
import DashboardTecnico from "../components/dashboard/DashboardTecnico";

interface DashboardProps {
  userName?: string;
  pageName?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ userName, pageName }) => {
  const { userInfo } = useAuth();

  const level = useMemo(() => {
    const fallback = 1;
    const raw = userInfo?.extended_fields;
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);
      const lvl = Number(parsed?.level);
      return Number.isFinite(lvl) && lvl > 0 ? lvl : fallback;
    } catch {
      return fallback;
    }
  }, [userInfo?.extended_fields]);

  // ✅ fino al livello 4: base. dal 5 in poi: tecnico
  if (level >= 5) {
    return <DashboardTecnico userName={userName} pageName={pageName} />;
  }

  return <DashboardBase userName={userName} pageName={pageName} />;
};

export default Dashboard;
