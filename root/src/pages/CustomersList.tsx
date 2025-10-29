import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MDBBtn,
  MDBSelect,
  MDBCard,
  MDBBadge,
  MDBTable,
  MDBTableHead,
  MDBTableBody,
  MDBModal,
  MDBModalDialog,
  MDBModalContent,
  MDBModalHeader,
  MDBModalBody,
  MDBModalFooter,
  MDBIcon,
  MDBRow,
  MDBCol,
  MDBInput
} from 'mdb-react-ui-kit';
import { DataResponse } from '../hooks/RequestFunction';

import { getCustomerB2BList, APICustomerB2BInfo } from '../api_module_v1/CustomerB2BRequest';

import GeneralTable, { ColumnConfig, ActionConfig } from "../app_components/GeneralTable";



const CustomersList: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<APICustomerB2BInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<APICustomerB2BInfo | null>(null);

  // search filters
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [estimate, setEstimate] = useState<string>('');


  const fetchCustomers = async (args: {
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<DataResponse<APICustomerB2BInfo[]>> => {

    const { search = "", per_page = 20 } = args;

    setLoading(true);
    setError(null);
    try {
      const { response, data } = await getCustomerB2BList({ search, per_page });
      if (response.success && data) {
        setLoading(false);
        return {
          response: response,
          data: data.customers_list,
        };
      } else {
        throw new Error(response.error || response.message || 'Failed to load customers');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      return {
        response: { success: false, message: "Unknown error", error: "Unknown error" }
      };
    }
  };

  const toggleModal = () => setModalOpen(!modalOpen);

  const handleView = (customer: APICustomerB2BInfo) => {
    setSelectedCustomer(customer);
    setModalOpen(true);
  };


  const columns: ColumnConfig<APICustomerB2BInfo>[] = [
    { field: 'business_name', label: 'Ragione Sociale' },
    { field: 'general_email', label: 'Email' },
    {
      field: 'userStatus',
      label: 'Status',
    },
    {
      field: 'estimate_count',
      label: 'Preventivi',
    },
  ];

  const fields = [] as any[];

  const actions: ActionConfig<APICustomerB2BInfo>[] = [
    {
      icon: 'user-gear',
      buttonProps: { color: 'secondary' },
      onClick: (c) =>
        navigate(`/customer/customer_settings/${encodeURIComponent(c.customer_uid)}`)
    },
    {
      icon: 'info',
      buttonProps: { color: 'info' },
      onClick: handleView,
    },
    {
      icon: 'user',
      buttonProps: { color: 'primary' },
      onClick: (c) =>
        navigate(`/customer/customer_dashboard/{encodeURIComponent(c.customer_uid)}`),
    },
  ];

  return (
    <>
      <MDBCard className="p-4">
        <GeneralTable<APICustomerB2BInfo, {}, {}>
          title="Clienti B2B"
          icon="users"
          columns={columns}
          fields={fields}
          getData={fetchCustomers}
          initialFilters={{ page: 1, per_page: 20 }}
          disableNotVisible={{ create: false, update: false, delete: false }}
          actions={actions}
          advancedFilters={true}
        />
      </MDBCard>


      {/* Modal per i dettagli del cliente */}
      <MDBModal open={modalOpen} onClose={() => setModalOpen(false)} tabIndex={-1}>
        <MDBModalDialog>
          <MDBModalContent>
            <MDBModalHeader>
              <h5 className="modal-title">{selectedCustomer?.business_name}</h5>
              <MDBBtn className="btn-close" color="none" onClick={toggleModal}></MDBBtn>
            </MDBModalHeader>
            <MDBModalBody>
              {selectedCustomer ? (
                <div>
                  <p>
                    <strong>Indirizzo:</strong> {selectedCustomer.address}, {selectedCustomer.zip_code}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedCustomer.general_email}
                  </p>
                  <p>
                    <strong>Partita IVA:</strong> {selectedCustomer.vat_number}
                  </p>
                  {/* Aggiungi altri campi se necessario */}
                </div>
              ) : (
                <p>Nessun cliente selezionato.</p>
              )}
            </MDBModalBody>
            <MDBModalFooter>
              <MDBBtn color="secondary" onClick={toggleModal}>
                Chiudi
              </MDBBtn>
            </MDBModalFooter>
          </MDBModalContent>
        </MDBModalDialog>
      </MDBModal>
    </>
  );
};

export default CustomersList;
