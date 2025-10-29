import { FieldConfig, RepeaterFieldConfig } from "./GeneralForm_Common";
import { MDBBtn, MDBIcon, MDBRow, MDBCol } from "mdb-react-ui-kit";

import { GeneralInput } from "./GeneralInput";

import { useIsMobile } from "./ResponsiveModule";

interface RepeaterFieldProps<T, U> {
    field: RepeaterFieldConfig<T, U>; // RepeaterFieldConfig<..., U>
    items: U[];
    onChange: (items: U[]) => void;
    validated: boolean;
}

export function RepeaterField<T, U extends Record<string, any>>({ field, items, onChange, validated }: RepeaterFieldProps<T, U>) {
    const isTablet = useIsMobile(992);
    // const isMobile = useIsMobile(768);

    const subFields = (field as any).subFields as FieldConfig<U>[];

    const handleItemChange = (index: number, key: keyof U, value: any, isValid: boolean) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [key]: value };
        onChange(updated);
    };

    const handleAdd = () => {
        const def = (field.properties?.defaultItem?.() ?? {}) as U;
        onChange([...items, def]);
    };

    const handleRemove = (index: number) => {
        const updated = [...items];
        updated.splice(index, 1);
        onChange(updated);
    };

    return (
        <div className="repeater-field-wrapper">
            <div className="d-flex flex-row justify-content-between align-items-center">
                <label className="form-label fw-bold mb-0">{field.label}</label>
                <MDBBtn type="button" color="secondary" floating={isTablet} onClick={handleAdd}>
                    <MDBIcon icon="plus" />
                    {!isTablet && <span className="ms-2">Aggiungi</span>}
                </MDBBtn>
            </div>

            {items.map((item, idx) => (
                <div key={idx} className="border rounded p-3 pb-0 mt-3 position-relative bg-light-subtle d-flex gap-3 justify-content-between">
                    <MDBRow className="flex-grow-1">
                        {subFields.map((sf, i) => (
                            <MDBCol
                                key={idx + '_' + i}
                                size={sf.grid?.size}
                                sm={sf.grid?.sm}
                                md={sf.grid?.md}
                                lg={sf.grid?.lg}
                                xl={sf.grid?.xl}
                                xxl={sf.grid?.xxl}
                                className={validated ? "" : "mb-3"}
                            >
                                <GeneralInput<U>
                                    key={idx + '_' + i}
                                    field={sf}
                                    formData={item}
                                    style={{}}
                                    onChange={(key, val, isValid, feedback) =>
                                        handleItemChange(idx, key, val, isValid)
                                    }
                                />
                            </MDBCol>
                        ))}
                    </MDBRow>
                    <div>
                        <MDBBtn
                            type="button"
                            color="danger"
                            floating
                            onClick={() => handleRemove(idx)}
                        >
                            <MDBIcon icon="times" />
                        </MDBBtn>
                    </div>
                </div>
            ))}
        </div>
    );
}
