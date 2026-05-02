import React, { useEffect, useState } from "react";
import api from "../api/client";

function DataPanel({ title, endpoint, icon: Icon }) {
  const [state, setState] = useState({ loading: true, error: "", rows: [] });

  useEffect(() => {
    let active = true;

    api
      .get(endpoint)
      .then(({ data }) => {
        if (active) setState({ loading: false, error: "", rows: data });
      })
      .catch((error) => {
        if (active) {
          setState({
            loading: false,
            error: error.response?.data?.message || "Unable to load data",
            rows: []
          });
        }
      });

    return () => {
      active = false;
    };
  }, [endpoint]);

  const columns = state.rows[0] ? Object.keys(state.rows[0]).slice(0, 5) : [];

  return (
    <article className="data-panel" id={title}>
      <header>
        <div>
          <Icon size={20} />
          <h2>{title}</h2>
        </div>
        <span>{state.rows.length}</span>
      </header>

      {state.loading && <p className="muted">Loading...</p>}
      {state.error && <p className="error">{state.error}</p>}
      {!state.loading && !state.error && state.rows.length === 0 && <p className="muted">No records yet.</p>}

      {state.rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.rows.slice(0, 6).map((row, index) => (
                <tr key={row.ID || row.PatientID || row.DoctorID || row.AppointmentID || index}>
                  {columns.map((column) => (
                    <td key={column}>{String(row[column] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default DataPanel;
