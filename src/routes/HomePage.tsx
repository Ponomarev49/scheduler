import React from 'react';
import styles from '../styles/HomePage.module.css';

export const HomePage: React.FC = () => {
  const handleCreateNewTournament = () => {
    window.location.href = '/create-tournament';
  };

  const handleEditExistingTournament = () => {
    window.location.href = '/edit-tournament';
  };

  return (
    <div className={styles.pageWrapper}>
      <h1 className={styles.header}>Управление турнирами</h1>
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>Создать новый турнира</h2>
          <button onClick={handleCreateNewTournament}>
            Создать новый турнир
          </button>
        </div>
        <div className={styles.card}>
          <h2>Изменить существующий турнир</h2>
          <button onClick={handleEditExistingTournament}>
            Изменить существующий турнир
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
