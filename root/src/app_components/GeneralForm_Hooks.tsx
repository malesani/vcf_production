import React, { useState, useEffect } from "react";

import {
    initValidationFeedback, handleInputChange,
    CreateFlow, UpdateFlow, UpsertFlow, FormProps
} from "./GeneralForm_Common";

import { requestResponse, DataResponse } from '../hooks/RequestFunction';

import isEqual from 'fast-deep-equal';


export function useCreateFlow<T, P>(
    props: CreateFlow<T, P> & FormProps<T, P>
) {
    const { fields, params, onSuccess, onChange , onNewMessage, onNotValidated } = props;
    const { createData } = props;

    const [formData, setFormData] = useState<T>({} as T);

    const [isModified, setIsModified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [validated, setValidated] = useState(false);

    const [validationFeedback, setValidationFeedback] = useState(
        () => initValidationFeedback(fields, {} as T)
    );

    // LOGCHANGE validationFeedback
    useEffect(() => {
        console.log("changed validationFeedback", validationFeedback);
    }, [validationFeedback]);


    // Check for dirty state
    useEffect(() => {
        const dirty = fields.some((f) => {
            const val = (formData as any)[f.name];
            return val !== undefined && val !== "" && val !== null;
        });
        setIsModified(dirty);
        onChange?.(formData);
    }, [formData, fields]);

    // Submit del form
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setValidated(true);

        console.log('validated', validated);

        fields.forEach((f) => {
            var info = validationFeedback[f.name]
            console.log(`validationFeedback["${String(f.name)}"]:`, info.isValid, info.feedbackText);
        });

        if (!fields.every(f => validationFeedback[f.name].isValid)) {
            onNotValidated?.();
            return;
        }

        setIsSaving(true);
        try {
            const args = { ...params, ...formData } as P & T
            const result = await createData(args);
            onNewMessage?.(result.response)
            if (result.response.success) {
                onSuccess?.(result.data as T);
                // **RIINIZIALIZZA** la validazione su dati vuoti
                setValidationFeedback(initValidationFeedback(fields, {} as T));

                setFormData({} as T);
                setValidated(false);
                setIsModified(false);
            }
        } catch (err) {
            console.error("Errore creazione:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: keyof T, value: any, isValid: boolean, feedbackText?: string) => {
        handleInputChange(key, value, isValid, fields, setFormData, setValidationFeedback, feedbackText);
    };

    return {
        fields,
        formData,
        validationFeedback,
        setValidationFeedback,
        isModified,
        isSaving,
        validated,
        handleChange,
        handleSubmit,
    };
}

export function useUpdateFlow<T, P>(
    props: UpdateFlow<T, P> & FormProps<T, P>
) {
    const { fields, params, onSuccess, onChange, onNewMessage, onNotValidated } = props;
    const {
        updateData,
        data: controlledData,
        response: controlledResponse,
        getData,
        onLoad } = props;

    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<T>({} as T);
    const [formData, setFormData] = useState<T>({} as T);

    const [isModified, setIsModified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [validated, setValidated] = useState(false);

    const [validationFeedback, setValidationFeedback] = useState(
        () => initValidationFeedback(fields, {} as T)
    );

    // Function to load Data
    const loadDataFunction = (responseData: DataResponse<T>) => {
        const data = responseData.data as T;
        const reqResp = responseData.response as requestResponse;

        if (reqResp.success && data) {
            fields.forEach((f) => {       // Default false per checkbox
                if (f.type === 'checkbox' && data[f.name] == null) {
                    (data as any)[f.name] = false;
                }
            });
            setLoading(false);
            setInitialData(data);
            setFormData(data);
            setValidationFeedback(initValidationFeedback(fields, data));
            onLoad?.(data);
        } else {
            console.error("Errore fetch data:", reqResp.message);
        }
    }

    // Initial fetch, change on params change
    useEffect(() => {
        if (controlledData !== undefined) {
            const fakeResp: DataResponse<T> = {
                data: controlledData,
                response: controlledResponse ?? { success: true, message: "" }
            };
            loadDataFunction(fakeResp);
        } else {

            (async () => {
                try {
                    const args = { ...params } as P;
                    const responseData = await getData!(args);
                    loadDataFunction(responseData);
                    return
                } catch (err) {
                    console.error("Errore fetch data:", err);
                }
            })();
        }
    }, [controlledData, controlledResponse, JSON.stringify(params)]);

    // LOGCHANGE validationFeedback
    useEffect(() => {
        console.log("changed validationFeedback", validationFeedback);
    }, [validationFeedback]);

    // Check modifications
    useEffect(() => {
        if (loading) return;
        const modified = fields.some(f => {
            const key = f.name as keyof T;
            return !isEqual(formData[key], initialData[key]);
        });
        setIsModified(modified);
        onChange?.(formData);
    }, [formData, initialData]);

    // Stile per campi modificati
    const modifiedStyle = (key: keyof T) => {
        if (loading) return {};
        return !isEqual(formData[key], initialData[key])
            ? { backgroundColor: '#d0eaff' }
            : {};
    };

    // Submit del form
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setValidated(true);

        console.log('validated', validated);
        console.log('validationFeedback', validationFeedback);

        if (!fields.every(f => validationFeedback[f.name].isValid)) {
            onNotValidated?.();
            return;
        }

        setIsSaving(true);

        try {
            const args = { ...params, ...formData } as P & T
            const result = await updateData(args);
            onNewMessage?.(result.response)
            if (result.response.success) {
                setInitialData(formData);
                onSuccess?.(formData);
            }
        } catch (err) {
            console.error('Error updating data:', err);
        } finally {
            setIsSaving(false);
            setValidated(false);
        }
    };

    const handleChange = (key: keyof T, value: any, isValid: boolean, feedbackText?: string) => {
        handleInputChange(key, value, isValid, fields, setFormData, setValidationFeedback, feedbackText);
    };

    return {
        fields,
        formData,
        validationFeedback,
        setValidationFeedback,
        loading,
        isModified,
        isSaving,
        validated,
        modifiedStyle,
        handleChange,
        handleSubmit,
    };
}

export function useUpsertFlow<T extends object, P>(
    props: UpsertFlow<T, P> & FormProps<T, P>
) {
    const {
        fields,
        params,
        onSuccess,
        onChange,
        onNewMessage,
        onNotValidated,
    } = props;

    const {         // props specifici upsert
        getData,
        updateData,
        createData,
        data: controlledData,
        response: controlledResponse,
        onLoad
    } = props;

    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<T>({} as T);
    const [formData, setFormData] = useState<T>({} as T);

    // ≪flag≫ create vs update
    const [isCreateMode, setIsCreateMode] = useState(true);

    const [isModified, setIsModified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [validated, setValidated] = useState(false);

    const [validationFeedback, setValidationFeedback] = useState(
        () => initValidationFeedback(fields, {} as T)
    );

    // LOGCHANGE validationFeedback
    useEffect(() => {
        console.log("changed validationFeedback", validationFeedback);
    }, [validationFeedback]);

    // 1) Caricamento iniziale (create vs update)
    const loadDataFunction = (responseData: DataResponse<T>) => {
        const data = responseData.data as T;
        const reqResp = responseData.response as requestResponse;

        if (reqResp.success && data) {
            // update mode
            setIsCreateMode(false);

            fields.forEach((f) => {       // Default false per checkbox
                if (f.type === 'checkbox' && data[f.name] == null) {
                    (data as any)[f.name] = false;
                }
            });
            setInitialData(data);
            setFormData(data);
            setValidationFeedback(initValidationFeedback(fields, data));
            onLoad?.(data);
        } else {
            // create mode: lasciamo formData vuoto
            setIsCreateMode(true);
            setInitialData({} as T);            // ← aggiungi questa riga
            setFormData({} as T);
            setValidationFeedback(initValidationFeedback(fields, {} as T));
        }
        setLoading(false);
    };

    useEffect(() => {
        if (controlledData !== undefined) {
            // se passo direttamente un initial payload
            loadDataFunction({
                data: controlledData,
                response: controlledResponse ?? { success: true, message: "" }
            });
        } else {
            (async () => {
                try {
                    const resp = await getData!(params as P);
                    loadDataFunction(resp);
                } catch (err) {
                    console.error("Errore fetching upsert data:", err);
                    loadDataFunction({ data: {} as T, response: { success: false, message: "" } });
                }
            })();
        }
    }, [controlledData, controlledResponse, JSON.stringify(params)]);

    // 2) Dirty-check (identica a update)
    useEffect(() => {
        if (loading) return;
        const modified = fields.some(f => {
            const key = f.name as keyof T;
            return !isEqual(formData[key], initialData[key]);
        });
        setIsModified(modified);
        onChange?.(formData);
    }, [formData, initialData]);

    // 3) Stile campi modificati
    const modifiedStyle = (key: keyof T) => {
        if (loading) return {};
        return !isEqual(formData[key], initialData[key])
            ? { backgroundColor: '#d0eaff' }
            : {};
    };

    // 4) Submit unico: se initialData è vuoto → create, altrimenti update
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setValidated(true);

        if (!fields.every(f => validationFeedback[f.name].isValid)) {
            onNotValidated?.();
            return;
        }

        // Se sono in UPDATE mode e non ho modifiche, skip update
        if (!isCreateMode && !isModified) {
            // facciamo finta di un successo "soft"
            onNewMessage?.({ success: true, message: 'Nessuna modifica da salvare' });
            return;
        }

        setIsSaving(true);

        try {
            const payload = { ...(params as P), ...formData } as P & T;
            // capisco se è create (initialData vuoto) o update
            const result = isCreateMode
                ? await createData(payload)
                : await updateData(payload);

            onNewMessage?.(result.response);

            if (result.response.success) {
                // i dati restituiti dal server (o quelli locali se non tornano)
                const returnedData = (result as DataResponse<T>).data ?? formData;

                if (isCreateMode) {
                    // passo in “update mode” con il record appena creato:
                    setIsCreateMode(false);
                    setInitialData(returnedData);
                    setFormData(returnedData);
                    setValidationFeedback(initValidationFeedback(fields, returnedData));
                } else {
                    // new baseline per update
                    setInitialData(formData);
                }

                onSuccess?.(returnedData);
                setValidated(false);
            }
        } catch (err) {
            console.error("Errore upsert:", err);
        } finally {
            setIsSaving(false);
        }
    };

    // 5) Change handler (stessa di update)
    const handleChange = (key: keyof T, value: any, isValid: boolean, feedbackText?: string) => {
        handleInputChange(key, value, isValid, fields, setFormData, setValidationFeedback, feedbackText);
    };

    return {
        fields,
        formData,
        validationFeedback,
        setValidationFeedback,
        loading,
        isCreateMode,
        isModified,
        isSaving,
        validated,
        modifiedStyle,
        handleChange,
        handleSubmit,
    };
}