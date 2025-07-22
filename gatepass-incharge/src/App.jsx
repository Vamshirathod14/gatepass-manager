import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gatepasses, setGatepasses] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [inchargeInfo, setInchargeInfo] = useState(null);
  const [selectedGatepass, setSelectedGatepass] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('inchargeToken');
    if (token) {
      const info = JSON.parse(localStorage.getItem('inchargeInfo'));
      setInchargeInfo(info);
      fetchPendingGatepasses();
      fetchAllGatepassHistory();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/incharges/login', {
        email,
        password
      });
      
      localStorage.setItem('inchargeToken', response.data.token);
      const info = {
        name: response.data.name,
        year: response.data.year,
        branch: response.data.branch
      };
      localStorage.setItem('inchargeInfo', JSON.stringify(info));
      setInchargeInfo(info);
      toast.success('Login successful');
      fetchPendingGatepasses();
      fetchAllGatepassHistory();
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error ||
                          err.message || 
                          'Login failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingGatepasses = async () => {
    try {
      const token = localStorage.getItem('inchargeToken');
      const response = await axios.get('http://localhost:5000/api/gatepasses/pending/incharge', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGatepasses(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch gatepasses');
    }
  };

  const fetchAllGatepassHistory = async () => {
    try {
      const token = localStorage.getItem('inchargeToken');
      const response = await axios.get('http://localhost:5000/api/gatepasses/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch history');
    }
  };

  const handleApprove = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('inchargeToken');
      const gatepassToApprove = gatepasses.find(gp => gp._id === id);
      if (!gatepassToApprove) {
        throw new Error('Gatepass not found');
      }

      const response = await axios.patch(
        `http://localhost:5000/api/gatepasses/${id}/incharge-approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        toast.success(`Approved gatepass for ${gatepassToApprove.studentName}`);
        setGatepasses(gatepasses.filter(gp => gp._id !== id));
        fetchAllGatepassHistory();
      } else {
        throw new Error(response.data.message || 'Approval failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to approve gatepass');
      fetchPendingGatepasses();
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
      const token = localStorage.getItem('inchargeToken');
      await axios.patch(
        `http://localhost:5000/api/gatepasses/${id}/incharge-reject`,
        { rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Gatepass rejected successfully');
      setRejectionReason('');
      fetchPendingGatepasses();
      fetchAllGatepassHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject gatepass');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('inchargeToken');
    localStorage.removeItem('inchargeInfo');
    setInchargeInfo(null);
    setGatepasses([]);
    setHistory([]);
    navigate('/');
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

  if (!inchargeInfo) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2 className="login-title">Incharge Login</h2>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`login-button ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="app-container">
      <ToastContainer />
      <header className="app-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="header-title1">Scient Institute of Technology</h1>
            <h2 className="header-title">Gatepass Management System</h2>
            <p className="header-subtitle">
              {inchargeInfo.year} {inchargeInfo.branch} Incharge Panel
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="approval-section">
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
                          onClick={() => handleApprove(gatepass._id)}
                          disabled={loading}
                          className="approve-button"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGatepass(gatepass);
                            setRejectionReason('');
                            document.getElementById('reject-modal').style.display = 'block';
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

        {/* History Tracking Table */}
        <div className="history-section">
          <h2 className="section-title">Gatepass History</h2>
          {history.length === 0 ? (
            <div className="empty-state">
              <p>No gatepass history available</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Hall Ticket</th>
                    <th>Year & Branch</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record._id}>
                      <td>{record.studentName}</td>
                      <td>{record.hallTicket}</td>
                      <td>{record.year} - {record.branch}</td>
                      <td>
                        <span className={`status-badge ${record.status.toLowerCase()}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>{formatDate(record.updatedAt)}</td>
                      <td>{record.rejectionReason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        <div id="reject-modal" className="modal-overlay" style={{display: 'none'}}>
          <div className="modal-container">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Reject Gatepass for {selectedGatepass?.studentName}</h3>
                <button
                  onClick={() => document.getElementById('reject-modal').style.display = 'none'}
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
                      onClick={() => {
                        handleReject(selectedGatepass?._id);
                        document.getElementById('reject-modal').style.display = 'none';
                      }}
                      disabled={loading || !rejectionReason}
                      className="confirm-reject-button"
                    >
                      {loading ? 'Processing...' : 'Confirm Reject'}
                    </button>
                    <button
                      onClick={() => document.getElementById('reject-modal').style.display = 'none'}
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
      </main>

      <footer className="app-footer">
        <p>Developed by Vamshi</p>
        <p>&copy; {new Date().getFullYear()} Gatepass Management System</p>
      </footer>
    </div>
  );
}

export default App;