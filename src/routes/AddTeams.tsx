import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver'; // Не забудь импортировать библиотеку для сохранения в файл
import styles from '../styles/AddTeams.module.css';

import save_json_to_file from '../save.py';

const AddTeams: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Получаем данные о турнире и категориях
  const { tournamentData } = location.state || {};
  const [categories, setCategories] = useState<string[]>(tournamentData?.categories || []);
  const [tables, setTables] = useState<Map<string, Table[]>>(new Map());
  const [hallAvailability, setHallAvailability] = useState<Map<string, { start: string; end: string }>>(new Map());
  const [categoryStages, setCategoryStages] = useState<Map<string, { quarterfinal: boolean; semifinal: boolean; final: boolean; thirdPlace: boolean }>>(
    new Map());


  // Функция для добавления времени
  const addTime = (time: string, type: 'hour' | 'minute', increment: number) => {
    const [hours, minutes] = time.split(':').map(Number);

    let newHours = hours;
    let newMinutes = minutes;

    if (type === 'hour') {
      newHours = (newHours + increment + 24) % 24;
    } else if (type === 'minute') {
      newMinutes = (newMinutes + increment + 60) % 60;
      if (newMinutes === 0 && increment > 0) {
        newHours = (newHours + 1) % 24;
      }
    }

    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  };

  // Инициализируем таблицы для каждой категории
  useEffect(() => {
    if (!tournamentData || !tournamentData.categories) {
      navigate('/'); // Если данных нет, возвращаемся на главную страницу или показываем ошибку
    } else {
      // Для каждой категории создаем таблицу по умолчанию
      const initialTables = new Map<string, Table[]>();
      tournamentData.categories.forEach((category: string) => {
        initialTables.set(category, [
          {
            id: `${category}-table1`,
            name: `${category} - Группа 1`,
            items: [],
          },
        ]);
      });
      setTables(initialTables);

      // Инициализация этапов турнира для каждой категории
      const initialStages = new Map<string, { quarterfinal: boolean; semifinal: boolean; final: boolean; thirdPlace: boolean }>();
      tournamentData.categories.forEach((category: string) => {
        initialStages.set(category, {
          quarterfinal: false,
          semifinal: false,
          final: false,
          thirdPlace: false,
        });
      });
      setCategoryStages(initialStages);

      // Генерация доступности зала для всех дат турнира
      const availability = new Map<string, { start: string; end: string }>();
      const startDate = new Date(tournamentData.startDate);
      const endDate = new Date(tournamentData.endDate);

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0]; // Формат YYYY-MM-DD
        availability.set(dateString, { start: '09:00', end: '17:00' }); // Дефолтные значения
      }
      setHallAvailability(availability);
    }
  }, [tournamentData, navigate]);

  const toggleStage = (category: string, stage: keyof { quarterfinal: boolean; semifinal: boolean; final: boolean; thirdPlace: boolean }) => {
    setCategoryStages((prev) => {
      const newStages = new Map(prev);
      const currentStages = newStages.get(category) || {
        quarterfinal: false,
        semifinal: false,
        final: false,
        thirdPlace: false,
      };
      newStages.set(category, { ...currentStages, [stage]: !currentStages[stage] });
      return newStages;
    });
  };

  // Функция для обновления времени доступности зала
  const updateHallAvailability = (date: string, start: string, end: string) => {
    setHallAvailability((prev) => new Map(prev).set(date, { start, end }));
  };

  const onDragStart = (event: React.DragEvent, item: Item, sourceTableId: string) => {
    event.dataTransfer.setData('item', JSON.stringify(item));
    event.dataTransfer.setData('sourceTableId', sourceTableId);
  };

  const onDrop = (event: React.DragEvent, targetTableId: string) => {
    event.preventDefault();

    const itemData = event.dataTransfer.getData('item');
    const sourceTableId = event.dataTransfer.getData('sourceTableId');

    if (!itemData || sourceTableId === targetTableId) return;

    const item: Item = JSON.parse(itemData);

    setTables((prevTables) => {
      const newTables = new Map(prevTables);
      newTables.forEach((tableList, category) => {
        newTables.set(category, tableList.map((table) => {
          if (table.id === sourceTableId) {
            return { ...table, items: table.items.filter((i) => i.id !== item.id) };
          }
          if (table.id === targetTableId) {
            return { ...table, items: [...table.items, item] };
          }
          return table;
        }));
      });
      return newTables;
    });
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const addTableToCategory = (categoryName: string) => {
    setTables((prevTables) => {
      const newTables = new Map(prevTables);
      const categoryTables = newTables.get(categoryName) || [];
      const newTableId = `${categoryName}-table${categoryTables.length + 1}`;
      const newTableName = `${categoryName} - Группа ${categoryTables.length + 1}`;

      newTables.set(categoryName, [
        ...categoryTables,
        { id: newTableId, name: newTableName, items: [] },
      ]);
      return newTables;
    });
  };

  const addItemToCategory = (categoryName: string) => {
    const itemName = prompt('Введите название элемента:');
    const arrivalTime = prompt('Введите дату и время приезда команды (например, 2025-02-10 14:30):');

    if (!itemName) {
      alert('Пожалуйста, заполните поле с названием команды!');
      return;
    }

    // Проверка корректности формата времени
    const arrivalTimePattern = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;
    let arrivalTimeToSave = 'Местная'; // Дефолтное значение для местной команды

    if (arrivalTime && arrivalTimePattern.test(arrivalTime)) {
      arrivalTimeToSave = arrivalTime;
    } else if (arrivalTime && !arrivalTimePattern.test(arrivalTime)) {
      alert('Пожалуйста, введите дату и время в формате: YYYY-MM-DD HH:mm');
      return;
    }

    const newItem: Item = {
      id: Date.now(),
      name: itemName,
      arrivalTime: arrivalTimeToSave,
    };

    setTables((prevTables) => {
      const newTables = new Map(prevTables);
      const categoryTables = newTables.get(categoryName) || [];
      newTables.set(categoryName, categoryTables.map((table, index) => {
        if (index === 0) {
          return { ...table, items: [...table.items, newItem] };
        }
        return table;
      }));
      return newTables;
    });
  };

  const deleteTable = (categoryName: string, tableId: string) => {
    setTables((prevTables) => {
      const newTables = new Map(prevTables);
      const categoryTables = newTables.get(categoryName) || [];

      // Нельзя удалять первую таблицу
      if (tableId === `${categoryName}-table1`) {
        alert('Нельзя удалить первую таблицу!');
        return prevTables;
      }

      // Нельзя удалять таблицу, если в ней есть команды
      const table = categoryTables.find((table) => table.id === tableId);
      if (table && table.items.length > 0) {
        alert('Нельзя удалить таблицу, в которой есть команды!');
        return prevTables;
      }

      // Удаляем таблицу
      const filteredTables = categoryTables.filter((table) => table.id !== tableId);
      newTables.set(categoryName, filteredTables);
      return newTables;
    });
  };

const saveDataToFile = () => {
//     const dataToSave = {
//       tournamentName: tournamentData?.name || "Не указано",
//       startDate: tournamentData?.startDate || "Не указана",
//       endDate: tournamentData?.endDate || "Не указана",
//       categories: categories.map((category) => ({
//         name: category,
//         stages: categoryStages.get(category) || {
//           quarterfinal: false,
//           semifinal: false,
//           final: false,
//           thirdPlace: false,
//         },
//         groups: tables.get(category)?.map((table) => ({
//           id: table.id,
//           name: table.name,
//           teams: table.items.map((item) => ({
//             id: item.id,
//             name: item.name,
//             arrivalTime: item.arrivalTime,
//           })),
//         })) || [],
//       })),
//       hallAvailability: Object.fromEntries(Array.from(hallAvailability.entries())),
//     };
 const tournament = {
  "tournamentName": "майский",
  "startDate": "2024-12-09",
  "endDate": "2024-12-15",
  "categories": [
    {
      "name": "2009-2010",
      "stages": {
        "quarterfinal": false,
        "semifinal": true,
        "final": true,
        "thirdPlace": true
      },
      "groups": [
        {
          "id": "2009-2010-table1",
          "name": "2009-2010 - Группа 1",
          "teams": [
            {
              "id": 1739470576238,
              "name": "Энергия",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470583832,
              "name": "Виктория-2",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470589974,
              "name": "Радуга",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471281104,
              "name": "Сборная НСО",
              "arrivalTime": "2024-12-12 09:30"
            }
          ]
        },
        {
          "id": "2009-2010-table2",
          "name": "2009-2010 - Группа 2",
          "teams": [
            {
              "id": 1739470597021,
              "name": "Виктория",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470604040,
              "name": "Юность",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471325782,
              "name": "Молния",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471356943,
              "name": "Уральская молния",
              "arrivalTime": "2024-12-12 11:08"
            }
          ]
        }
      ]
    },
    {
      "name": "2011-2012",
      "stages": {
        "quarterfinal": false,
        "semifinal": true,
        "final": true,
        "thirdPlace": true
      },
      "groups": [
        {
          "id": "2011-2012-table1",
          "name": "2011-2012 - Группа 1",
          "teams": [
            {
              "id": 1739470637368,
              "name": "Виктория",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470651604,
              "name": "Серые волки",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470656022,
              "name": "Омская-1",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471410575,
              "name": "Тайфун",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471465252,
              "name": "Фортуна",
              "arrivalTime": "2024-12-12 09:30"
            }
          ]
        },
        {
          "id": "2011-2012-table2",
          "name": "2011-2012 - Группа 2",
          "teams": [
            {
              "id": 1739470671538,
              "name": "Радуга",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470676242,
              "name": "Юность",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470682706,
              "name": "Виктория-2",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471528925,
              "name": "Аврора",
              "arrivalTime": "2024-12-12 10:00"
            },
            {
              "id": 1739471553996,
              "name": "Стрела",
              "arrivalTime": "2024-12-12 11:03"
            }
          ]
        }
      ]
    },
    {
      "name": "2013-2014",
      "stages": {
        "quarterfinal": true,
        "semifinal": true,
        "final": true,
        "thirdPlace": true
      },
      "groups": [
        {
          "id": "2013-2014-table1",
          "name": "2013-2014 - Группа 1",
          "teams": [
            {
              "id": 1739470714933,
              "name": "Виктория",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470719011,
              "name": "Олимп-2",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470724083,
              "name": "Омская-1",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471620953,
              "name": "EGLS",
              "arrivalTime": "2024-12-11 11:08"
            }
          ]
        },
        {
          "id": "2013-2014-table2",
          "name": "2013-2014 - Группа 2",
          "teams": [
            {
              "id": 1739470731188,
              "name": "Олимп",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470738510,
              "name": "Виктория-2",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470744346,
              "name": "Бурые медведи",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471646705,
              "name": "Метеор",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471652712,
              "name": "Серые Волки",
              "arrivalTime": "Местная"
            }
          ]
        },
        {
          "id": "2013-2014-table3",
          "name": "2013-2014 - Группа 3",
          "teams": [
            {
              "id": 1739470752443,
              "name": "Юность",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470756099,
              "name": "Радуга",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739471688421,
              "name": "Аврора",
              "arrivalTime": "2024-12-12 10:00"
            },
            {
              "id": 1739471720564,
              "name": "Стрела",
              "arrivalTime": "2024-12-12 11:03"
            }
          ]
        }
      ]
    },
    {
      "name": "2015-2016",
      "stages": {
        "quarterfinal": false,
        "semifinal": true,
        "final": true,
        "thirdPlace": true
      },
      "groups": [
        {
          "id": "2015-2016-table1",
          "name": "2015-2016 - Группа 1",
          "teams": [
            {
              "id": 1739471776061,
              "name": "Виктория",
              "arrivalTime": "2024-12-12 11:08"
            },
            {
              "id": 1739471810068,
              "name": "EGLS",
              "arrivalTime": "2024-12-11 13:38"
            },
            {
              "id": 1739471842105,
              "name": "Фортуна",
              "arrivalTime": "2024-12-12 09:30"
            },
            {
              "id": 1739471885826,
              "name": "Триумф",
              "arrivalTime": "2024-12-11 11:08"
            }
          ]
        },
        {
          "id": "2015-2016-table2",
          "name": "2015-2016 - Группа 2",
          "teams": [
            {
              "id": 1739470846109,
              "name": "Сборная Юность+Старт",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470852143,
              "name": "Радуга",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470856385,
              "name": "Олимп",
              "arrivalTime": "Местная"
            },
            {
              "id": 1739470861639,
              "name": "Бурые медведи",
              "arrivalTime": "Местная"
            }
          ]
        }
      ]
    }
  ],
  "hallAvailability": {
    "2024-12-09": {
      "start": "09:00",
      "end": "17:10"
    },
    "2024-12-10": {
      "start": "09:00",
      "end": "17:10"
    },
    "2024-12-11": {
      "start": "09:00",
      "end": "16:30"
    },
    "2024-12-12": {
      "start": "09:50",
      "end": "17:20"
    },
    "2024-12-13": {
      "start": "09:00",
      "end": "17:40"
    },
    "2024-12-14": {
      "start": "08:30",
      "end": "20:00"
    },
    "2024-12-15": {
      "start": "08:30",
      "end": "17:40"
    }
  }
}
       navigate('/display-tournament', { state: { tournament } });
//     const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
//     saveAs(blob, 'tournamentData.json');
    };


  // Функция для обработки ввода времени
  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end', date: string) => {
    const regex = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/; // Регулярное выражение для формата HH:mm
    const time = event.target.value;

    if (regex.test(time)) {
      if (type === 'start') {
        setHallAvailability((prev) => new Map(prev).set(date, { start: time, end: prev.get(date)?.end || '17:00' }));
      } else {
        setHallAvailability((prev) => new Map(prev).set(date, { start: prev.get(date)?.start || '09:00', end: time }));
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/')} className={styles.buttonBlue}>
          Назад
        </button>
      </div>

      <div className={styles.tableContainer}>
        {categories && categories.length > 0 ? (
          categories.map((category, index) => (
            <div key={index}>
              <h2 className="text-xl font-semibold">{category}</h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => addTableToCategory(category)}
                  className={styles.buttonBlue}
                >
                  Добавить таблицу в {category}
                </button>
                <button
                  onClick={() => addItemToCategory(category)} // передаем категорию, в которую добавляется элемент
                  className={styles.buttonGreen}
                >
                  Добавить команду в {category}
                </button>
              </div>

              <div className={styles.tableWrapperContainer}>
                {tables.get(category)?.length > 0 ? (
                  tables.get(category)?.map((table) => (
                    <div
                      key={table.id}
                      className={styles.tableWrapper}
                      onDragOver={onDragOver}
                      onDrop={(event) => onDrop(event, table.id)}
                    >
                      <div className={styles.tableHeader}>
                        <h2 className={styles.tableTitle}>{table.name}</h2>
                        {/* Кнопка удаления таблицы */}
                        {table.id !== `${category}-table1` && (
                          <button
                            onClick={() => deleteTable(category, table.id)}
                            className={styles.buttonDelete}
                          >
                            Удалить
                          </button>
                        )}
                      </div>

                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Arrival Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.items.map((item) => (
                            <tr
                              key={item.id}
                              draggable
                              onDragStart={(event) => onDragStart(event, item, table.id)}
                              className={styles.tableRow}
                            >
                              <td>{item.name}</td>
                              <td>{item.arrivalTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>


                      <div className="flex flex-col space-y-2">
                        <label>
                          <input
                            type="checkbox"
                            checked={categoryStages.get(category)?.quarterfinal || false}
                            onChange={() => toggleStage(category, 'quarterfinal')}
                          /> Четвертьфинал
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={categoryStages.get(category)?.semifinal || false}
                            onChange={() => toggleStage(category, 'semifinal')}
                          /> Полуфинал
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={categoryStages.get(category)?.final || false}
                            onChange={() => toggleStage(category, 'final')}
                          /> Финал
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={categoryStages.get(category)?.thirdPlace || false}
                            onChange={() => toggleStage(category, 'thirdPlace')}
                          /> Матч за 3-е место
                        </label>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Нет доступных таблиц.</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>Нет доступных категорий.</p>
        )}

        <h3 className="text-xl font-semibold">Доступность зала</h3>
        <div className="space-y-4">
          {Array.from(hallAvailability.entries()).map(([date, availability]) => (
            <div key={date} className={styles.hallAvailabilityRow}>
              <span className="font-medium">{date}</span>

              <div className="flex space-x-4">
                <input
                  type="text"
                  value={availability.start}
                  onChange={(event) => handleTimeChange(event, 'start', date)}
                  className={styles.timeInput}
                  placeholder="Время начала"
                />
                <input
                  type="text"
                  value={availability.end}
                  onChange={(event) => handleTimeChange(event, 'end', date)}
                  className={styles.timeInput}
                  placeholder="Время окончания"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Кнопка сохранения */}
        <button onClick={saveDataToFile} className={styles.buttonSave}>
          Сохранить
        </button>
      </div>
    </div>
  );
};

export default AddTeams;
