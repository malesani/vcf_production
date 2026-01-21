import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { ContentConfig, General_ContentSwitcher } from "../../app_components/General_ContentSwitcher";
import { questions } from "./constant";
import { SectionForm } from "./SectionForm";
import {
    MDBCard,
    MDBInput,
    MDBBtn,
    MDBModal,
    MDBModalDialog,
    MDBModalContent,
    MDBModalHeader,
    MDBModalTitle,
    MDBModalBody,
    MDBModalFooter,
} from "mdb-react-ui-kit";
import { submitQuiz, startQuizDraft } from "../../api_module_v1/QuizRequest";
import { useAuth } from "../../auth_module/AuthContext";
import { useNavigate } from "react-router-dom";

interface ProfilationFormProps {
    setProfilationForm: (value: boolean) => void;
}

const QUIZ_VERSION = "1.1";
const QUIZ_UID_KEY = "quiz_uid_v1";

export const ProfilationForm: React.FC<ProfilationFormProps> = ({ setProfilationForm }) => {
    const { isAuthenticated, userInfo, refreshAuth } = useAuth();

    const navigate = useNavigate();

    // ✅ quiz_uid gestito qui
    const [quizUid, setQuizUid] = useState<string | null>(null);
    const [quizInitLoading, setQuizInitLoading] = useState<boolean>(true);

    // loading per step
    const [loadingFlags, setLoadingFlags] = useState<boolean[]>(questions.map(() => false));

    // draft answers
    const answersRef = useRef<Record<string, any>>({});

    // email guest
    const [guestEmail, setGuestEmail] = useState<string>("");
    const [needEmail, setNeedEmail] = useState(false);
    const [finalSubmitting, setFinalSubmitting] = useState(false);

    // ✅ init draft all'apertura (o riprende da localStorage)
    useEffect(() => {
        (async () => {
            try {
                const stored = localStorage.getItem(QUIZ_UID_KEY);
                if (stored && stored.length === 8) {
                    setQuizUid(stored);
                    return;
                }

                const start = await startQuizDraft({ version: QUIZ_VERSION });
                if (start.response.success && start.data?.quiz_uid) {
                    localStorage.setItem(QUIZ_UID_KEY, start.data.quiz_uid);
                    setQuizUid(start.data.quiz_uid);
                    return;
                }

                console.error("startQuizDraft failed:", start.response);
            } catch (e) {
                console.error("startQuizDraft error:", e);
            } finally {
                setQuizInitLoading(false);
            }
        })();
    }, []);

    // callback loading step
    const onLoadingChanges = useMemo(
        () =>
            questions.map((_, idx) => (load: boolean) => {
                setLoadingFlags(flags => {
                    const next = [...flags];
                    next[idx] = load;
                    return next;
                });
            }),
        []
    );

    // submit fn dai SectionForm
    const submitFnsRef = useRef<(() => Promise<boolean>)[]>([]);
    if (submitFnsRef.current.length === 0) {
        submitFnsRef.current = questions.map(() => async () => true);
    }

    // salva draft locale per step
    const handleStepSaved = useCallback((question_uid: string, payload: any) => {
        answersRef.current = {
            ...answersRef.current,
            [question_uid]: payload,
        };
    }, []);

    // ✅ persist centralizzato con quiz_uid obbligatorio
    const persistQuiz = useCallback(
        async (opts?: { email?: string | null; finalize?: boolean }) => {
            if (!quizUid) {
                throw new Error("quiz_uid not ready yet");
            }

            const quiz_json = { answers: answersRef.current };

            const resp = await submitQuiz({
                quiz_uid: quizUid,                 // ✅ OBBLIGATORIO
                version: QUIZ_VERSION,
                quiz_json,
                email: opts?.email ?? null,
                finalize: !!opts?.finalize,        // ✅ true SOLO al click conferma (o invio email)
            });

            if (!resp.response.success) {
                throw new Error(resp.response.error || resp.response.message || "Quiz submit failed");
            }

            return resp;
        },
        [quizUid]
    );

    // contents per stepper
    const contents = useMemo<ContentConfig[]>(
        () =>
            questions.map((section, idx) => ({
                icon: section.icon,
                title: section.name,
                startOpen: idx === 0,
                builContentFn: () => ({
                    triggerSubmit: async () => {
                        // blocca se draft non pronto
                        if (!quizUid) return false;

                        const ok = await submitFnsRef.current[idx]();
                        if (!ok) return false;

                        const isLast = idx === questions.length - 1;

                        try {
                            // ✅ salvataggio parziale step-by-step (finalize=false)
                            if (!isLast) {
                                await persistQuiz({ email: null, finalize: false });
                                return true;
                            }

                            // ✅ ultimo step
                            if (isAuthenticated && userInfo) {
                                setFinalSubmitting(true);
                                try {
                                    const resp = await persistQuiz({ email: null, finalize: true });

                                    // ✅ chiudo e pulisco draft
                                    localStorage.removeItem(QUIZ_UID_KEY);

                                    await refreshAuth();

                                    // ✅ se backend lo indica, vai in dashboard
                                    if (resp.data?.action === "go_dashboard") {
                                        navigate("/dashboard", { replace: true });
                                        console.log("FINAL action:", resp.data?.action);
                                        console.log("BEFORE navigate pathname:", window.location.pathname);
                                        navigate("/dashboard", { replace: true });
                                        setTimeout(() => console.log("AFTER navigate pathname:", window.location.pathname), 50);
                                        return true;
                                    }

                                    // ✅ fallback: comunque vai in dashboard
                                    navigate("/dashboard", { replace: true });
                                    return true;

                                } catch (e) {
                                    console.error("persistQuiz error:", e);
                                    return false;
                                } finally {
                                    setFinalSubmitting(false);
                                }
                            }

                            // guest: chiedi email
                            setNeedEmail(true);
                            return false;
                        } catch (e) {
                            console.error("persistQuiz error:", e);
                            setFinalSubmitting(false);
                            return false;
                        }
                    },
                    loadingFlag: loadingFlags[idx],
                    contentElement: (
                        <SectionForm
                            section={section}
                            onRegisterSubmit={fn => {
                                submitFnsRef.current[idx] = fn;
                            }}
                            onLoadingChange={loadState => onLoadingChanges[idx](loadState)}
                            setProfilationForm={setProfilationForm}
                            onStepSaved={handleStepSaved}
                        />
                    ),
                }),
            })),
        [
            loadingFlags,
            onLoadingChanges,
            setProfilationForm,
            handleStepSaved,
            persistQuiz,
            isAuthenticated,
            userInfo,
            quizUid,
        ]
    );

    // invio email guest (finale)
    const handleGuestEmailSubmit = async () => {
        const emailToSend = guestEmail.trim().toLowerCase();
        if (!emailToSend || !emailToSend.includes("@")) return;

        setFinalSubmitting(true);
        try {
            const resp = await persistQuiz({
                email: emailToSend,
                finalize: true,
            });

            // ✅ pulisci draft
            localStorage.removeItem(QUIZ_UID_KEY);

            // ✅ chiudi modal / form
            setNeedEmail(false);
            setProfilationForm(false);

            // ✅ redirect: dopo mail inviata vai a signup
            if (resp.data?.action === "email_sent") {
                navigate("/signup", { replace: true });
                return;
            }

            // fallback: comunque signup (per ora)
            navigate("/signup", { replace: true });
        } catch (e) {
            console.error(e);
        } finally {
            setFinalSubmitting(false);
        }
    };


    // ✅ se draft non pronto, puoi mostrare un loader
    if (quizInitLoading || !quizUid) {
        return (
            <MDBCard className="mb-5 p-5">
                <div>Caricamento quiz...</div>
            </MDBCard>
        );
    }

    return (
        <>
            <MDBCard className="mb-5">
                <div
                    style={{
                        backgroundColor: "rgb(38, 53, 80)",
                        color: "white",
                        borderTopRightRadius: "0.5rem",
                        borderTopLeftRadius: "0.5rem",
                        padding: "20px",
                    }}
                >
                    <div className="d-flex align-items-center">
                        <span className="fs-2 fw-bold text-white">Il tuo obiettivo finanziario</span>
                    </div>
                    <span className="text-light fs-5">Dettaglio Globale Portafogli</span>
                </div>

                <div className="p-5">
                    <General_ContentSwitcher switchMode="stepper" contents={contents} loadingFlags={loadingFlags} />
                </div>
            </MDBCard>
            <MDBModal open={needEmail} setOpen={setNeedEmail} tabIndex="-1">
                <MDBModalDialog centered>
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle>Salva il quiz</MDBModalTitle>
                            <MDBBtn
                                className="btn-close"
                                color="none"
                                onClick={() => setNeedEmail(false)}
                                disabled={finalSubmitting}
                            />
                        </MDBModalHeader>

                        <MDBModalBody>
                            <div className="mb-2 fw-bold">
                                Inserisci la tua email per salvare e riprendere più tardi
                            </div>

                            <MDBInput
                                label="Email"
                                type="email"
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                            />
                            <div className="form-text mt-2">
                                Ti invieremo un link per riprendere il quiz.
                            </div>
                        </MDBModalBody>

                        <MDBModalFooter>
                            <MDBBtn
                                color="secondary"
                                onClick={() => setNeedEmail(false)}
                                disabled={finalSubmitting}
                            >
                                Annulla
                            </MDBBtn>
                            <MDBBtn onClick={handleGuestEmailSubmit} disabled={finalSubmitting}>
                                {finalSubmitting ? "Invio..." : "Invia link"}
                            </MDBBtn>
                        </MDBModalFooter>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>
        </>

    );
};

export default ProfilationForm;
