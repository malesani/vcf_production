import React, { useState, useCallback, useMemo } from 'react';
import {
  MDBCard,
  MDBCardBody,
  MDBCardHeader,
  MDBCardTitle,
  MDBCardText,
  MDBBadge,
  MDBProgress,
  MDBProgressBar,
  MDBRow,
  MDBCol,
  MDBIcon,
  MDBTooltip,
  MDBBtn,
} from 'mdb-react-ui-kit';
import { PortfolioInfo, get_assetPrices } from '../../api_module/portfolio/PortfolioData';
import { PortManagedInfo } from '../../api_module/portfolioManaged/PortManagedData';

interface Props {
  portfolio: PortfolioInfo;
  managedInfo?: PortManagedInfo;
  assetPrices?: Record<string, number | null>;
}

const toNumber = (val: any): number => {
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const fmtEUR = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(
    toNumber(n)
  );

const PortfolioCard: React.FC<Props> = ({ portfolio, managedInfo, assetPrices }) => {
  const { title, type, target, time_horizon_years, cash_position, automatic_savings, assets = [] } = portfolio;

  const [loadingSync, setLoadingSync] = useState(false);
  const [pricesMap, setPricesMap] = useState<Record<string, number | null>>(assetPrices || {});

  const handleSyncPrices = useCallback(async () => {
    setLoadingSync(true);
    try {
      const res = await get_assetPrices({ portfolio_uid: portfolio.portfolio_uid });
      if (res.data) {
        const newMap = Object.fromEntries(res.data.map((p: any) => [p.symbol, p.currentPrice]));
        setPricesMap((prev) => ({ ...prev, ...newMap }));
      }
    } catch (err) {
      console.error('Errore durante il sync prezzi asset:', err);
    } finally {
      setLoadingSync(false);
    }
  }, [portfolio.portfolio_uid]);

  // Valori calcolati
  const {
    totalInvested, // somma qty * prezzo_lastOp (per info/ancoraggio)
    totalAssetsNow, // somma qty * prezzo_corrente (fallback a lastOp se manca)
    totalNow, // cash + assets now
  } = useMemo(() => {
    let invested = 0;
    let now = 0;
    for (const a of assets) {
      const qty = toNumber(a.unitQuantity);
      const purchase = toNumber(a.unitaryPrice_lastOp);
      const current = toNumber(pricesMap[a.symbol] ?? purchase);
      invested += qty * purchase;
      now += qty * current;
    }
    return {
      totalInvested: invested,
      totalAssetsNow: now,
      totalNow: toNumber(cash_position) + now,
    };
  }, [assets, pricesMap, cash_position]);

  const progress = useMemo(() => {
    const tgt = Math.max(0, toNumber(target));
    if (!tgt) return 0;
    return Math.min(100, Math.round((toNumber(totalNow) / tgt) * 100));
  }, [target, totalNow]);

  const renderAssetRows = () => {
    const total = totalAssetsNow || 0;

    return assets.map((a) => {
      const qty = toNumber(a.unitQuantity);
      const purchase = toNumber(a.unitaryPrice_lastOp);
      const current = pricesMap[a.symbol] != null ? toNumber(pricesMap[a.symbol]) : purchase;

      const amountNow = qty * current;
      const percent = total > 0 ? (amountNow / total) * 100 : 0;

      const diffPct = purchase > 0 ? (current / purchase - 1) * 100 : 0; // FIX: segno corretto
      const diffVal = qty * (current - purchase); // FIX: P/L in €

      const trendColor = diffPct > 0 ? 'success' : diffPct < 0 ? 'danger' : 'muted';
      const trendIcon = diffPct > 0 ? 'arrow-up' : diffPct < 0 ? 'arrow-down' : 'minus';
      const sign = diffPct > 0 ? '+' : diffPct < 0 ? '' : '';

      return (
        <div key={a.symbol} className="mb-3">
          <div className="d-flex justify-content-between small">
            <div>
              <span className="fw-bold">{a.symbol}</span>
              <span className="ms-2 text-muted">({qty} asset)</span>
            </div>
            <div className="text-end">
              <span className="text-info">{fmtEUR(amountNow)}</span>
              <br />
              <small className={`text-${trendColor}`}>
                <MDBIcon fas icon={trendIcon} className="me-1" />
                {fmtEUR(diffVal)} ({sign}{diffPct.toFixed(1)}%)
              </small>
            </div>
          </div>
          <MDBProgress className="rounded" height="4">
            <MDBProgressBar width={percent} bgColor="info" />
          </MDBProgress>
        </div>
      );
    });
  };

  return (
    <MDBCard className="rounded bg-light border shadow-sm h-100 position-relative">
      <MDBCardHeader className="py-3 px-4 border-bottom" style={{backgroundColor:"rgb(38, 53, 80)", color:"white"}}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
          <MDBCardTitle tag="h5" className="mb-2 mb-md-0 d-flex align-items-center">
            <MDBIcon fas icon="chart-line" className="me-2" />
            {title}
            <MDBBadge color={type === 'custom' ? 'info' : 'primary'} className="ms-3">
              {type === 'custom' ? 'Personalizzato' : 'Gestito'}
            </MDBBadge>
            {type === 'managed' && managedInfo?.title && (
              <MDBBadge color="primary" pill className="ms-2">
                {managedInfo.title}
              </MDBBadge>
            )}
          </MDBCardTitle>

          <div className="text-md-end" style={{color:"white"}}>
            <p className="mb-1 small">Valore Attuale (Cassa + Asset)</p>
            <p className="mb-0 h6 fw-bold">{fmtEUR(totalNow)}</p>
          </div>
        </div>
      </MDBCardHeader>

      <MDBCardBody className="bg-white">
        <MDBRow className="mb-3">
          <MDBCol sm="12" md="6" className="d-flex flex-column">
            <div className="d-flex align-items-center mb-2">
              <h6 className="mb-0">Obiettivo:</h6>
            </div>
            <MDBCardText className="small text-muted">
              Target: <strong>{fmtEUR(toNumber(target))}</strong> in {toNumber(time_horizon_years)} anni
            </MDBCardText>

            <MDBCardText className="small text-muted mb-0">
              Investito (storico): <strong>{fmtEUR(totalInvested)}</strong>
            </MDBCardText>
            <MDBCardText className="small text-muted">
              Valore asset (prezzi attuali): <strong>{fmtEUR(totalAssetsNow)}</strong>
            </MDBCardText>
          </MDBCol>

          <MDBCol sm="12" md="6" className="text-md-end mt-3 mt-md-0">
            <MDBTooltip tag="span" title="Avanzamento rispetto al target sul valore attuale (cassa + asset)">
              <p className="mb-1 small">
                Progresso <span className="mb-2 text-muted">{progress}%</span>
              </p>
            </MDBTooltip>
            <MDBProgress className="rounded" height="6">
              <MDBProgressBar width={progress} bgColor="info" animated={progress > 0 && progress < 100} striped />
            </MDBProgress>
          </MDBCol>
        </MDBRow>

        <hr className="my-3" />

        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="fw-bold m-0">Composizione Portafoglio</h5>
            <div className="d-flex align-items-center">
              {loadingSync && <small className="me-2 text-muted">Aggiornamento in corso...</small>}
              <MDBBtn size="sm" floating color="secondary" onClick={handleSyncPrices} disabled={loadingSync}>
                <MDBIcon fas icon="sync" spin={loadingSync} />
              </MDBBtn>
            </div>
          </div>

          <div className="bg-light p-2 rounded mb-2 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <MDBIcon fas icon="wallet" className="me-2" />
              <span>Liquidità Disponibile</span>
            </div>
            <span className="fw-bold text-muted">{fmtEUR(toNumber(cash_position))}</span>
          </div>

          {assets.length > 0 ? renderAssetRows() : <p className="text-muted small mb-0">Nessun asset presente.</p>}
        </div>

        <div className="pt-2 d-flex align-items-center justify-content-between border-top mt-3 pt-3">
          <div className="d-flex flex-row flex-nowrap align-items-center gap-3">
            <MDBIcon fas icon="bullseye" className="text-info" />
            <p className="m-0 text-sm text-muted">Contribuzione Mensile</p>
            <p className="m-0 fw-bold">{fmtEUR(toNumber(automatic_savings))}</p>
          </div>
        </div>
      </MDBCardBody>
    </MDBCard>
  );
};

export default PortfolioCard;
