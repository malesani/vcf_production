import React, { useCallback } from "react";
import { requestResponse, DataResponse } from "../../hooks/RequestFunction";

import { GeneralForm, SelectData } from "../../app_components/GeneralForm";
import { QstSection } from "./constant";
import { MDBCard } from "mdb-react-ui-kit";

interface SectionFormProps {
  section: QstSection;
  onRegisterSubmit?: (submitFn: () => Promise<boolean>) => void;
  onNewMessage?: (response: requestResponse) => void;
  onLoadingChange?: (loadingState: boolean) => void;
  onStepSaved?: (question_uid: string, payload: any) => void;
  setProfilationForm: (value: boolean) => void;
}

export interface APIAnswerData {
  question_uid: string;
  answer_uid: string;
}

export const SectionForm: React.FC<SectionFormProps> = ({
  section,
  onRegisterSubmit,
  onNewMessage,
  onLoadingChange,
  onStepSaved,
  setProfilationForm,
}) => {
  const question_uid = section.question_uid;

  // mock get
  async function getAnswerDataMock(args: { question_uid: string }): Promise<DataResponse<APIAnswerData>> {
    return {
      response: {
        success: true,
        data: {
          answer_data: {
            project_uid: "",
            question_uid: args.question_uid,
            answer_uid: "",
          },
        },
        message: "",
      },
      data: {
        question_uid: args.question_uid,
        answer_uid: "",
      },
    };
  }

  // mock upsert
  async function updateAnswerDataMock(payload: any): Promise<DataResponse<any>> {
    onStepSaved?.(question_uid, payload);

    const returned = { project_uid: "", ...payload };

    return {
      response: { success: true, data: { answer_data: returned }, message: "test message" },
      data: returned,
    };
  }

  // wrapper per referenza submit
  const handleRegister = useCallback(
    (fn: () => Promise<boolean>) => {
      onRegisterSubmit?.(fn);
    },
    [onRegisterSubmit]
  );

  // ============================
  // STEP 3 (mix: number fields + optional selectbox)
  // ============================
  if (section.question_uid === "step_3") {
    const fieldOptions = section.options.filter((o) => !!o.field_key);
    const selectOptions = section.options.filter((o) => !!o.answer_uid);

    const selectData: SelectData[] = selectOptions.map((opt) => ({
      icon: opt.icon,
      value: opt.answer_uid!, // safe: filtrato sopra
      text: opt.label,
      secondaryText: opt.description,
    }));

    const step3Fields: any[] = [
      // selectbox SOLO se esistono opzioni con answer_uid
      ...(selectOptions.length
        ? [
            {
              name: "step_3_other",
              label: "Seleziona un’opzione",
              required: true,
              grid: { size: 12 },
              type: "selectbox" as const,
              customElementKey: "cards" as const,
              options: selectData,
              properties: {
                multiple: false,
                showSummaryPills: false,
                hideChoseSomething: true,
                gridConfig: { md: 1, xl: 1, xxl: 1 },
              },
            },
          ]
        : []),

      // inputs numerici
      ...fieldOptions.map((opt) => ({
        name: opt.field_key!, // ✅ chiave “parlante” nel JSON
        label: opt.label,
        required: opt.field_key !== "monthly_invest_capacity", // opzionale
        grid: { size: opt.field_key === "monthly_invest_capacity" ? 12 : 6 },
        type: "number" as const,
        extraElements:
          opt.field_key === "monthly_invest_capacity"
            ? [
                {
                  position: "after" as const,
                  grid: { md: 12 },
                  element: (
                    <>
                      <div className="text-muted mb-4">
                        Questa informazione ci aiuta a creare una strategia di investimento personalizzata
                      </div>
                      <MDBCard
                        className="p-4 mb-4"
                        style={{
                          border: "3px solid rgba(190, 219, 255, 1)",
                          backgroundColor: "rgba(240, 248, 255, 0.6)",
                        }}
                      >
                        <h5>Riepilogo del tuo obiettivo</h5>
                        <div className="d-flex justify-content-between flex-row gap-3 mt-3">
                          <div>
                            <div className="text-muted">Obiettivo</div>
                            <div>1000</div>
                          </div>
                          <div>
                            <div className="text-muted">Tempo</div>
                            <div>15 anni</div>
                          </div>
                          <div>
                            <div className="text-muted">Investimento mensile</div>
                            <div>€ 500</div>
                          </div>
                        </div>
                      </MDBCard>
                    </>
                  ),
                },
              ]
            : undefined,
      })),
    ];

    return (
      <div>
        <GeneralForm<Record<string, any>, { question_uid: string }>
          mode="upsert"
          hideHeader
          disableSubmit={true}
          registerSubmit={handleRegister}
          createBtnProps={{ label: "Prosegui", labelSaving: "Salvataggio" }}
          onNewMessage={onNewMessage}
          onChangeGetDataState={(loadState) => onLoadingChange?.(loadState)}
          alertProps={{ position: { success: "top-right" } }}
          fields={step3Fields}
          params={{ question_uid }}
          getData={getAnswerDataMock as any}
          createData={updateAnswerDataMock as any}
          updateData={updateAnswerDataMock as any}
        />
      </div>
    );
  }

  // ============================
  // STEP 2 (solo fields)
  // ============================
  if (section.question_uid === "step_2") {
    const step2Fields: any[] = section.options.map((opt, index) => {
      const key = opt.field_key ?? opt.answer_uid ?? `field_${index}`;

      const isNumber =
        key === "age" ||
        key === "monthly_net_income" ||
        key === "monthly_expenses" ||
        key === "available_savings" ||
        key === "invested_capital" ||
        key === "monthly_savings_capacity";

      return {
        name: key, // ✅ chiave “parlante” nel JSON
        label: opt.label ?? `Campo ${index + 1}`,
        required: true,
        grid: { size: key === "monthly_savings_capacity" ? 12 : 6 },
        type: isNumber ? "number" : "text",
      };
    });

    return (
      <div>
        <GeneralForm<Record<string, any>, { question_uid: string }>
          mode="upsert"
          hideHeader
          disableSubmit={true}
          registerSubmit={handleRegister}
          createBtnProps={{ label: "Prosegui", labelSaving: "Salvataggio" }}
          onNewMessage={onNewMessage}
          onChangeGetDataState={(loadState) => onLoadingChange?.(loadState)}
          alertProps={{ position: { success: "top-right" } }}
          fields={step2Fields}
          params={{ question_uid }}
          getData={getAnswerDataMock as any}
          createData={updateAnswerDataMock as any}
          updateData={updateAnswerDataMock as any}
        />
      </div>
    );
  }

  // ============================
  // STEP 1 (selectbox)
  // ============================
  const selectData: SelectData[] = section.options
    .filter((opt) => !!opt.answer_uid)
    .map((opt) => ({
      icon: opt.icon,
      value: opt.answer_uid!, // safe: filtrato sopra
      text: opt.label,
      secondaryText: opt.description,
    }));

  return (
    <div>
      <GeneralForm<APIAnswerData, { question_uid: string }>
        mode="upsert"
        hideHeader
        disableSubmit={true}
        registerSubmit={handleRegister}
        createBtnProps={{ label: "Prosegui", labelSaving: "Salvataggio" }}
        onNewMessage={onNewMessage}
        onChangeGetDataState={(loadState) => onLoadingChange?.(loadState)}
        alertProps={{ position: { success: "top-right" } }}
        fields={[
          {
            name: "answer_uid",
            label: "",
            required: true,
            grid: { md: 12 },
            type: "selectbox",
            customElementKey: "cards",
            options: selectData,
            properties: {
              multiple: section.multiple ?? false,
              showSummaryPills: false,
              hideChoseSomething: true,
              gridConfig: { md: 1, xl: 1, xxl: 1 },
            },
          },
        ]}
        params={{ question_uid }}
        getData={getAnswerDataMock}
        createData={updateAnswerDataMock}
        updateData={updateAnswerDataMock}
      />
    </div>
  );
};
