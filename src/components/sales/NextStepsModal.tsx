interface NextStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

export function NextStepsModal({ isOpen, onClose, content }: NextStepsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="sales-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(30, 27, 75, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '20px',
      }}
    >
      <div
        className="sales-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--sales-surface)',
          borderRadius: 'var(--sales-radius)',
          boxShadow: 'var(--sales-shadow-hover)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--sales-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--sales-text)',
            }}
          >
            Latest / Next Steps
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: 'var(--sales-text-secondary)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--sales-radius-sm)',
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--sales-accent-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            padding: '20px',
            overflow: 'auto',
            color: 'var(--sales-text)',
            fontSize: '14px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content || 'No next steps recorded.'}
        </div>
      </div>
    </div>
  );
}
