import { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [hallTicket, setHallTicket] = useState('');
  const [gatepass, setGatepass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentEntries, setRecentEntries] = useState([]);

  const checkGatepass = async () => {
  if (!hallTicket.trim()) {
    toast.error('Please enter hall ticket number');
    return;
  }

  setLoading(true);
  try {
    const response = await axios.get(`http://localhost:5000/api/security/check-gatepass/${hallTicket}`);
    console.log('API Response:', response.data); // Debug log
    
    if (response.data.valid && response.data.gatepass) {
      setGatepass(response.data.gatepass); // THIS IS THE CRUCIAL FIX
    } else {
      toast.error('No valid gatepass found');
      setGatepass(null);
    }
  } catch (err) {
    console.error('Error checking gatepass:', err);
    toast.error(err.response?.data?.message || 'Error checking gatepass');
    setGatepass(null);
  } finally {
    setLoading(false);
  }
};

const markExit = async () => {
  if (!gatepass?._id) {
    toast.error('No valid gatepass selected');
    return;
  }

  try {
    const response = await axios.post(`http://localhost:5000/api/security/mark-exit/${gatepass._id}`);
    toast.success(response.data.message || 'Exit recorded and parents notified');
    setRecentEntries(prev => [{
      student: gatepass.studentName,
      ticket: gatepass.hallTicket,
      time: new Date().toLocaleTimeString(),
      type: 'Exit'
    }, ...prev]);
    setGatepass(null);
    setHallTicket('');
  } catch (err) {
    console.error('Error marking exit:', err);
    toast.error(err.response?.data?.message || 'Error recording exit');
  }
};

  const markEntry = async () => {
    try {
      await axios.post(`http://localhost:5000/api/security/mark-entry/${gatepass._id}`);
      toast.success('Entry recorded');
      setRecentEntries(prev => [{
        student: gatepass.studentName,
        ticket: gatepass.hallTicket,
        time: new Date().toLocaleTimeString(),
        type: 'Entry'
      }, ...prev]);
      setGatepass(null);
      setHallTicket('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording entry');
    }
  };

  return (
    <div className="security-container">
      <ToastContainer />
      <h1>Security Gatepass Management</h1>
      
      <div className="check-section">
        <div className="input-group">
          <input
            type="text"
            value={hallTicket}
            onChange={(e) => setHallTicket(e.target.value)}
            placeholder="Enter Hall Ticket Number"
          />
          <button onClick={checkGatepass} disabled={loading}>
            {loading ? 'Checking...' : 'Check Gatepass'}
          </button>
        </div>
      </div>

      {gatepass && (
        <div className="gatepass-details">
          <h2>Gatepass Found</h2>
          <div className="details-grid">
            <div><strong>Name:</strong> {gatepass.studentName}</div>
            <div><strong>Hall Ticket:</strong> {gatepass.hallTicket}</div>
            <div><strong>Year/Branch:</strong> {gatepass.year} - {gatepass.branch}</div>
            <div><strong>Reason:</strong> {gatepass.reason}</div>
            <div><strong>Status:</strong> {gatepass.status}</div>
            <div><strong>Issued At:</strong> {new Date(gatepass.createdAt).toLocaleString()}</div>
          </div>

          <div className="action-buttons">
            <button onClick={markExit} className="exit-btn">
              Mark Exit (Notify Parents)
            </button>
            <button onClick={markEntry} className="entry-btn">
              Mark Entry
            </button>
          </div>
        </div>
      )}

      <div className="recent-entries">
        <h2>Recent Movements</h2>
        {recentEntries.length === 0 ? (
          <p>No recent entries/exits</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Hall Ticket</th>
                <th>Time</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.map((entry, index) => (
                <tr key={index}>
                  <td>{entry.student}</td>
                  <td>{entry.ticket}</td>
                  <td>{entry.time}</td>
                  <td className={entry.type === 'Exit' ? 'exit' : 'entry'}>
                    {entry.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;