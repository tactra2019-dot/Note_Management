import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BadgeCheck, NotebookPen } from 'lucide-react';
import { apiRequest } from '../services/api.js';

function Activate() {
  const { token } = useParams();
  const [message, setMessage] = useState('Activating account...');
  const [error, setError] = useState('');

  useEffect(() => {
    const activate = async () => {
      try {
        const data = await apiRequest(`/api/auth/activate/${token}`, 'GET');
        setMessage(data.message);
      } catch (err) {
        setError(err.message);
        setMessage('Activation failed.');
      }
    };
    activate();
  }, [token]);

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="brand-mark">
          {error ? <NotebookPen size={26} /> : <BadgeCheck size={26} />}
        </div>
        <h1>Account activation</h1>
        <p className="auth-subtitle">{message}</p>
        {error && <div className="alert error">{error}</div>}
        <div className="auth-links">
          <Link to="/login">Go to login</Link>
        </div>
      </section>
    </main>
  );
}

export default Activate;
