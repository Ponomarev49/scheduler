import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/CreateTournament.module.css';

const CreateTournament: React.FC = () => {
  const [tournamentName, setTournamentName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ageCategories, setAgeCategories] = useState<string[]>([]);
  const [selectedStartYear, setSelectedStartYear] = useState('');
  const [selectedEndYear, setSelectedEndYear] = useState('');
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i);

  const navigate = useNavigate();

  // Функция для проверки пересечений возрастных категорий
  const isCategoryOverlap = (newStart: number, newEnd: number, categories: string[]) => {
    return categories.some((category) => {
      const [start, end] = category.split('-').map(Number);
      return (newStart <= end && newEnd >= start); // Если одна категория перекрывает другую
    });
  };

  const handleAddCategory = () => {
    if (
      selectedStartYear &&
      selectedEndYear &&
      +selectedStartYear <= +selectedEndYear
    ) {
      const newCategory = `${selectedStartYear}-${selectedEndYear}`;

      // Проверяем на пересечение категорий
      if (isCategoryOverlap(+selectedStartYear, +selectedEndYear, ageCategories)) {
        setError('Возрастные категории пересекаются');
        return;
      }

      // Если нет пересечений, добавляем категорию
      if (!ageCategories.includes(newCategory)) {
        setAgeCategories([...ageCategories, newCategory]);
        setError('');
      }
      setSelectedStartYear('');
      setSelectedEndYear('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setAgeCategories(ageCategories.filter((cat) => cat !== category));
  };

  const handleSubmit = () => {
    if (!isFormValid) return;

    const tournamentData = {
      name: tournamentName,
      startDate,
      endDate,
      categories: ageCategories,
    };

    navigate('/add-teams', { state: { tournamentData } });
  };

  const isFormValid =
    tournamentName.trim() &&
    startDate &&
    endDate &&
    new Date(startDate) <= new Date(endDate) &&
    ageCategories.length > 0;

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.pageTitle}>Создать новый турнир</h1>
      <div className={styles.formContainer}>
        <div>
          <label htmlFor="tournamentName" className={styles.formLabel}>
            Название турнира
          </label>
          <input
            type="text"
            id="tournamentName"
            className={styles.formInput}
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            placeholder="Введите название турнира"
          />
        </div>
        <div>
          <label htmlFor="startDate" className={styles.formLabel}>
            Дата начала
          </label>
          <input
            type="date"
            id="startDate"
            className={styles.formInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="endDate" className={styles.formLabel}>
            Дата окончания
          </label>
          <input
            type="date"
            id="endDate"
            className={styles.formInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          {startDate &&
            endDate &&
            new Date(startDate) > new Date(endDate) && (
              <p className={styles.errorMessage}>
                Дата окончания не может быть раньше даты начала.
              </p>
            )}
        </div>
        <div>
          <label className={styles.formLabel}>Возрастные категории</label>
          <div className={styles.ageCategoryContainer}>
            <select
              value={selectedStartYear}
              onChange={(e) => setSelectedStartYear(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">Начало</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span className={styles.dash}>-</span>
            <select
              value={selectedEndYear}
              onChange={(e) => setSelectedEndYear(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">Конец</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button onClick={handleAddCategory} className={styles.addCategoryButton}>
              Добавить
            </button>
          </div>
          {selectedStartYear &&
            selectedEndYear &&
            +selectedStartYear > +selectedEndYear && (
              <p className={styles.errorMessage}>
                Год начала не может быть больше года окончания.
              </p>
            )}
          {error && <p className={styles.errorMessage}>{error}</p>}
          <ul className={styles.categoryList}>
            {ageCategories.map((category, index) => (
              <li key={index} className={styles.categoryItem}>
                <span>{category}</span>
                <button
                  onClick={() => handleRemoveCategory(category)}
                  className={styles.removeCategoryButton}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <button
            onClick={handleSubmit}
            className={styles.submitButton}
            disabled={!isFormValid}
          >
            Создать турнир
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTournament;
