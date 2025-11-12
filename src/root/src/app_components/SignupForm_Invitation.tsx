import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MDBRow,
  MDBCol,
  MDBCard,
  MDBInput
} from 'mdb-react-ui-kit';

import { DataResponse } from '../hooks/RequestFunction';
import { GeneralForm, FieldConfig } from "./GeneralForm";

interface SignupFormInvitationProps {
  token: string;
  email?: string;
}

interface PasswordsCheck {
  token: string;
  password: string;
  repassword: string;
}


const SignupForm_invitation: React.FC<SignupFormInvitationProps> = ({ token }) => {

    // customerB2B GeneralForm FieldConfig
    const PasswordsCheckFields: FieldConfig<PasswordsCheck>[] = [
        { name: "password",     label: "Password",      required: true,     type: "password",   grid: { md: 12 } },
        { name: "repassword",   label: "Re-Password",   required: true,     type: "password",   grid: { md: 12 },
            equalTo: "password",
            validationFeedback: {
                invalid: "Le password non corrispondono.",
                valid: "Le password corrispondono."
            }
        },
    ];

    /**
     * Funzione di test per la creazione: simula una chiamata API
     */
    const createPassword = async (
        payload: PasswordsCheck
    ): Promise<DataResponse<PasswordsCheck>> => {
        const completePayload = { ...payload, token };

        // Simulo ritardo network
        return new Promise(resolve => {
        setTimeout(() => {
            resolve({
            data: completePayload,
            response: {
                success: true,
                message: 'Password impostata con successo.'
            }
            });
        }, 1000);
        });
    };

    return (
        <MDBRow className="d-flex justify-content-center align-items-center">
            <h3 className="mb-3">SignUp</h3>
            <MDBCol className="mb-3" md="12">
    
                <MDBRow className="row g-3 mb-3" >
                    <MDBInput 
                        type={"text"}
                        label={"Email"}
                        value={"Ggfah roigh raoi goiuaerbg "}
                        readOnly={true}
                    />
                </MDBRow>
                <GeneralForm<PasswordsCheck>
                    mode="create"
                    fields={PasswordsCheckFields}
                    hideHeader={true}
                    createData={createPassword}
                    onSuccess={(created) => {
                        console.log('Creato:', created);
                    }}
                />
            </MDBCol>
        </MDBRow>
    );
};

export default SignupForm_invitation;
