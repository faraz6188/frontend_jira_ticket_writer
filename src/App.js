import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [rewrittenTickets, setRewrittenTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      setProjects(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch projects. Please check your API connection.');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    setSelectedTickets([]);
    setRewrittenTickets([]);
    setLoading(true);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${project.key}/issues`);
      const formattedTickets = response.data.map(ticket => ({
        ...ticket,
        isRewritten: false
      }));
      setTickets(formattedTickets);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch tickets for project ${project.name}.`);
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSelect = (ticket) => {
    setSelectedTickets(prev => {
      if (prev.some(t => t.key === ticket.key)) {
        return prev.filter(t => t.key !== ticket.key);
      } else {
        return [...prev, ticket];
      }
    });
    
    // Update select all checkbox state
    if (selectedTickets.length === tickets.length - 1) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all tickets
      setSelectedTickets([]);
    } else {
      // Select all tickets
      setSelectedTickets(tickets);
    }
    setSelectAll(!selectAll);
  };

  const handleRewriteTickets = async () => {
    if (selectedTickets.length === 0) {
      setError('Please select at least one ticket to rewrite.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/rewrite-tickets`, selectedTickets);
      setRewrittenTickets(response.data);
      setSuccess('Tickets rewritten successfully!');
      
      const updatedTickets = tickets.map(ticket => {
        if (selectedTickets.some(t => t.key === ticket.key)) {
          return {
            ...ticket,
            isRewritten: true
          };
        }
        return ticket;
      });
      setTickets(updatedTickets);
    } catch (err) {
      setError('Failed to rewrite tickets. Please try again.');
      console.error('Error rewriting tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTickets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`${API_BASE_URL}/update-tickets`, {
        tickets: rewrittenTickets
      });
      
      if (response.data.success) {
        setSuccess('Tickets updated successfully in Jira!');
        setRewrittenTickets([]);
        setSelectedTickets([]);
        
        if (selectedProject) {
          const ticketsResponse = await axios.get(`${API_BASE_URL}/projects/${selectedProject.key}/issues`);
          const formattedTickets = ticketsResponse.data.map(ticket => ({
            ...ticket,
            isRewritten: tickets.find(t => t.key === ticket.key)?.isRewritten || false
          }));
          setTickets(formattedTickets);
        }
      } else {
        setError(`Some tickets failed to update: ${response.data.failed_tickets.map(t => t.key).join(', ')}`);
      }
    } catch (err) {
      setError('Failed to update tickets in Jira. Please try again.');
      console.error('Error updating tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (key, newDescription) => {
    setRewrittenTickets(prev => 
      prev.map(ticket => 
        ticket.key === key ? {...ticket, rewritten_description: newDescription} : ticket
      )
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Jira Ticket Rewriter</h1>
      </header>
      
      <main className="App-main">
        <section className="projects-section">
          <h2>Projects</h2>
          {loading && projects.length === 0 ? (
            <div className="loading">Loading projects...</div>
          ) : (
            <div className="project-list">
              {projects.map(project => (
                <div 
                  key={project.id} 
                  className={`project-item ${selectedProject?.id === project.id ? 'selected' : ''}`}
                  onClick={() => handleProjectSelect(project)}
                >
                  <h3>{project.name}</h3>
                  <div className="project-details">
                    <span>Key: {project.key}</span>
                    <span>Type: {project.projectTypeKey}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        {selectedProject && (
          <div className="tickets-container">
            <section className="tickets-section">
              <h2>Jira Tickets</h2>
              <button 
                className="action-button refresh-button"
                onClick={() => handleProjectSelect(selectedProject)}
                disabled={loading}
              >
                Refresh Tickets
              </button>
              
              <div className="select-all-container">
                <label>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                  Select All
                </label>
              </div>
              
              {loading && tickets.length === 0 ? (
                <div className="loading">Loading tickets...</div>
              ) : (
                <div className="ticket-list">
                  {tickets.map(ticket => (
                    <div key={ticket.key} className="ticket-item">
                      <div className="ticket-header">
                        <input
                          type="checkbox"
                          checked={selectedTickets.some(t => t.key === ticket.key)}
                          onChange={() => handleTicketSelect(ticket)}
                          id={`ticket-${ticket.key}`}
                        />
                        <label htmlFor={`ticket-${ticket.key}`}>
                          {ticket.key}: {ticket.summary}
                          {ticket.isRewritten && <span className="rewritten-tag">Rewritten</span>}
                        </label>
                      </div>
                      <div className="ticket-description">
                        {ticket.description || 'No description'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                className="action-button rewrite-button"
                onClick={handleRewriteTickets}
                disabled={loading || selectedTickets.length === 0}
              >
                Rewrite Selected Tickets
              </button>
            </section>
            
            <section className="rewritten-section">
              <h2>Rewritten Tickets</h2>
              
              {loading && (
                <div className="loading">Processing tickets...</div>
              )}
              
              {rewrittenTickets.length > 0 ? (
                <>
                  <div className="rewritten-list">
                    {rewrittenTickets.map(ticket => (
                      <div key={ticket.key} className="rewritten-item">
                        <h3>Original: {ticket.original_title}</h3>
                        <h4>Rewritten: {ticket.rewritten_title}</h4>
                        <textarea
                          value={ticket.rewritten_description}
                          onChange={(e) => handleDescriptionChange(ticket.key, e.target.value)}
                          rows={5}
                        />
                        <div className="acceptance-criteria">
                          <h5>Acceptance Criteria:</h5>
                          <ul>
                            {ticket.acceptance_criteria.map((criterion, index) => (
                              <li key={index}>{criterion}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="action-button update-button"
                    onClick={handleUpdateTickets}
                    disabled={loading}
                  >
                    Approve & Update Jira
                  </button>
                </>
              ) : (
                <div className="no-rewritten-tickets">
                  No rewritten tickets yet. Select tickets and click 'Rewrite Selected Tickets'.
                </div>
              )}
            </section>
          </div>
        )}
        
        <div className="messages-container">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </main>
    </div>
  );
}

export default App;