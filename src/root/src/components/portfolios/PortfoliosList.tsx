import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MDBCard } from 'mdb-react-ui-kit';

import { get_portfoliosList, PortfolioInfo } from '../../api_module/portfolio/PortfolioData';

import GeneralTable, { ColumnConfig, ActionConfig } from "../../app_components/GeneralTable";

const PortfoliosList: React.FC = () => {
  const navigate = useNavigate();

  const columns: ColumnConfig<PortfolioInfo>[] = [
    { field: 'title', label: 'Titolo' },
    { field: 'target', label: 'Obiettivo (€)' },
    { field: 'time_horizon_years', label: 'Orizzonte (anni)' },
    { field: 'cash_position', label: 'Liquidità (€)' },
    { field: 'automatic_savings', label: 'Accantonamento (€)' },
  ];

  const fields = [] as any[];

  const actions: ActionConfig<PortfolioInfo>[] = [
    {
      icon: 'chart-line',
      buttonProps: { color: 'primary' },
      onClick: (portfolio) => {
        navigate(`/portfolio/${encodeURIComponent(portfolio.portfolio_uid)}`);
      }
    }
  ];

  return (
    <MDBCard className="p-4">
      <GeneralTable<PortfolioInfo, {}, {}>
        title="Lista Portafogli"
        icon="wallet"
        columns={columns}
        fields={fields}
        getData={get_portfoliosList}
        initialFilters={{ page: 1, per_page: 20 }}
        disableNotVisible={{ create: false, update: false, delete: false }}
        actions={actions}
      />
    </MDBCard>
  );
};

export default PortfoliosList;
