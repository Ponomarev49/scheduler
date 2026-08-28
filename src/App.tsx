import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './routes/HomePage';
import CreateTournament from './routes/CreateTournament';
import AddTeams from './routes/AddTeams'
import DisplayTournamentData from './routes/DisplayTournament';
import DragDropTables from './routes/new';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-tournament" element={<CreateTournament />} />
        <Route path="/add-teams" element={<AddTeams />} />
        <Route path="/display-tournament" element={<DisplayTournamentData />} />
      </Routes>
    </Router>
  );
};

export default App;
