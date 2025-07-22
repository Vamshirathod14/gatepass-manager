import { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    studentName: '',
    hallTicket: '',
    year: '',
    branch: '',
    reason: ''
  });
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  

  const years = ['1st', '2nd', '3rd', '4th'];

  const branches = ['CSE','CSE-A', 'CSE-B', 'CSE-C', 'CSE-D','CSD', 'ECE', 'EEE',];

  useEffect(() => {
    fetchGatepasses();
  }, []);

  const fetchGatepasses = async () => {
    setFetching(true);
    try {
      const response = await axios.get('http://localhost:5000/api/gatepasses');
      setGatepasses(response.data);
    } catch (err) {
      console.error('Error fetching gatepasses:', err);
      showErrorToast(
        'Load Failed',
        'Failed to fetch gatepass history',
        null,
        false
      );
    } finally {
      setFetching(false);
    }
  };

  const fetchHistory = async (gatepassId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/gatepasses/history/${gatepassId}`);
      setHistory(response.data);
      setShowHistory(true);
    } catch (err) {
      console.error('Error fetching history:', err);
      toast.error('Failed to load history');
    }
  };

  const checkMonthlyLimit = async (hallTicket) => {
    if (!hallTicket) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/gatepasses/monthly-count/${hallTicket}`);
      setMonthlyCount(response.data.count);
    } catch (err) {
      console.error('Error checking monthly limit:', err);
      showErrorToast(
        'Limit Check Failed',
        'Failed to check monthly limit',
        null,
        false
      );
    }
  };

  const showErrorToast = (title, message, resetInfo, isDailyLimit) => {
    toast.error(
      <div className="toast-message">
        <div className="toast-title error">{title}</div>
        <div className="toast-content">{message}</div>
        {resetInfo && (
          <div className="toast-note">
            <span className="note-label">Note:</span> {resetInfo}
          </div>
        )}
      </div>,
      { 
        autoClose: isDailyLimit ? 5000 : 7000,
        className: 'toast-error'
      }
    );
  };

  const showSuccessToast = (title, message) => {
    toast.success(
      <div className="toast-message">
        <div className="toast-title success">{title}</div>
        <div className="toast-content">{message}</div>
      </div>,
      {
        className: 'toast-success'
      }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'hallTicket') {
      checkMonthlyLimit(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (monthlyCount >= 3) {
      const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
      showErrorToast(
        'Monthly Limit Reached',
        'You have used all 3 passes this month',
        `Resets on ${nextMonth.toLocaleDateString()}`,
        false
      );
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/gatepasses', formData);
      
      showSuccessToast(
        'Success!',
        response.data.message || 'Gatepass submitted successfully'
      );

      setFormData({
        studentName: '',
        hallTicket: '',
        year: '',
        branch: '',
        reason: ''
      });
      await fetchGatepasses();
      await checkMonthlyLimit(formData.hallTicket);
      
    } catch (err) {
      const errorData = err.response?.data;
      
      if (errorData?.type === 'DAILY_LIMIT') {
        showErrorToast(
          'Daily Limit Reached',
          errorData.message,
          errorData.resetInfo,
          true
        );
      } 
      else if (errorData?.type === 'MONTHLY_LIMIT') {
        showErrorToast(
          'Monthly Limit Reached',
          errorData.message,
          errorData.resetInfo,
          false
        );
      }
      else {
        showErrorToast(
          'Submission Failed',
          errorData?.message || 'An unexpected error occurred',
          null,
          false
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ApprovedByHOD': return 'status-approved';
      case 'RejectedByIncharge':
      case 'RejectedByHOD': return 'status-rejected';
      case 'ApprovedByIncharge': return 'status-approved-incharge';
      case 'Pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ApprovedByHOD':
        return (
          <svg className="status-icon approved" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'RejectedByIncharge':
      case 'RejectedByHOD':
        return (
          <svg className="status-icon rejected" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'ApprovedByIncharge':
        return (
          <svg className="status-icon incharge" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'Pending':
        return (
          <svg className="status-icon pending" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="main-content">
        <div className="gatepass-card">
          <div className="card-header">
            <h1 className="card-title">Scient Institute of Technology</h1>
            <p className="card-subtitle">Submit and track your gatepass requests</p>
          </div>
          
          {/* Limits Indicator */}
          {formData.hallTicket && (
            <div className="limits-indicator">
              <div className="limits-info">
                <span className={`limits-count ${monthlyCount >= 3 ? 'limit-reached' : ''}`}>
                  {monthlyCount >= 3 ? (
                    <span>⚠️ Monthly limit reached (3/3)</span>
                  ) : (
                    `Monthly passes used: ${monthlyCount}/3`
                  )}
                </span>
                <span className="limits-reset">
                  Resets on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${monthlyCount >= 3 ? 'progress-full' : ''}`} 
                  style={{ width: `${Math.min((monthlyCount / 3) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="card-body">
            <div className="form-container">
              <h2 className="form-title">New Gatepass Request</h2>
              <form onSubmit={handleSubmit} className="gatepass-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Student Name</label>
                    <input
                      type="text"
                      name="studentName"
                      value={formData.studentName}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hall Ticket Number</label>
                    <input
                      type="text"
                      name="hallTicket"
                      value={formData.hallTicket}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="Enter your hall ticket number"
                    />
                  </div>
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      required
                      className="form-input"
                    >
                      <option value="">Select Year</option>
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Branch</label>
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      required
                      className="form-input"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Reason for Gatepass</label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="form-textarea"
                    placeholder="Explain why you need the gatepass"
                  />
                </div>
                
                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={loading || monthlyCount >= 3}
                    className={`submit-btn ${monthlyCount >= 3 ? 'disabled-btn' : ''} ${loading ? 'loading-btn' : ''}`}
                  >
                    {loading ? (
                      <>
                        <svg className="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : monthlyCount >= 3 ? (
                      'Monthly Limit Reached'
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="requests-container">
          <h2 className="requests-title">Your Gatepass Requests</h2>
          {fetching ? (
            <div className="loading-spinner">
              <div className="spinner-circle"></div>
            </div>
          ) : gatepasses.length === 0 ? (
            <div className="empty-state">
              <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="empty-title">No gatepass requests</h3>
              <p className="empty-message">Submit a new request to get started.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="requests-table">
                <thead className="table-header">
                  <tr>
                    <th className="table-head">Date</th>
                    <th className="table-head">Status</th>
                    <th className="table-head">Reason</th>
                    <th className="table-head">Actions</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {gatepasses.map((gatepass) => (
                    <tr key={gatepass._id} className="table-row">
                      <td className="table-cell">
                        {new Date(gatepass.createdAt).toLocaleString()}
                      </td>
                      <td className="table-cell">
                        <div className="status-container">
                          {getStatusIcon(gatepass.status)}
                          <span className={`status-badge ${getStatusColor(gatepass.status)}`}>
                            {gatepass.status}
                          </span>
                        </div>
                        {gatepass.rejectionReason && (
                          <p className="rejection-reason">Reason: {gatepass.rejectionReason}</p>
                        )}
                      </td>
                      <td className="table-cell">
                        {gatepass.reason}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => {
                            setSelectedGatepass(gatepass);
                            fetchHistory(gatepass._id);
                          }}
                          className="history-btn"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>Gatepass Management System &copy; {new Date().getFullYear()}</p>
          <p className="developer">Developed by Vamshi</p>
        </div>
      </footer>

      {/* History Modal */}
      {showHistory && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">
                  Approval History for {selectedGatepass?.studentName}
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="modal-close"
                >
                  <svg className="close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="history-content">
                {history.length === 0 ? (
                  <p className="no-history">No history available</p>
                ) : (
                  <div className="history-list">
                    {history.map((record, index) => (
                      <div key={index} className="history-item">
                        <div className="history-header">
                          <span className="history-action">{record.action}</span>
                          <span className="history-date">{formatDate(record.timestamp)}</span>
                        </div>
                        <div className="history-detail">
                          <span className="detail-label">By:</span> {record.actor}
                        </div>
                        {record.remarks && (
                          <div className="history-detail">
                            <span className="detail-label">Remarks:</span> {record.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;