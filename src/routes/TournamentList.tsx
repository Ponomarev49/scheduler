import React, { useState } from 'react';
import styles from '../styles/TournamentList.module.css';

const TournamentList: React.FC = () => {
  const [tournaments, setTournaments] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = JSON.parse(e.target?.result as string);
        setTournaments([...tournaments, data]);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.pageTitle}>Список турниров</h1>
      <div>
        <input type="file" onChange={handleFileUpload} />
      </div>
      <ul className={styles.tournamentList}>
        {tournaments.map((tournament, index) => (
          <li key={index} className={styles.tournamentItem}>
            <h3>{tournament.name}</h3>
            <p>
              Даты: {tournament.startDate} - {tournament.endDate}
            </p>
            <p>Категории: {tournament.categories.join(', ')}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TournamentList;
