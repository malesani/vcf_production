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
  MDBCol,
  MDBRow,
} from "mdb-react-ui-kit";


import { useNavigate } from "react-router-dom";
import { logoutFunction } from "../auth_module/loginFunctions";
import { useAuth } from "../auth_module/AuthContext";
import { useIsMobile } from "../app_components/ResponsiveModule";

import { get_nfoUnseenFeed, NfoInfo, mark_nfoSeen } from "../api_module/nfo/NfoData";

import { fetchManagedPortfoliosActive, PortManagedInfo } from "../api_module/portfolioManaged/PortManagedData";

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
  const [markingGroup, setMarkingGroup] = useState<Set<string>>(new Set());

  const [removingNfo, setRemovingNfo] = useState<Set<string>>(new Set());

  // ✅ dati centro notifiche
  const [alerts, setAlerts] = useState<NfoInfo[]>([]);
  const [reports, setReports] = useState<NfoInfo[]>([]);
  const [loadingNfo, setLoadingNfo] = useState(false);
  const [nfoError, setNfoError] = useState<string | null>(null);

  const [managedPortfoliosInfo, setManagedPortfoliosInfo] = useState<PortManagedInfo[]>([]);
  const [loadingManagedList, setLoadingManagedList] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoadingManagedList(true);
      try {
        const resp = await fetchManagedPortfoliosActive();
        if (resp.response.success && resp.data) {
          setManagedPortfoliosInfo(resp.data);
        }
      } catch (e) {
        console.error("Errore caricamento managed portfolios:", e);
      } finally {
        setLoadingManagedList(false);
      }
    };
    run();
  }, []);

  const managedTitleByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of managedPortfoliosInfo ?? []) {
      // adatta le chiavi se nel tuo PortManagedInfo si chiamano diversamente
      const uid = (p as any)?.managed_uid ?? (p as any)?.uid;
      const title = (p as any)?.title ?? (p as any)?.name;
      if (uid && title) map.set(String(uid), String(title));
    }
    return map;
  }, [managedPortfoliosInfo]);

  const getManagedLabel = (uid?: string) => {
    if (!uid) return "—";
    return managedTitleByUid.get(uid) ?? uid; // fallback su uid
  };


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
      startRemoveAnimation(nfo_uid);
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

  const markAllInGroupViewed = async (groupManagedUid: string) => {
    if (markingGroup.has(groupManagedUid)) return;

    // trova il gruppo corrente
    const g = groups.find((x) => x.managed_uid === groupManagedUid);
    if (!g) return;

    const ids = [
      ...g.alerts.map((x) => x.nfo_uid),
      ...g.reports.map((x) => x.nfo_uid),
    ].filter(Boolean) as string[];

    // solo quelle non già viste / non in corso
    const toMark = ids.filter(
      (id) => !viewedNfo.has(id) && !markingSeen.has(id)
    );

    if (toMark.length === 0) return;

    // set gruppo in loading
    setMarkingGroup((prev) => {
      const next = new Set(prev);
      next.add(groupManagedUid);
      return next;
    });

    try {
      // sequenziale: una per una
      for (const id of toMark) {
        setMarkingSeen((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });

        try {
          const res = await mark_nfoSeen(id);
          if (res.response.success) {
            setViewedNfo((prev) => {
              const next = new Set(prev);
              next.add(id);
              return next;
            });

            startRemoveAnimation(id);
          } else {
            console.error("mark_nfoSeen failed:", id, res.response.error || res.response.message);
          }
        } catch (e) {
          console.error("mark_nfoSeen error:", id, e);
        } finally {
          setMarkingSeen((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }
    } finally {
      setMarkingGroup((prev) => {
        const next = new Set(prev);
        next.delete(groupManagedUid);
        return next;
      });
    }
  };


  const startRemoveAnimation = (nfo_uid: string) => {
    setRemovingNfo((prev) => {
      const next = new Set(prev);
      next.add(nfo_uid);
      return next;
    });

    // durata animazione (allineala alla classe CSS)
    window.setTimeout(() => {
      // rimuovi dal feed locale
      setAlerts((prev) => prev.filter((x) => x.nfo_uid !== nfo_uid));
      setReports((prev) => prev.filter((x) => x.nfo_uid !== nfo_uid));

      // pulizia set
      setRemovingNfo((prev) => {
        const next = new Set(prev);
        next.delete(nfo_uid);
        return next;
      });
    }, 280);
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

  // ✅ fetch notifiche quando il modale si apre
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

        const raw = (res as any)?.data;

        // Caso 1: formato { alerts: [], reports: [] }
        if (Array.isArray(raw?.alerts) || Array.isArray(raw?.reports)) {
          setAlerts(Array.isArray(raw?.alerts) ? raw.alerts : []);
          setReports(Array.isArray(raw?.reports) ? raw.reports : []);
          return;
        }

        // Caso 2: formato array flat { data: NfoInfo[] } o array diretto
        const list: NfoInfo[] =
          Array.isArray(raw) ? raw :
            Array.isArray(raw?.data) ? raw.data :
              [];

        setAlerts(list.filter((x) => x.type === "alert"));
        setReports(list.filter((x) => x.type === "report"));
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
  }, [alerts, reports, managedTitleByUid]); // getManagedLabel è pura (usa managedName), ok così

  const hasVisibleNotifications = groups.some(
    (g) => g.alerts.length > 0 || g.reports.length > 0
  );


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
        <MDBModalDialog
          size={isMobile ? undefined : "lg"}
          className={isMobile ? "modal-fullscreen-sm-down" : ""}
        >
          <MDBModalContent
            style={{
              borderRadius: isMobile ? 0 : 16,
              overflow: "hidden",
            }}
          >
            <MDBModalHeader className="bg-white border-bottom">
              <MDBRow className="w-100 align-items-center g-2">
                <MDBCol xs="10">
                  <MDBModalTitle className="d-flex align-items-center gap-2 mb-0">
                    <MDBIcon far icon="bell" className="me-1" />
                    Centro notifiche
                  </MDBModalTitle>
                </MDBCol>
                <MDBCol xs="2" className="text-end">
                  <MDBBtn className="btn-close" color="none" onClick={toggleNotifCenter} />
                </MDBCol>
              </MDBRow>
            </MDBModalHeader>

            <MDBModalBody
              className="bg-white"
              style={{ padding: isMobile ? "12px 12px 10px" : "18px 18px 10px" }}
            >
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

              {!loadingNfo && !nfoError && !hasVisibleNotifications && (
                <MDBAlert color="info" className="mb-0">
                  Nessuna notifica disponibile.
                </MDBAlert>
              )}

              {!loadingNfo && !nfoError && hasVisibleNotifications && (
                <>
                  {groups.map((g) => {
                    const allItems = [...(g.alerts ?? []), ...(g.reports ?? [])];
                    const allViewed = allItems.length
                      ? allItems.every((x) => viewedNfo.has(x.nfo_uid))
                      : true;

                    return (
                      <div key={g.managed_uid} className="mb-4">
                        {/* ✅ Header gruppo con COLS */}
                        <MDBRow className="align-items-center g-2 mb-2">
                          <MDBCol xs="12" md="8" className="d-flex align-items-center gap-2 flex-wrap">
                            <MDBTypography tag="h5" className="mb-0 fw-bold text-dark">
                              {g.label}
                            </MDBTypography>

                            <MDBBadge pill color="primary" className="fw-semibold">
                              {Math.max(
                                0,
                                allItems.filter((x) => !viewedNfo.has(x.nfo_uid)).length
                              )}{" "}
                              nuove
                            </MDBBadge>
                          </MDBCol>

                          <MDBCol xs="12" md="12" className={isMobile ? "" : "text-end"}>
                            <MDBBtn
                              size="sm"
                              color="link"
                              className={[
                                "text-decoration-none fw-semibold p-0 d-inline-flex align-items-center",
                                isMobile ? "w-100 justify-content-center py-2 border rounded-3" : "",
                              ].join(" ")}
                              disabled={markingGroup.has(g.managed_uid) || allViewed}
                              onClick={() => markAllInGroupViewed(g.managed_uid)}
                            >
                              {markingGroup.has(g.managed_uid) ? (
                                <>
                                  <MDBSpinner size="sm" className="me-2" />
                                  Segno...
                                </>
                              ) : (
                                <>
                                  <MDBIcon fas icon="check-double" className="me-2" />
                                  Segna tutte come lette
                                </>
                              )}
                            </MDBBtn>
                          </MDBCol>
                        </MDBRow>

                        {/* REPORTS */}
                        {g.reports?.length > 0 && (
                          <>
                            <MDBTypography
                              tag="div"
                              className="mb-2 fw-semibold"
                              style={{ color: "rgba(0,0,0,.55)" }}
                            >
                              <MDBIcon far icon="file-alt" className="me-2" />
                              Reports
                            </MDBTypography>

                            <MDBListGroup className="mb-3" style={{ gap: 10 }}>
                              {g.reports.map((r) => {
                                const isViewed = viewedNfo.has(r.nfo_uid);
                                const isMarking = markingSeen.has(r.nfo_uid);

                                return (
                                  <MDBListGroupItem
                                    key={r.nfo_uid}
                                    className={[
                                      "border",
                                      removingNfo.has(r.nfo_uid) ? "nfo-exit" : "",
                                    ].join(" ")}
                                    style={{
                                      padding: isMobile ? "12px 12px" : "14px 14px",
                                      borderColor: "rgba(0,0,0,.08)",
                                      borderRadius: 12,
                                      background: "#fff",
                                      opacity: isViewed ? 0.78 : 1,
                                    }}
                                  >
                                    {/* ✅ Item con grid: 2 cols arriba + botón abajo en mobile */}
                                    <MDBRow className="g-2 align-items-center">
                                      {/* left: dot + icon */}
                                      {!isMobile &&
                                        <MDBCol xs="2" md="2" lg="2" xl="2" className="d-flex align-items-center gap-2">
                                          {!isViewed ? (
                                            <div
                                              style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 999,
                                                background: "#2d6cff",
                                              }}
                                            />
                                          ) : (
                                            <div style={{ width: 8, height: 8 }} />
                                          )}

                                          <div
                                            className="d-flex align-items-center justify-content-center"
                                            style={{
                                              width: 44,
                                              height: 44,
                                              borderRadius: 12,
                                              background: "rgba(45,108,255,.10)",
                                            }}
                                          >
                                            <MDBIcon far icon="file-alt" className="text-primary" />
                                          </div>
                                        </MDBCol>
                                      }

                                      {/* center: text */}
                                      <MDBCol xs="10" md="10" lg="8" xl="8">
                                        <div className="fw-bold text-dark" style={{ lineHeight: 1.2 }}>
                                          {r.title}
                                          {r.month_num && r.year ? (
                                            <span
                                              className="text-muted fw-normal ms-2"
                                              style={{ fontSize: ".85rem" }}
                                            >
                                              ({formatMonthYearIT(r.month_num, r.year)})
                                            </span>
                                          ) : null}
                                        </div>

                                        {r.description ? (
                                          <div
                                            style={{
                                              fontSize: ".9rem",
                                              color: "rgba(0,0,0,.55)",
                                              marginTop: 2,
                                            }}
                                          >
                                            {r.description}
                                          </div>
                                        ) : null}

                                        {r.scheduled_at ? (
                                          <div
                                            style={{
                                              fontSize: ".85rem",
                                              color: "rgba(0,0,0,.45)",
                                              marginTop: 8,
                                            }}
                                          >
                                            {formatWhen(r.scheduled_at)}
                                          </div>
                                        ) : null}
                                      </MDBCol>

                                      {/* button row */}
                                      <MDBCol xs="12" md="12" lg="2" xl="2" className={isMobile ? "pt-1" : "text-end"}>
                                        <MDBBtn
                                          size="sm"
                                          color="primary"
                                          className={isMobile ? "w-100 rounded-4" : "rounded-4 text-nowrap"}
                                          disabled={isViewed || isMarking}
                                          onClick={() => markViewed(r.nfo_uid)}
                                        >
                                          {isViewed ? "Visualizzato" : isMarking ? "Salvo..." : "Visualizza"}
                                        </MDBBtn>
                                      </MDBCol>
                                    </MDBRow>
                                  </MDBListGroupItem>
                                );
                              })}
                            </MDBListGroup>
                          </>
                        )}

                        {/* ALERTS */}
                        {g.alerts?.length > 0 && (
                          <>
                            <MDBTypography
                              tag="div"
                              className="mb-2 fw-semibold"
                              style={{ color: "rgba(0,0,0,.55)" }}
                            >
                              <MDBIcon fas icon="exclamation-triangle" className="me-2" />
                              Alerts
                            </MDBTypography>

                            <MDBListGroup style={{ gap: 10 }}>
                              {g.alerts.map((a) => {
                                const isViewed = viewedNfo.has(a.nfo_uid);
                                const isMarking = markingSeen.has(a.nfo_uid);

                                return (
                                  <MDBListGroupItem
                                    key={a.nfo_uid}
                                    className={[
                                      "border",
                                      removingNfo.has(a.nfo_uid) ? "nfo-exit" : "",
                                    ].join(" ")}
                                    style={{
                                      padding: isMobile ? "12px 12px" : "14px 14px",
                                      borderColor: "rgba(0,0,0,.08)",
                                      borderRadius: 12,
                                      background: "#fff",
                                      opacity: isViewed ? 0.78 : 1,
                                    }}
                                  >
                                    <MDBRow className="g-2 align-items-center">
                                      {!isMobile &&
                                        <MDBCol xs="2" md="2" lg="2" xl="2" className="d-flex align-items-center gap-2">
                                          {!isViewed ? (
                                            <div
                                              style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 999,
                                                background: "#2d6cff",
                                              }}
                                            />
                                          ) : (
                                            <div style={{ width: 8, height: 8 }} />
                                          )}

                                          <div
                                            className="d-flex align-items-center justify-content-center"
                                            style={{
                                              width: 44,
                                              height: 44,
                                              borderRadius: 12,
                                              background: "rgba(255,159,67,.14)",
                                            }}
                                          >
                                            <MDBIcon fas icon="exclamation-triangle" style={{ color: "#ff9f43" }} />
                                          </div>
                                        </MDBCol>
                                      }

                                      <MDBCol xs="10" md="10" lg="8" xl="8">
                                        <div className="fw-bold text-dark" style={{ lineHeight: 1.2 }}>
                                          {a.title}
                                          {a.month_num && a.year ? (
                                            <span
                                              className="text-muted fw-normal ms-2"
                                              style={{ fontSize: ".85rem" }}
                                            >
                                              ({formatMonthYearIT(a.month_num, a.year)})
                                            </span>
                                          ) : null}
                                        </div>

                                        {a.description ? (
                                          <div
                                            style={{
                                              fontSize: ".9rem",
                                              color: "rgba(0,0,0,.55)",
                                              marginTop: 2,
                                            }}
                                          >
                                            {a.description}
                                          </div>
                                        ) : null}

                                        {a.scheduled_at ? (
                                          <div
                                            style={{
                                              fontSize: ".85rem",
                                              color: "rgba(0,0,0,.45)",
                                              marginTop: 8,
                                            }}
                                          >
                                            {formatWhen(a.scheduled_at)}
                                          </div>
                                        ) : null}
                                      </MDBCol>

                                      <MDBCol xs="12" md="12" lg="2" xl="2" className={isMobile ? "pt-1" : "text-end"}>
                                        <MDBBtn
                                          size="sm"
                                          color="primary"
                                          className={isMobile ? "w-100 rounded-4" : "rounded-4 text-nowrap"}
                                          disabled={isViewed || isMarking}
                                          onClick={() => markViewed(a.nfo_uid)}
                                        >
                                          {isViewed ? "Visualizzato" : isMarking ? "Salvo..." : "Visualizza"}
                                        </MDBBtn>
                                      </MDBCol>
                                    </MDBRow>
                                  </MDBListGroupItem>
                                );
                              })}
                            </MDBListGroup>
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </MDBModalBody>

            <MDBModalFooter className="bg-white border-top">
              <MDBBtn
                color="secondary"
                onClick={toggleNotifCenter}
                className={isMobile ? "w-100" : ""}
              >
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
