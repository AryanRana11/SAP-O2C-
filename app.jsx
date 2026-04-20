/* ============================================================
   SAP O2C Simulator — React Application
   Uses only React + useState (no backend, dummy data)
   ============================================================ */

const { useState } = React;

// ─── SAP O2C Step Definitions ───────────────────────────────
const STEPS_CONFIG = [
  {
    id: 1,
    key: 'inquiry',
    title: 'Sales Inquiry & Quotation',
    shortTitle: 'Inquiry',
    tCode: 'VA11 / VA21',
    icon: '📋',
    description: 'Log customer inquiry and create formal quotation with pricing, qty, and validity.',
    tables: ['VBAK', 'VBAP'],
    accountingEntries: null,
    accountingNote: 'No FI posting — pre-sales document',
    docPrefix: 'INQ',
    docType: 'Quotation',
    configTable: '—',
  },
  {
    id: 2,
    key: 'salesOrder',
    title: 'Sales Order Creation',
    shortTitle: 'Sales Order',
    tCode: 'VA01',
    icon: '📦',
    description: 'Create Sales Order referencing quotation. System runs ATP check and credit limit check.',
    tables: ['VBAK', 'VBAP', 'VBEP'],
    accountingEntries: null,
    accountingNote: 'Commitment recorded internally',
    docPrefix: 'SO',
    docType: 'Sales Order',
    configTable: '—',
  },
  {
    id: 3,
    key: 'delivery',
    title: 'Outbound Delivery',
    shortTitle: 'Delivery',
    tCode: 'VL01N',
    icon: '🚚',
    description: 'Create outbound delivery, verify qty, and perform warehouse picking.',
    tables: ['LIKP', 'LIPS'],
    accountingEntries: null,
    accountingNote: 'None — stock reserved, not yet reduced',
    docPrefix: 'DLV',
    docType: 'Delivery',
    configTable: '—',
  },
  {
    id: 4,
    key: 'pgi',
    title: 'Post Goods Issue (PGI)',
    shortTitle: 'PGI',
    tCode: 'VL02N (Mvt 601)',
    icon: '📤',
    description: 'Execute PGI to transfer ownership. Movement Type 601 reduces stock in MARD and triggers first FI posting.',
    tables: ['MKPF', 'MSEG', 'MARD', 'LIKP'],
    accountingEntries: [
      { account: 'Cost of Goods Sold (COGS)', side: 'Debit', type: 'dr' },
      { account: 'Finished Goods Inventory', side: 'Credit', type: 'cr' },
    ],
    accountingNote: null,
    docPrefix: 'MAT',
    docType: 'Material Doc',
    configTable: 'OBYC',
  },
  {
    id: 5,
    key: 'billing',
    title: 'Billing Document',
    shortTitle: 'Billing',
    tCode: 'VF01',
    icon: '🧾',
    description: 'Create customer invoice (type F2). Posts revenue recognition: Debit AR, Credit Revenue.',
    tables: ['VBRK', 'VBRP', 'BKPF', 'BSEG', 'BSID'],
    accountingEntries: [
      { account: 'Customer Account (AR)', side: 'Debit', type: 'dr' },
      { account: 'Revenue Account', side: 'Credit', type: 'cr' },
    ],
    accountingNote: null,
    docPrefix: 'INV',
    docType: 'Invoice',
    configTable: 'VKOA',
  },
  {
    id: 6,
    key: 'payment',
    title: 'Customer Payment',
    shortTitle: 'Payment',
    tCode: 'F-28',
    icon: '💰',
    description: 'Post incoming payment. Clears open AR item, moves record from BSID (open) to BSAD (cleared).',
    tables: ['BKPF', 'BSEG', 'BSID', 'BSAD'],
    accountingEntries: [
      { account: 'Bank Account', side: 'Debit', type: 'dr' },
      { account: 'Customer Account (AR)', side: 'Credit', type: 'cr' },
    ],
    accountingNote: null,
    docPrefix: 'PAY',
    docType: 'Payment Doc',
    configTable: 'BSAD',
  },
];

// ─── Dummy Data Options ─────────────────────────────────────
const CUSTOMERS = [
  { id: 'CUST001', name: 'Apollo Hospitals Group' },
  { id: 'CUST002', name: 'Max Healthcare Ltd' },
  { id: 'CUST003', name: 'Fortis Medical Supplies' },
];

const MATERIALS = [
  { id: 'MED001', name: 'Paracetamol 500mg (1000 boxes)', price: 150 },
  { id: 'MED002', name: 'Amoxicillin 250mg (500 boxes)', price: 320 },
  { id: 'MED003', name: 'Surgical Masks N95 (2000 pcs)', price: 45 },
];

// ─── Generate Document ID ───────────────────────────────────
function generateDocId(prefix, stepNum) {
  const num = String(stepNum).padStart(3, '0');
  return `${prefix}${num}`;
}

// ─── Format Currency ────────────────────────────────────────
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

// ============================================================
// COMPONENTS
// ============================================================

// ─── Step Card ──────────────────────────────────────────────
function StepCard({ step, isActive, isCompleted, isLocked, onClick, completedData }) {
  let cardClass = 'step-card';
  if (isActive) cardClass += ' step-card--active';
  if (isCompleted) cardClass += ' step-card--completed';
  if (isLocked) cardClass += ' step-card--locked';

  const statusText = isCompleted
    ? `Completed — ${completedData?.docId || ''}`
    : isActive
    ? 'Ready to execute'
    : isLocked
    ? 'Complete previous step first'
    : 'Available';

  return (
    <div className={cardClass} onClick={() => !isLocked && onClick(step)} id={`step-card-${step.id}`}>
      <div className="step-card-header">
        <div className="step-card-icon">{step.icon}</div>
        <span className="step-number">
          {isCompleted ? '✓' : `Step ${step.id}`}
        </span>
      </div>
      <h3>{step.title}</h3>
      <div className="tcode">T-Code: {step.tCode}</div>
      <p>{step.description}</p>
      <div className="step-card-tags">
        {step.tables.map((t) => (
          <span key={t} className="tag tag--table">{t}</span>
        ))}
        {step.accountingEntries ? (
          step.accountingEntries.map((e, i) => (
            <span key={i} className="tag tag--accounting">
              {e.side === 'Debit' ? 'Dr' : 'Cr'} {e.account.split('(')[0].trim()}
            </span>
          ))
        ) : (
          <span className="tag tag--none">No FI Posting</span>
        )}
      </div>
      <div className="step-card-status">
        <span className={`status-dot ${isActive ? 'status-dot--active' : isCompleted ? 'status-dot--completed' : ''}`}></span>
        {statusText}
      </div>
    </div>
  );
}

// ─── Step Modal ─────────────────────────────────────────────
function StepModal({ step, onClose, onSubmit, completedSteps }) {
  const existingData = completedSteps[step.key];
  const [customer, setCustomer] = useState(existingData?.customer || CUSTOMERS[0].id);
  const [material, setMaterial] = useState(existingData?.material || MATERIALS[0].id);
  const [quantity, setQuantity] = useState(existingData?.quantity || 1000);
  const [submitted, setSubmitted] = useState(!!existingData);

  // Carry forward data from first step if available
  const firstStepData = completedSteps['inquiry'];
  const effectiveCustomer = firstStepData ? firstStepData.customer : customer;
  const effectiveMaterial = firstStepData ? firstStepData.material : material;
  const effectiveQuantity = firstStepData ? firstStepData.quantity : quantity;

  const isFirstStep = step.id === 1;
  const selectedMaterial = MATERIALS.find((m) => m.id === (isFirstStep ? material : effectiveMaterial));
  const selectedCustomer = CUSTOMERS.find((c) => c.id === (isFirstStep ? customer : effectiveCustomer));
  const totalAmount = selectedMaterial ? selectedMaterial.price * (isFirstStep ? quantity : effectiveQuantity) : 0;
  const docId = generateDocId(step.docPrefix, step.id);

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      customer: isFirstStep ? customer : effectiveCustomer,
      material: isFirstStep ? material : effectiveMaterial,
      quantity: isFirstStep ? quantity : effectiveQuantity,
      customerName: selectedCustomer?.name,
      materialName: selectedMaterial?.name,
      unitPrice: selectedMaterial?.price,
      totalAmount,
      docId,
      timestamp: new Date().toLocaleString(),
    };
    setSubmitted(true);
    onSubmit(step.key, data);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-step-badge">{step.icon}</div>
            <div>
              <h2>{step.title}</h2>
              <div className="tcode-badge">T-Code: {step.tCode}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} id="modal-close-btn">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {!submitted ? (
            /* ── Form ── */
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <div className="form-section-title">Transaction Details</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="customer-select">Customer</label>
                    <select
                      id="customer-select"
                      value={isFirstStep ? customer : effectiveCustomer}
                      onChange={(e) => isFirstStep && setCustomer(e.target.value)}
                      disabled={!isFirstStep}
                    >
                      {CUSTOMERS.map((c) => (
                        <option key={c.id} value={c.id}>{c.id} — {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="material-select">Material</label>
                    <select
                      id="material-select"
                      value={isFirstStep ? material : effectiveMaterial}
                      onChange={(e) => isFirstStep && setMaterial(e.target.value)}
                      disabled={!isFirstStep}
                    >
                      {MATERIALS.map((m) => (
                        <option key={m.id} value={m.id}>{m.id} — {m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="quantity-input">Quantity</label>
                    <input
                      id="quantity-input"
                      type="number"
                      min="1"
                      max="99999"
                      value={isFirstStep ? quantity : effectiveQuantity}
                      onChange={(e) => isFirstStep && setQuantity(parseInt(e.target.value) || 1)}
                      disabled={!isFirstStep}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit Price</label>
                    <input type="text" value={formatCurrency(selectedMaterial?.price || 0)} disabled />
                  </div>
                  <div className="form-group form-group--full">
                    <label>Total Value</label>
                    <input type="text" value={formatCurrency(totalAmount)} disabled style={{ fontWeight: 700, fontSize: 16 }} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Document Info</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Document Type</label>
                    <input type="text" value={step.docType} disabled />
                  </div>
                  <div className="form-group">
                    <label>Document ID (Generated)</label>
                    <input type="text" value={docId} disabled style={{ color: '#58a6ff', fontWeight: 700 }} />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" id="execute-step-btn">
                ⚡ Execute {step.shortTitle}
              </button>
            </form>
          ) : (
            /* ── Result Panel ── */
            <div className="result-panel">
              {/* Doc ID Banner */}
              <div className="doc-id-banner">
                <div>
                  <div className="doc-label">{step.docType} Created</div>
                  <div className="doc-id">{docId}</div>
                </div>
                <div className="doc-icon">✅</div>
              </div>

              {/* Info Cards */}
              <div className="info-cards">
                <div className="info-card">
                  <h4>📋 Order Summary</h4>
                  <div className="data-row">
                    <span className="label">Customer</span>
                    <span className="value">{selectedCustomer?.name}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Material</span>
                    <span className="value">{selectedMaterial?.id}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Quantity</span>
                    <span className="value">{(isFirstStep ? quantity : effectiveQuantity).toLocaleString()}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Net Value</span>
                    <span className="value">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                <div className="info-card">
                  <h4>🗄️ SAP Tables Updated</h4>
                  <div className="sap-tables">
                    {step.tables.map((t) => (
                      <span key={t} className="sap-table-tag">{t}</span>
                    ))}
                  </div>
                  {step.configTable !== '—' && (
                    <div style={{ marginTop: 12 }}>
                      <div className="data-row">
                        <span className="label">Config Table</span>
                        <span className="value" style={{ color: '#f5a623' }}>{step.configTable}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accounting Entries */}
                <div className="info-card info-card--full">
                  <h4>📊 Accounting Entries (FI Posting)</h4>
                  {step.accountingEntries ? (
                    <table className="accounting-table">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Debit</th>
                          <th>Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {step.accountingEntries.map((entry, i) => (
                          <tr key={i}>
                            <td>{entry.account}</td>
                            <td className="dr">
                              {entry.type === 'dr' ? (
                                <span className="amount">{formatCurrency(totalAmount)}</span>
                              ) : '—'}
                            </td>
                            <td className="cr">
                              {entry.type === 'cr' ? (
                                <span className="amount">{formatCurrency(totalAmount)}</span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
                      {step.accountingNote}
                    </p>
                  )}
                </div>
              </div>

              <button className="btn-primary btn-success" onClick={onClose} id="close-result-btn">
                ✓ Done — Continue to Next Step
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Document Flow ──────────────────────────────────────────
function DocumentFlow({ completedSteps }) {
  const completedKeys = Object.keys(completedSteps);
  const hasAny = completedKeys.length > 0;

  if (!hasAny) {
    return (
      <div className="doc-flow-section">
        <div className="section-header">
          <h2>📄 Document Flow (VBFA)</h2>
          <span className="badge">Traceability</span>
        </div>
        <div className="empty-state">
          <div className="icon">📄</div>
          <h3>No Documents Yet</h3>
          <p>Complete step 1 to start building the document chain</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-flow-section">
      <div className="section-header">
        <h2>📄 Document Flow (VBFA)</h2>
        <span className="badge">{completedKeys.length} / 6 Documents</span>
      </div>
      <div className="doc-flow">
        {STEPS_CONFIG.map((step, index) => {
          const data = completedSteps[step.key];
          const isCompleted = !!data;
          return (
            <div className="pipeline-step" key={step.key}>
              <div className={`doc-flow-node ${isCompleted ? 'doc-flow-node--active' : 'doc-flow-node--empty'}`}>
                <div className="doc-flow-type">{step.docType}</div>
                <div className="doc-flow-id">
                  {isCompleted ? data.docId : '—'}
                </div>
              </div>
              {index < STEPS_CONFIG.length - 1 && (
                <div className={`doc-flow-connector ${isCompleted && completedSteps[STEPS_CONFIG[index + 1]?.key] ? 'doc-flow-connector--active' : ''}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pipeline (Horizontal Step Indicator) ───────────────────
function Pipeline({ completedSteps, currentStep, onStepClick }) {
  return (
    <div className="pipeline-container">
      <div className="pipeline">
        {STEPS_CONFIG.map((step, index) => {
          const isCompleted = !!completedSteps[step.key];
          const isActive = currentStep === step.id;
          const isLocked = step.id > 1 && !completedSteps[STEPS_CONFIG[step.id - 2]?.key];

          let nodeClass = 'pipeline-node';
          if (isCompleted) nodeClass += ' pipeline-node--completed';
          else if (isActive) nodeClass += ' pipeline-node--active';
          else if (isLocked) nodeClass += ' pipeline-node--locked';

          return (
            <div className="pipeline-step" key={step.key}>
              <div className={nodeClass} onClick={() => !isLocked && onStepClick(step)}>
                <span className="pipeline-num">
                  {isCompleted ? '✓' : step.id}
                </span>
                <span className="pipeline-label">{step.shortTitle}</span>
              </div>
              {index < STEPS_CONFIG.length - 1 && (
                <span className={`pipeline-arrow ${isCompleted ? 'pipeline-arrow--completed' : ''}`}>→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [completedSteps, setCompletedSteps] = useState({});
  const [activeModal, setActiveModal] = useState(null);

  const completedCount = Object.keys(completedSteps).length;
  const progressPercent = (completedCount / STEPS_CONFIG.length) * 100;
  const currentStepId = completedCount + 1; // Next step to complete

  function handleStepClick(step) {
    // Lock check: cannot open a step unless the previous one is completed
    if (step.id > 1) {
      const prevStep = STEPS_CONFIG[step.id - 2];
      if (!completedSteps[prevStep.key]) return;
    }
    setActiveModal(step);
  }

  function handleStepSubmit(stepKey, data) {
    setCompletedSteps((prev) => ({ ...prev, [stepKey]: data }));
  }

  function handleReset() {
    setCompletedSteps({});
    setActiveModal(null);
  }

  return (
    <div className="app">
      <div className="app-bg"></div>

      {/* Header */}
      <header className="header">
        <div className="header-badge">
          <span className="dot"></span>
          SAP O2C Simulator
        </div>
        <h1>Order-to-Cash Process</h1>
        <p>Interactive walkthrough of the complete SAP SD → FI cycle. Execute each step to trace documents, tables, and accounting entries.</p>
        <div className="header-meta">
          <span>👤 Aryan Rana</span>
          <span>🎓 KIIT University</span>
          <span>📚 SAP Business Data Cloud</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar-wrapper">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="progress-label">
          <span>O2C Cycle Progress</span>
          <span className="completed-count">{completedCount} / {STEPS_CONFIG.length} steps completed</span>
        </div>
      </div>

      {/* Pipeline */}
      <Pipeline
        completedSteps={completedSteps}
        currentStep={currentStepId}
        onStepClick={handleStepClick}
      />

      {/* Main Content */}
      <main className="main-content">
        {/* Step Cards */}
        <div className="steps-grid">
          {STEPS_CONFIG.map((step) => {
            const isCompleted = !!completedSteps[step.key];
            const isActive = step.id === currentStepId;
            const isLocked = step.id > 1 && !completedSteps[STEPS_CONFIG[step.id - 2]?.key];

            return (
              <StepCard
                key={step.key}
                step={step}
                isActive={isActive}
                isCompleted={isCompleted}
                isLocked={isLocked}
                onClick={handleStepClick}
                completedData={completedSteps[step.key]}
              />
            );
          })}
        </div>

        {/* Document Flow */}
        <DocumentFlow completedSteps={completedSteps} />

        {/* Reset */}
        {completedCount > 0 && (
          <div className="reset-section">
            <button className="btn-reset" onClick={handleReset} id="reset-btn">
              🔄 Reset Entire O2C Cycle
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        SAP O2C Simulator — Capstone Project | Aryan Rana · Roll No: 2329107 · KIIT University<br />
        Built with React · SAP SD & SAP FI · April 2026
      </footer>

      {/* Modal */}
      {activeModal && (
        <StepModal
          step={activeModal}
          completedSteps={completedSteps}
          onClose={() => setActiveModal(null)}
          onSubmit={handleStepSubmit}
        />
      )}
    </div>
  );
}

// ─── Mount ──────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
