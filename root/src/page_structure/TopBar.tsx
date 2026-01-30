import React, { useEffect, useMemo, useState } from "react";
import {
  MDBNavbar,
  MDBNavbarBrand,
  MDBBtn,
  MDBIcon,
  MDBNavbarNav,
  MDBNavbarItem,
  MDBDropdown,
  MDBDropdownToggle,
  MDBDropdownMenu,
  MDBDropdownItem,
  MDBBadge,
  MDBModal,
  MDBModalDialog,
  MDBModalContent,
  MDBModalHeader,
  MDBModalTitle,
  MDBModalBody,
  MDBModalFooter,
  MDBSpinner,
  MDBTypography,
  MDBListGroup,
  MDBListGroupItem,
  MDBAlert,
} from "mdb-react-ui-kit";


import { useNavigate } from "react-router-dom";
import { logoutFunction } from "../auth_module/loginFunctions";
import { useAuth } from "../auth_module/AuthContext";
import { useIsMobile } from "../app_components/ResponsiveModule";

// ✅ importa da dove tieni NfoData
import { get_nfoUnseenFeed, NfoInfo, mark_nfoSeen } from "../api_module/nfo/NfoData";


interface TopBarProps {
  logoImg?: string;
  toggleSidebar?: () => void;
  appState: string;
  setAppState: React.Dispatch<React.SetStateAction<string>>;
}

const TopBar: React.FC<TopBarProps> = ({
  logoImg = "",
  appState,
  setAppState,
  toggleSidebar,
}) => {
  const { refreshAuth, userData, companiesData } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(992);

  // ✅ stato modale centro notifiche
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const toggleNotifCenter = () => setNotifCenterOpen((v) => !v);

  // ✅ dati centro notifiche
  const [alerts, setAlerts] = useState<NfoInfo[]>([]);
  const [reports, setReports] = useState<NfoInfo[]>([]);
  const [loadingNfo, setLoadingNfo] = useState(false);
  const [nfoError, setNfoError] = useState<string | null>(null);

  const [markingSeen, setMarkingSeen] = useState<Set<string>>(new Set());

  const managedUid = (userData as any)?.managed_uid; // <-- se è diverso, cambialo qui

  const [viewedNfo, setViewedNfo] = useState<Set<string>>(new Set());

  const markViewed = async (nfo_uid: string) => {
    // evita doppio click
    if (viewedNfo.has(nfo_uid) || markingSeen.has(nfo_uid)) return;

    setMarkingSeen((prev) => {
      const next = new Set(prev);
      next.add(nfo_uid);
      return next;
    });

    try {
      const res = await mark_nfoSeen(nfo_uid);

      if (!res.response.success) {
        console.error("mark_nfoSeen failed:", res.response.error || res.response.message);
        return;
      }

      // ✅ solo se backend ok → disabilita in UI
      setViewedNfo((prev) => {
        const next = new Set(prev);
        next.add(nfo_uid);
        return next;
      });
    } catch (e) {
      console.error("markViewed error:", e);
    } finally {
      setMarkingSeen((prev) => {
        const next = new Set(prev);
        next.delete(nfo_uid);
        return next;
      });
    }
  };


  const handleLogout = async () => {
    const result = await logoutFunction();
    if (result.success) {
      await refreshAuth();
      navigate("/login", { replace: true });
    } else {
      console.error("Logout failed:", result.error);
    }
  };

  const currentCompany = companiesData.find(
    (c) => c.company_uid === userData?.company_uid
  );
  const companyName = currentCompany?.name ?? "Seleziona azienda";

  // ✅ fetch quando il modale si apre
  useEffect(() => {
    const run = async () => {
      if (!notifCenterOpen) return;

      setLoadingNfo(true);
      setNfoError(null);

      try {
        const res = await get_nfoUnseenFeed({ managed_uid: managedUid });

        if (!res.response.success) {
          setNfoError(res.response.message || "Errore nel caricamento notifiche");
          setAlerts([]);
          setReports([]);
          return;
        }

        setAlerts(res.data?.alerts ?? []);
        setReports(res.data?.reports ?? []);
      } catch (e: any) {
        setNfoError(e?.message ?? "Errore nel caricamento notifiche");
        setAlerts([]);
        setReports([]);
      } finally {
        setLoadingNfo(false);
      }
    };

    run();
  }, [notifCenterOpen, managedUid]);

  // badge count (semplice)
  const notifCount = (alerts?.length ?? 0) + (reports?.length ?? 0);

  const formatWhen = (s?: string) => (s ? s : "");

  const IT_MONTHS = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ] as const;

  const formatMonthYearIT = (month_num?: number, year?: number) => {
    if (!month_num || !year) return "";
    const idx = month_num - 1;
    if (idx < 0 || idx > 11) return "";
    return `${IT_MONTHS[idx]} ${year}`;
  };

  const managedName: Record<string, string> = {
    managed1: "conservativi",
    managed2: "a crescita bilanciata",
  };

  const getManagedLabel = (uid?: string) => {
    if (!uid) return "—";
    return managedName[uid] ?? uid; // fallback: se non trovato, mostra uid
  };

  const groups = useMemo(() => {
    const all = [...(alerts ?? []), ...(reports ?? [])];

    const map = new Map<string, { managed_uid: string; label: string; alerts: NfoInfo[]; reports: NfoInfo[] }>();

    for (const n of all) {
      const key = n.managed_uid || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          managed_uid: key,
          label: getManagedLabel(key),
          alerts: [],
          reports: [],
        });
      }
      const g = map.get(key)!;
      if (n.type === "alert") g.alerts.push(n);
      else g.reports.push(n);
    }

    // Ordine gruppi: managed1, managed2, poi altri
    const order = ["managed1", "managed2"];

    const arr = Array.from(map.values()).sort((a, b) => {
      const ia = order.indexOf(a.managed_uid);
      const ib = order.indexOf(b.managed_uid);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.label.localeCompare(b.label);
    });

    // (opzionale) ordina dentro ogni gruppo per scheduled_at desc (string compare ok se YYYY-MM-DD HH:mm:ss)
    const byDateDesc = (x: NfoInfo, y: NfoInfo) => (y.scheduled_at ?? "").localeCompare(x.scheduled_at ?? "");
    arr.forEach((g) => {
      g.alerts.sort(byDateDesc);
      g.reports.sort(byDateDesc);
      if (g.reports.length > 1) g.reports = [g.reports[0]];
    });

    return arr;
  }, [alerts, reports]); // getManagedLabel è pura (usa managedName), ok così


  return (
    <>
      <MDBNavbar expand="lg" light className="d-flex flex-column">
        <MDBNavbarNav className="d-flex justify-content-between w-100">
          <div className="d-flex align-items-center ms-3 me-3 justify-content-between">
            <MDBNavbarBrand href="/dashboard">
              <img src={logoImg} height="45" alt="Logo" loading="lazy" />
            </MDBNavbarBrand>

            {isMobile && toggleSidebar && (
              <MDBBtn
                tag="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSidebar();
                }}
              >
                <MDBIcon fas icon="bars" />
              </MDBBtn>
            )}
          </div>

          {!isMobile && (
            <div className="d-flex align-items-center">
              <MDBNavbarItem className="me-3">
                <MDBDropdown>
                  <MDBDropdownToggle
                    tag="a"
                    href="#!"
                    className="hidden-arrow nav-link"
                  >
                    <MDBIcon fas icon="bell" />
                    <MDBBadge color="danger" notification pill>
                      {notifCount}
                    </MDBBadge>
                  </MDBDropdownToggle>

                  <MDBDropdownMenu>
                    <MDBDropdownItem link onClick={toggleNotifCenter}>
                      Centro notifiche
                    </MDBDropdownItem>

                    <MDBDropdownItem link href="#">
                      Completa i dati Aziendali
                    </MDBDropdownItem>

                    <MDBDropdownItem link href="#">
                      Nuove attività assegnate{" "}
                      <MDBBadge color="primary">3</MDBBadge>
                    </MDBDropdownItem>
                  </MDBDropdownMenu>
                </MDBDropdown>
              </MDBNavbarItem>

              <MDBNavbarItem>
                <MDBDropdown>
                  <MDBDropdownToggle
                    tag="a"
                    href="#!"
                    className="hidden-arrow nav-link"
                  >
                    <MDBBtn color="secondary" size="sm" rounded>
                      Account
                      <MDBIcon fas icon="user" className="ms-2" />
                    </MDBBtn>
                  </MDBDropdownToggle>

                  <MDBDropdownMenu className="z-index: 2000;">
                    <MDBDropdownItem header>Gestione Utente</MDBDropdownItem>
                    <MDBDropdownItem
                      link
                      onClick={() => navigate("/user_profile", { replace: true })}
                    >
                      Il mio profilo
                    </MDBDropdownItem>
                    <MDBDropdownItem
                      link
                      className="bg-warning"
                      onClick={handleLogout}
                    >
                      Logout
                    </MDBDropdownItem>
                  </MDBDropdownMenu>
                </MDBDropdown>
              </MDBNavbarItem>
            </div>
          )}
        </MDBNavbarNav>
      </MDBNavbar>

      {/* ✅ MODALE: Centro notifiche */}
      <MDBModal open={notifCenterOpen} setOpen={setNotifCenterOpen} tabIndex="-1">
        <MDBModalDialog size="lg">
          <MDBModalContent>
            <MDBModalHeader>
              <MDBModalTitle>Centro notifiche</MDBModalTitle>
              <MDBBtn className="btn-close" color="none" onClick={toggleNotifCenter} />
            </MDBModalHeader>

            <MDBModalBody className="notif-modal-body">
              {loadingNfo && (
                <div className="d-flex align-items-center gap-2">
                  <MDBSpinner size="sm" />
                  <span>Caricamento...</span>
                </div>
              )}

              {!loadingNfo && nfoError && (
                <MDBAlert color="danger" className="mb-3">
                  {nfoError}
                </MDBAlert>
              )}

              {!loadingNfo && !nfoError && notifCount === 0 && (
                <MDBAlert color="info" className="mb-0">
                  Nessuna notifica disponibile.
                </MDBAlert>
              )}

              {!loadingNfo && !nfoError && notifCount > 0 && (
                <>
                  {groups.map((g) => (
                    <div key={g.managed_uid} className="mb-4">
                      {/* Header gruppo */}
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <MDBTypography tag="h6" className="mb-0">
                          Portafoglio {g.label}
                        </MDBTypography>

                        <MDBBadge color="dark" pill>
                          {(g.alerts.length ?? 0) + (g.reports.length ?? 0)}
                        </MDBBadge>
                      </div>

                      {/* ALERTS del gruppo */}
                      {g.alerts.length > 0 && (
                        <>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <MDBTypography tag="div" className="mb-0 fw-semibold">
                              Alerts
                            </MDBTypography>
                            <MDBBadge color="danger" pill>
                              {g.alerts.length}
                            </MDBBadge>
                          </div>

                          <MDBListGroup className="mb-3">
                            {g.alerts.map((a) => (
                              <MDBListGroupItem key={a.nfo_uid} className="py-3">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                  <div>
                                    <div className="fw-bold">
                                      {a.title}
                                      {a.month_num && a.year ? (
                                        <span className="text-muted fw-normal ms-2 small">
                                          ({formatMonthYearIT(a.month_num, a.year)})
                                        </span>
                                      ) : null}
                                    </div>

                                    {a.description && (
                                      <div className="text-muted small">{a.description}</div>
                                    )}
                                  </div>

                                  <div className="d-flex flex-column align-items-end gap-2">
                                    {a.scheduled_at && (
                                      <div className="text-muted small text-nowrap">
                                        {formatWhen(a.scheduled_at)}
                                      </div>
                                    )}

                                    <MDBBtn
                                      size="sm"
                                      color="primary"
                                      disabled={viewedNfo.has(a.nfo_uid) || markingSeen.has(a.nfo_uid)}
                                      onClick={() => markViewed(a.nfo_uid)}
                                    >
                                      {viewedNfo.has(a.nfo_uid)
                                        ? "Visualizzato"
                                        : markingSeen.has(a.nfo_uid)
                                          ? "Salvo..."
                                          : "Visualizza"}
                                    </MDBBtn>
                                  </div>
                                </div>
                              </MDBListGroupItem>
                            ))}
                          </MDBListGroup>
                        </>
                      )}

                      {/* REPORTS del gruppo */}
                      {g.reports.length > 0 && (
                        <>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <MDBTypography tag="div" className="mb-0 fw-semibold">
                              Reports
                            </MDBTypography>
                            <MDBBadge color="primary" pill>
                              {g.reports.length}
                            </MDBBadge>
                          </div>

                          <MDBListGroup>
                            {g.reports.map((r) => (
                              <MDBListGroupItem key={r.nfo_uid} className="py-3">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                  <div>
                                    <div className="fw-bold">
                                      {r.title}
                                      {r.month_num && r.year ? (
                                        <span className="text-muted fw-normal ms-2 small">
                                          ({formatMonthYearIT(r.month_num, r.year)})
                                        </span>
                                      ) : null}
                                    </div>

                                    {r.description && (
                                      <div className="text-muted small">{r.description}</div>
                                    )}
                                  </div>

                                  <div className="d-flex flex-column align-items-end gap-2">
                                    {r.scheduled_at && (
                                      <div className="text-muted small text-nowrap">
                                        {formatWhen(r.scheduled_at)}
                                      </div>
                                    )}

                                    <MDBBtn
                                      size="sm"
                                      color="primary"
                                      disabled={viewedNfo.has(r.nfo_uid) || markingSeen.has(r.nfo_uid)}
                                      onClick={() => markViewed(r.nfo_uid)}
                                    >
                                      {viewedNfo.has(r.nfo_uid)
                                        ? "Visualizzato"
                                        : markingSeen.has(r.nfo_uid)
                                          ? "Salvo..."
                                          : "Visualizza"}
                                    </MDBBtn>
                                  </div>
                                </div>
                              </MDBListGroupItem>
                            ))}
                          </MDBListGroup>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}

            </MDBModalBody>

            <MDBModalFooter>
              <MDBBtn color="secondary" onClick={toggleNotifCenter}>
                Chiudi
              </MDBBtn>
            </MDBModalFooter>
          </MDBModalContent>
        </MDBModalDialog>
      </MDBModal>
    </>
  );
};

export default TopBar;
