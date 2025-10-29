interface DialogInfoProps {
  label: string;
  value: string;
}

const DialogInfo: React.FC<DialogInfoProps> = ({ label, value }) => {
  return (
    <div
      className="d-flex justify-content-space flex-column"
      style={{
        backgroundColor: "rgba(249, 250, 251, 1)",
        borderRadius: "6px",
        padding: "16px",
        margin: "20px",
        minWidth:"165px"
      }}
    >
      <span style={{ fontSize: "12px", color: "rgba(75, 85, 99, 1)" }}>
        {label}
      </span>
      <div className="d-flex justify-content-between">
        <span style={{ fontSize: "12px"}}>{value}</span>
        <i className="fas fa-circle-info"></i>
      </div>
    </div>
  );
};

export default DialogInfo;