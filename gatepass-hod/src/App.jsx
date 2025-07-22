import { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchPendingGatepasses();
  }, []);

  const fetchPendingGatepasses = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/gatepasses/pending/hod');
      setGatepasses(response.data);
    } catch (err) {
      toast.error('Failed to fetch pending gatepasses');
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

  const handleApprove = async (id) => {
    setLoading(true);
    try {
      await axios.patch(`http://localhost:5000/api/gatepasses/${id}/hod-approve`);
      toast.success('Gatepass approved successfully');
      fetchPendingGatepasses();
    } catch (err) {
      toast.error('Failed to approve gatepass');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!rejectionReason) {
      toast.warning('Please enter rejection reason');
      return;
    }
    setLoading(true);
    try {
      await axios.patch(`http://localhost:5000/api/gatepasses/${id}/hod-reject`, {
        rejectionReason
      });
      toast.success('Gatepass rejected successfully');
      setRejectionReason('');
      setShowRejectModal(false);
      fetchPendingGatepasses();
    } catch (err) {
      toast.error('Failed to reject gatepass');
    } finally {
      setLoading(false);
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
      <ToastContainer />
      
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="header-title">Gatepass Management System</h1>
            <p className="header-subtitle">HOD Approval Panel</p>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="approval-card">
          <h2 className="section-title">Pending Approvals</h2>
          
          {gatepasses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="empty-title">No pending approvals</h3>
              <p className="empty-message">All gatepass requests are processed.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="gatepass-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Hall Ticket</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gatepasses.map(gatepass => (
                    <tr key={gatepass._id}>
                      <td>
                        <div className="student-info">
                          <div className="student-name">{gatepass.studentName}</div>
                          <div className="student-details">{gatepass.year} - {gatepass.branch}</div>
                        </div>
                      </td>
                      <td className="hall-ticket">
                        {gatepass.hallTicket}
                      </td>
                      <td className="reason">
                        {gatepass.reason}
                      </td>
                      <td className="date">
                        {new Date(gatepass.createdAt).toLocaleDateString()}
                      </td>
                      <td className="actions">
                        <button
                          onClick={() => {
                            setSelectedGatepass(gatepass);
                            fetchHistory(gatepass._id);
                          }}
                          className="history-button"
                        >
                          History
                        </button>
                        <button
                          onClick={() => handleApprove(gatepass._id)}
                          disabled={loading}
                          className="approve-button"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGatepass(gatepass);
                            setShowRejectModal(true);
                          }}
                          disabled={loading}
                          className="reject-button"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Reject Gatepass for {selectedGatepass?.studentName}</h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="reject-form">
                  <label>Reason for Rejection:</label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason"
                    className="reject-input"
                  />
                  <div className="modal-actions">
                    <button
                      onClick={() => handleReject(selectedGatepass._id)}
                      disabled={loading || !rejectionReason}
                      className="confirm-reject-button"
                    >
                      {loading ? 'Processing...' : 'Confirm Reject'}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  ×
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

      <footer className="app-footer">
        <p>Developed by Vamshi</p>
        <p>&copy; {new Date().getFullYear()} Gatepass Management System</p>
      </footer>
    </div>
  );
}

export default App;