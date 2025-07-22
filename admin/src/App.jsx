import { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [students, setStudents] = useState([]);
  const [errors, setErrors] = useState([]);


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStudents([]); // Reset students when new file selected
    setErrors([]); // Reset errors
  };


  const uploadStudents = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/api/admin/upload-students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        setStudents(response.data.students || []);
        if (response.data.errors) {
          setErrors(response.data.errors);
          console.warn('CSV upload warnings:', response.data.errors);
        }
      } else {
        toast.error(response.data.message || 'Upload failed');
        if (response.data.error) {
          console.error('Upload error:', response.data.error);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error || 
                         'Upload failed';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-container">
      <ToastContainer />
      <h1>Student Data Management</h1>
      
      <div className="upload-section">
        <h2>Upload Student CSV</h2>
        <div className="upload-box">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button 
            onClick={uploadStudents} 
            disabled={uploading || !file}
            className={uploading ? 'loading' : ''}
          >
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </div>
        
        <div className="csv-format">
          <h3>Required CSV Format:</h3>
          <pre>
            hallTicket,name,year,branch,parentPhone<br />
            H12345678,John Doe,1st Year,CSE,9876543210<br />
            H12345679,Jane Smith,2nd Year,ECE,9876543211
          </pre>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="upload-errors">
          <h3>Upload Warnings</h3>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {students.length > 0 ? (
        <div className="student-list">
          <h2>Uploaded Students ({students.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Hall Ticket</th>
                <th>Name</th>
                <th>Year</th>
                <th>Section</th>
                <th>Branch</th>
                <th>Parent Phone</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>{student.hallTicket}</td>
                  <td>{student.name}</td>
                  <td>{student.year}</td>
                  <td>{student.section}</td>
                  <td>{student.branch}</td>
                  <td>{student.parentPhone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3>No student data uploaded yet</h3>
          <p>Upload a CSV file to see student records</p>
        </div>
      )}
    </div>
  );
}

export default App;