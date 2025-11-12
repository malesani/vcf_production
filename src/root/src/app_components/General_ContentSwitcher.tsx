import React, { useRef, useEffect, useState } from 'react';
import {
    MDBCard,
    MDBCardHeader,
    MDBSpinner,
    MDBCollapse,
    MDBIcon,
    MDBTabs,
    MDBTabsItem,
    MDBTabsLink,
    MDBTabsContent,
    MDBTabsPane,
    MDBAccordion,
    MDBAccordionItem,
    MDBBtn,
    MDBProgress,
    MDBProgressBar
} from 'mdb-react-ui-kit';
import { useIsMobile } from "./ResponsiveModule";

export type SwitchMode = 'accordion' | 'pannels' | 'tabs' | 'stepper';

export type TriggerSubmitFn = () => Promise<boolean>;
export interface ContentReturn {
    onChangeGetDataState?: (loadState: boolean) => void;
    triggerSubmit: TriggerSubmitFn;
    contentElement: React.ReactNode;
}

export type ContentConfigBase = {
    icon?: string;
    title: string;
    className?: string;
    startOpen?: boolean;
};

export type ContentConfig =
    ContentConfigBase & (
        { contentElement: React.ReactNode; builContentFn?: never; } |
        { contentElement?: never; builContentFn: () => ContentReturn; }
    );



export interface TabsProps {
    className?: string;       // class per <MDBTabs>
    fill?: boolean;           // default false
    justify?: boolean;        // default false
    pills?: boolean;          // default true (spesso si usa pills per tab-style)
    hrAfter?: boolean;
    ref?: React.Ref<any>;
}

interface TabsModeProps {
    switchMode: 'tabs';
    contents: ContentConfig[];
    properties?: TabsProps;
}

export interface AccordionProps {
    className?: string;       // class per <MDBTabs>
    alwaysOpen?: boolean;
    borderless?: boolean;
    flush?: boolean;
    initialActive?: number;
}

interface AccordionModeProps {
    switchMode: 'accordion';
    contents: ContentConfig[];
    properties?: AccordionProps;
}

interface PanelsModeProps {
    switchMode: 'pannels';
    contents: ContentConfig[];
}

export interface StepperProps {
    className?: string;       // class container
    onCompleteSteps?: () => void;
    theme?: "standard" | "tabs_default" | "tabs_pills";
}

interface StepperModeProps {
    switchMode: 'stepper';
    loadingFlags?: boolean[];
    contents: ContentConfig[];
    properties?: StepperProps;
    resumeElement?: React.ReactNode;
}

// L’unione finale
export type GeneralContentSwitcherProps =
    | TabsModeProps
    | AccordionModeProps
    | PanelsModeProps
    | StepperModeProps;


/**
 * A generic accordion component driven entirely by props.
 * Each section header toggles its own collapse.
 */
export const General_ContentSwitcher: React.FC<GeneralContentSwitcherProps> = props => {
    const isTablet = useIsMobile(992);
    const isMobile = useIsMobile(768);

    const { switchMode, contents } = props;

    switch (switchMode) {
        case "pannels":
            const [openStates, setOpenStates] = useState<boolean[]>(    // Initialize open state per section (default true)
                contents.map(c => (c.startOpen !== undefined ? c.startOpen : true))
            );

            const handleTogglePannel = (idx: number) => {
                setOpenStates(prev => {
                    const next = [...prev];
                    next[idx] = !next[idx];
                    return next;
                });
            };

            return (
                <MDBCard className="mb-4">
                    {contents.map((item, idx) => (<>
                        <MDBCardHeader
                            className="d-flex align-items-center"
                            role="button"
                            onClick={() => handleTogglePannel(idx)}
                        >
                            {item.icon && <MDBIcon fas icon={item.icon} className="me-2" />}
                            <h5 className="mb-0 flex-grow-1">{item.title}</h5>
                            <MDBIcon
                                fas
                                icon={openStates[idx] ? 'chevron-up' : 'chevron-down'}
                            />
                        </MDBCardHeader>

                        <MDBCollapse open={openStates[idx]} className={(item.className || '')}>
                            {item.contentElement}
                        </MDBCollapse>
                    </>))}
                </MDBCard>
            );
            break;

        case "accordion":
            const {
                className: accordionClassName = '',
                alwaysOpen = false,
                borderless = true,
                flush = false,
                initialActive = -1,
            } = props.properties ?? {};

            return (
                <MDBCard className="mb-3">
                    <MDBAccordion
                        className={accordionClassName}
                        alwaysOpen={alwaysOpen}
                        borderless={borderless}
                        flush={flush}
                        initialActive={initialActive}
                    >
                        {contents.map((item, idx) => (
                            <MDBAccordionItem
                                collapseId={idx + 1}
                                className={item.className}
                                headerTitle={<>
                                    {item.icon && <MDBIcon fas icon={item.icon} className="me-2" />}
                                    {item.title}
                                </>}>
                                {item.contentElement}
                            </MDBAccordionItem>
                        ))}
                    </MDBAccordion>
                </MDBCard>

            );
            break;

        case "tabs":
            const {
                className: tabsClassName = '',
                fill = false,
                justify = false,
                pills = true,
                hrAfter = false,
                ref,
            } = props.properties ?? {};

            const [activeTab, setActiveTab] = useState<number>(0);

            const handleTabClick = (index: number) => {
                if (index === activeTab) return;
                setActiveTab(index);
            };

            return (
                <div className="general-content-switcher">
                    <MDBTabs
                        className={tabsClassName}
                        fill={fill}
                        justify={justify}
                        pills={pills}
                        ref={ref}
                    >
                        {contents.map((item, idx) => (
                            <MDBTabsItem key={idx}>
                                <MDBTabsLink onClick={() => handleTabClick(idx)} active={activeTab === idx}>
                                    {item.icon && <MDBIcon fas icon={item.icon} className="me-2" />}
                                    {item.title}
                                </MDBTabsLink>
                            </MDBTabsItem>
                        ))}
                    </MDBTabs>

                    {hrAfter && <hr className="m-0 mt-2"></hr>}

                    <MDBTabsContent>
                        {contents.map((item, idx) => (
                            <MDBTabsPane key={idx} open={activeTab === idx} className={'p-0 ' + item.className}>
                                {item.contentElement}
                            </MDBTabsPane>
                        ))}
                    </MDBTabsContent>
                </div>
            );
            break;

        case "stepper":
            const externalLoading = (props as StepperModeProps).loadingFlags || [];

            // 2) build triggerSubmit + contentElement PERMANENTEMENTE
            const builtRef = React.useRef<ContentReturn[]>();
            if (!builtRef.current) {
                builtRef.current = contents.map((item) => {
                    if (typeof item.builContentFn === 'function') {
                        return item.builContentFn();
                    }
                    return { triggerSubmit: async () => true, contentElement: item.contentElement! };
                });
            }

            const built = builtRef.current;

            const submitCallbacks = built.map(b => b.triggerSubmit);
            const contentElements = built.map(b => b.contentElement);

            const [currentStep, setCurrentStep] = useState(0);
            const [loadingNext, setLoadingNext] = useState(false);
            const total = contents.length;
            const progress = total > 0 ? Math.round(((currentStep + 1) / total) * 100) : 0;

            // Callback functions
            const { onCompleteSteps } = props.properties ?? {};

            const onNext = async () => {
                if (loadingNext || externalLoading[currentStep]) return; // blocca Next se loading

                setLoadingNext(true);
                try {
                    const ok = await submitCallbacks[currentStep]();

                    if (ok) {
                        if (currentStep === total - 1) {
                            onCompleteSteps?.();
                        } else {
                            setCurrentStep(s => s + 1);
                        }
                    }

                } finally {
                    setLoadingNext(false);
                }
            };

            const onPrev = () => {
                if (loadingNext) return;
                setCurrentStep(s => Math.max(s - 1, 0));
            };



            const getStepperHeaderElement = () => {
                const stepperTheme = props.properties?.theme || "default";
                switch (stepperTheme) {
                    case "tabs_default":
                        return <>
                            <MDBTabs
                                pills={false}
                            >
                                {contents.map((step, idx) => (
                                    <MDBTabsItem key={idx}>
                                        <MDBTabsLink active={idx === currentStep} className={'d-flex flex-row align-items-center gap-2'}>
                                            {step.icon && <MDBIcon fas icon={step.icon} size={isMobile ? undefined : (isTablet ? 'lg' : 'lg')} />}
                                            <span>{(!isMobile && !isTablet) && step.title}</span>
                                        </MDBTabsLink>
                                    </MDBTabsItem>
                                ))}
                            </MDBTabs>
                        </>

                    case "tabs_pills":
                        return <>
                            <MDBTabs
                                pills={true}
                            >
                                {contents.map((step, idx) => (
                                    <MDBTabsItem key={idx}>
                                        <MDBTabsLink active={idx === currentStep} className={'d-flex flex-row align-items-center gap-2'}>
                                            {step.icon && <MDBIcon fas icon={step.icon} size={isMobile ? undefined : (isTablet ? 'lg' : 'lg')} />}
                                            <span>{(!isMobile && !isTablet) && step.title}</span>
                                        </MDBTabsLink>
                                    </MDBTabsItem>
                                ))}
                            </MDBTabs>
                        </>

                    default:
                        return <div className="step-header d-flex justify-content-between align-items-center mb-3 gap-2">
                            {contents.map((step, idx) => (
                                <div key={idx}
                                    className={`d-flex flex-column align-items-center gap-3 ${idx === currentStep ? 'text-primary' : 'text-secondary'}`}>
                                    {step.icon && <MDBIcon fas icon={step.icon} size={isMobile ? undefined : (isTablet ? 'lg' : 'lg')} />}
                                    <span>{(!isMobile && !isTablet) && step.title}</span>
                                </div>
                            ))}
                        </div>
                }

            }

            return (
                <div className={props.properties?.className}>
                    {/* header */}
                    {getStepperHeaderElement()}

                    {/* progress */}
                    <MDBProgress height="5px" className="mb-4">
                        <MDBProgressBar width={progress} />
                    </MDBProgress>

                    {/* all forms mounted, only current visible */}
                    <div className="step-content mb-4">
                        {contentElements.map((el, idx) => (
                            <div key={idx} style={{ display: idx === currentStep ? 'block' : 'none' }}>
                                {el}
                            </div>
                        ))}
                    </div>

                    {/* navigation buttons */}
                    <div className="d-flex justify-content-between align-items-center gap-4">
                        <MDBBtn color="secondary" floating={isMobile} rounded={!isMobile} size={isMobile ? "lg" : "sm"} className="text-nowrap" onClick={onPrev} disabled={currentStep === 0 || loadingNext}>
                            {isMobile ? <MDBIcon fas icon="arrow-left" /> : <span><MDBIcon fas icon="angle-left" className="me-2" />Precedente</span>}
                        </MDBBtn>

                        <MDBProgress height='10' className="flex-grow-1 rounded-8">
                            <MDBProgressBar width={progress} valuemin={0} valuemax={100}>
                            </MDBProgressBar>
                        </MDBProgress>

                        <MDBBtn color="primary" floating={isMobile} rounded={!isMobile} size={isMobile ? "lg" : "sm"} className="text-nowrap" onClick={onNext} disabled={loadingNext || externalLoading[currentStep]} >
                            {(loadingNext) && <MDBIcon fas icon="spinner" spin />}
                            {currentStep === total - 1 ? (
                                (isMobile ? (!loadingNext && <MDBIcon fas icon="check" />) : <span className="ms-2">Conferma<MDBIcon fas icon="check" className="ms-2" /></span>)
                            ) : (
                                (isMobile ? (!loadingNext && <MDBIcon fas icon="arrow-right" />) : <span className="ms-2">Successivo <MDBIcon fas icon="angle-right" className="ms-2" /></span>)
                            )}
                        </MDBBtn>
                    </div>
                </div>
            );

        default:
            return null;
    }
};