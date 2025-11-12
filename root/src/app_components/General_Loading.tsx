import React from 'react';
import { MDBSpinner, MDBContainer, MDBRow } from 'mdb-react-ui-kit';
import { textColor } from 'mdb-react-ui-kit/dist/types/types/colors';

import { useLogos } from '../hooks/AssetsManager';

export type LoadingTheme = 'formLoading' | 'pageLoading' | 'appLoading';

export interface GeneralLoadingProps {
    title?: string;                 // Section title (use it on page loading t show pagename)
    text?: string;                  // Custom loading text
    showText?: boolean;             // Show or hide the loading text
    useLogo?: boolean;              // If company logo exist use it (only used in pageLoading theme)
    customLogoUrl?: string;         // URL of a custom logo to spin (only used in pageLoading theme)
    spinnerSize?: string;           // Spinner size (e.g., '1.5rem', '3rem')
    spinnerColor?: textColor;       // Spinner color
    theme?: LoadingTheme;           // Theme of the loading component
}

type PresetProps = Omit<GeneralLoadingProps, 'title'> & { theme: LoadingTheme };

/**
 * General_Loading component supports two themes:
 * - formLoading: inline spinner with optional text
 * - pageLoading: full screen container with spinning logo or default spinner
 */
export const General_Loading: React.FC<GeneralLoadingProps> = (props) => {
    const { logo_rotate, logo_small } = useLogos();

    // Define internal presets
    const presets: Record<LoadingTheme, PresetProps> = {
        formLoading: {
            text: 'Caricamento ...',
            showText: true,
            spinnerSize: '1.5rem',
            spinnerColor: 'secondary',
            theme: 'formLoading',
        },
        pageLoading: {
            text: 'Caricamento in corso...',
            showText: true,
            useLogo: true,
            spinnerSize: '3rem',
            spinnerColor: 'secondary',
            theme: 'pageLoading',
        },
        appLoading: {
            text: 'Caricamento in corso...',
            showText: true,
            useLogo: true,
            spinnerSize: '3rem',
            spinnerColor: 'secondary',
            theme: 'appLoading',
        },
    };

    // Determine applied settings: start from preset based on theme, then override with incoming props
    const {
        theme = 'formLoading',
        title,
        ...restProps
    } = props;
    const preset = presets[theme];
    const {
        text,
        showText,
        useLogo,
        customLogoUrl,
        spinnerSize,
        spinnerColor,
    } = { ...preset, ...restProps };

    // Compute Logo url
    var logoUrl = undefined;
    if (useLogo) {
        logoUrl = logo_rotate ?? logo_small;
    }

    if (customLogoUrl) {
        logoUrl = customLogoUrl;
    }


    const formLoadingElement = <>
        <div className="d-flex flex-row flex-nowrap justify-content-center align-items-center py-4 mb-3 gap-3">
            {showText && (
                <h5 className="w-auto m-0 text-secondary">{text}</h5>
            )}
            <MDBSpinner
                className="me-2"
                style={{ width: spinnerSize, height: spinnerSize }}
                color={spinnerColor}
            >
                <span className="visually-hidden">Loading...</span>
            </MDBSpinner>
        </div>
    </>;

    const pageLoadingElement = <>
        <MDBRow className="d-flex justify-content-center align-items-center">
            {title && <h3 className="mb-3">{title}</h3>}
            <MDBContainer
                className="d-flex flex-column justify-content-center align-items-center"
                style={{ height: '65vh' }}
            >
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt="Caricamento in corso"
                        style={{
                            width: spinnerSize,
                            height: 'auto',
                        }}
                    />
                ) : (
                    <MDBSpinner
                        style={{ width: spinnerSize, height: spinnerSize }}
                        color={spinnerColor}
                    >
                        <span className="visually-hidden">Loading...</span>
                    </MDBSpinner>
                )}
                {showText && <p className="mt-3">{text}</p>}
                <style>{`@keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }`}</style>
            </MDBContainer>
        </MDBRow>
    </>

    const appLoadingElement = <>
        <MDBRow className="d-flex justify-content-center align-items-center">
            {title && <h3 className="mb-3">{title}</h3>}
            <MDBContainer
                className="d-flex flex-column justify-content-center align-items-center"
                style={{ height: '100vh' }}
            >
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt="Caricamento in corso"
                        style={{
                            width: spinnerSize,
                            height: 'auto',
                        }}
                    />
                ) : (
                    <MDBSpinner
                        style={{ width: spinnerSize, height: spinnerSize }}
                        color={spinnerColor}
                    >
                        <span className="visually-hidden">Loading...</span>
                    </MDBSpinner>
                )}
                {showText && <p className="mt-3">{text}</p>}
                <style>{`@keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }`}</style>
            </MDBContainer>
        </MDBRow>
    </>


    switch (theme) {
        case "formLoading":
            return formLoadingElement;

        case "pageLoading":
            return pageLoadingElement;

        case "appLoading":
            return appLoadingElement;

        default:
            return formLoadingElement;
    }
};

export default General_Loading;
