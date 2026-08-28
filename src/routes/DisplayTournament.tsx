import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { addMatches, generateMatches } from "./function";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";



const categoryColors: { [key: string]: string } = {
  "2013-2014": "#FFDDC1",
  "2011-2012": "#C1E1FF",
  "2009-2010": "#C1FFC1",
  "2015-2016": "#FFC1E1",
};

const groupOrder = {
  quarterfinal: 1,
  semifinal: 2,
  third_place: 3,
  final: 4,
};

const insertSortedSchedule = (scheduleDict, sortedPlayOff) => {
  let noneCount = 0;
  let insertIndex = null;
  let flatSchedule = Object.entries(scheduleDict).flatMap(([date, times]) =>
    Object.entries(times).map(([time, match]) => ({ date, time, match }))
  );

  for (let i = 0; i < flatSchedule.length; i++) {
    if (flatSchedule[i].match.team1 === "None") {
      noneCount++;
      if (noneCount === 5) {
        insertIndex = i - 4;
        break;
      }
    } else {
      noneCount = 0;
    }
  }

  if (insertIndex !== null) {
    for (let i = 0; i < sortedPlayOff.length && insertIndex + i < flatSchedule.length; i++) {
      flatSchedule[insertIndex + i].match = sortedPlayOff[i];
    }
  }

  return flatSchedule.reduce((acc, { date, time, match }) => {
    if (!acc[date]) acc[date] = {};
    acc[date][time] = match;
    return acc;
  }, {});
};


const DisplayTournamentData: React.FC = () => {
  const location = useLocation();
  const tournament = location.state?.tournament;
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ date: string; time: string }[]>([]);
  const [teamMatches, setTeamMatches] = useState<Record<string, any[]>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  const [matchMatrix, setMatchMatrix] = useState<Record<string, Record<string, Record<string, string>>>>({});

  const { groupStage, playOff } = addMatches(tournament);

  const sortedPlayOff = playOff.sort((a, b) => {
    return groupOrder[a.group] - groupOrder[b.group];
  });

  const timeSlots = generateMatches(tournament.hallAvailability);

  const updatedSlots = timeSlots.map((item) => {
    const it = new Date(item);
    it.setHours(it.getHours() - 6);
    const formattedDate = it.toLocaleString("ru-RU", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const [date, time] = formattedDate.split(", ");
    const [day, month, year] = date.split(".");
    return `${year}-${month}-${day} ${time}`;
  });

  // Функция для загрузки данных расписания
  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5001/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_stage: groupStage,
          play_off: playOff,
          time_slots: timeSlots,
        }),
      });

      const data = await response.json();
      setSchedule(data);
    } catch (error) {
      setError("Ошибка загрузки расписания");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [tournament]);

  // Создание словаря расписания
  let scheduleDict = updatedSlots.reduce((acc, updatedSlot, index) => {
    const scheduleItem = schedule[index];
    const [date, timeOfDay] = updatedSlot.split(" ");

    if (!acc[date]) acc[date] = {};

    if (scheduleItem?.time === updatedSlot) {
      const { time, ...rest } = scheduleItem;
      acc[date][timeOfDay] = rest;
    } else {
      acc[date][timeOfDay] = { team1: "None", team2: "None", group: "None", category: "None" };
    }

    return acc;
  }, {} as Record<string, Record<string, any>>);

  const [displaySchedule, setDisplaySchedule] = useState(scheduleDict);

  useEffect(() => {
    const updatedSchedule = insertSortedSchedule(scheduleDict, sortedPlayOff);
    setDisplaySchedule(updatedSchedule);
  }, [schedule]);

  useEffect(() => {
    const updatedTeamMatches: Record<string, any[]> = {};

    Object.entries(displaySchedule).forEach(([date, matches]) => {
      Object.entries(matches).forEach(([time, match]) => {
        if (match.team1 !== "None" && match.team2 !== "None" && match.team1 !== "Лузер1" && match.team1 !== "Полуфиналист1" && match.team1 !== "Финалист1" && match.team1 !== "Четвертьфиналист1") {
          const team1Key = `${match.team1}_${match.category}`;
          const team2Key = `${match.team2}_${match.category}`;

          if (!updatedTeamMatches[team1Key]) updatedTeamMatches[team1Key] = [];
          if (!updatedTeamMatches[team2Key]) updatedTeamMatches[team2Key] = [];

          const matchInfo = { date, time, ...match };

          updatedTeamMatches[team1Key].push(matchInfo);
          updatedTeamMatches[team2Key].push(matchInfo);
        }
      });
    });

    setTeamMatches(updatedTeamMatches);
  }, [displaySchedule]);


  useEffect(() => {
    const newWarnings: string[] = [];

    Object.entries(teamMatches).forEach(([teamKey, matches]) => {
      const matchesByDate: Record<string, any[]> = {};

      matches.forEach((match) => {
        if (!matchesByDate[match.date]) matchesByDate[match.date] = [];
        matchesByDate[match.date].push(match);
      });

      Object.entries(matchesByDate).forEach(([date, dayMatches]) => {
        if (dayMatches.length > 2) {
          newWarnings.push(`⚠️ Команда ${teamKey} играет больше двух матчей в день (${date})`);
        }

        // Сортируем матчи по времени
        const sortedMatches = dayMatches.sort((a, b) => a.time.localeCompare(b.time));

        for (let i = 0; i < sortedMatches.length - 1; i++) {
          const matchTime1 = new Date(`${sortedMatches[i].date}T${sortedMatches[i].time}`);
          const matchTime2 = new Date(`${sortedMatches[i + 1].date}T${sortedMatches[i + 1].time}`);
          const timeDiff = (matchTime2.getTime() - matchTime1.getTime()) / (1000 * 60); // разница в минутах

          if (timeDiff <= 40) {
            newWarnings.push(`⚠️ Команда ${teamKey} играет два матча подряд (${date} ${sortedMatches[i].time} → ${sortedMatches[i + 1].time})`);
          } else if (timeDiff > 120) {
            newWarnings.push(`⚠️ У команды ${teamKey} слишком большой перерыв (${date} ${sortedMatches[i].time} → ${sortedMatches[i + 1].time})`);
          }
        }
      });
    });

    setWarnings(newWarnings);
  }, [teamMatches]);

  useEffect(() => {
    const newMatchMatrix: Record<string, Record<string, Record<string, Record<string, string>>>> = {};

    Object.values(teamMatches).forEach((matches) => {
      matches.forEach(({ team1, team2, category, group, date, time }) => {
        if (!newMatchMatrix[category]) newMatchMatrix[category] = {};

        const groupKey = `${group}_${category}`; // Группа внутри категории
        const key1 = `${team1}_${category}`;
        const key2 = `${team2}_${category}`;

        if (!newMatchMatrix[category][groupKey]) newMatchMatrix[category][groupKey] = {};
        if (!newMatchMatrix[category][groupKey][key1]) newMatchMatrix[category][groupKey][key1] = {};
        if (!newMatchMatrix[category][groupKey][key2]) newMatchMatrix[category][groupKey][key2] = {};

        const matchInfo = `${date} ${time}`;

        newMatchMatrix[category][groupKey][key1][key2] = matchInfo;
        newMatchMatrix[category][groupKey][key2][key1] = matchInfo;
      });
    });

    setMatchMatrix(newMatchMatrix);
  }, [teamMatches]);


  // Функция выбора матчей
  const handleSelect = (date: string, time: string) => {
    setSelected((prev) => {
      const isAlreadySelected = prev.some((s) => s.date === date && s.time === time);

      if (isAlreadySelected) {
        return prev.filter((s) => !(s.date === date && s.time === time));
      }

      if (prev.length === 2) return [prev[1], { date, time }];
      return [...prev, { date, time }];
    });
  };

  // Функция смены местами матчей
  const swapMatches = () => {
    if (selected.length < 2) return;

    const [first, second] = selected;

    setDisplaySchedule((prevSchedule) => {
      const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
      [newSchedule[first.date][first.time], newSchedule[second.date][second.time]] =
        [newSchedule[second.date][second.time], newSchedule[first.date][first.time]];
      return newSchedule;
    });

    setSelected([]);
  };

  const categoryOrder = ["2013-2014", "2015-2016", "2011-2012", "2009-2010"];
  const removeCategory = (teamWithCategory: string) => teamWithCategory.split("_")[0];

const exportScheduleToExcel = (displayScheduler, categoryColors) => {
  if (!displayScheduler || Object.keys(displayScheduler).length === 0) {
    alert("Нет данных для экспорта!");
    return;
  }

  const wb = XLSX.utils.book_new(); // Создаём книгу Excel
  let matchNumber = 1; // Глобальный номер матча

  Object.keys(displayScheduler).forEach((date) => {
    const matches = displayScheduler[date];

    const sheetData = [
      ["№ матча", "Время", "Категория", "Группа", "Команда 1", "Команда 2"],
    ];

    const rowStyles = {}; // Объект для хранения стилей строк

    Object.keys(matches).forEach((time) => {
      const match = matches[time];
      const category = match.category;
      const bgColor = categoryColors[category] || "#FFFFFF"; // Цвет категории (если нет, то белый)

      sheetData.push([
        matchNumber++, // Увеличиваем глобальный номер матча
        time,
        category,
        match.group,
        match.team1,
        match.team2,
      ]);

      // Добавляем стиль заливки для текущей строки
      rowStyles[sheetData.length - 1] = bgColor.replace("#", "");
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Применяем стили к ячейкам
    Object.keys(rowStyles).forEach((rowIdx) => {
      const excelRowIdx = parseInt(rowIdx) + 1;
      ["A", "B", "C", "D", "E", "F"].forEach((col) => {
        const cell = ws[`${col}${excelRowIdx}`];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: rowStyles[rowIdx] } },
          };
        }
      });
    });

    XLSX.utils.book_append_sheet(wb, ws, date); // Добавляем лист с датой
  });

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), "Tournament_Schedule.xlsx");
};


  return (
    <div style={{ padding: "16px" }}>
      {loading && <p>Загрузка расписания...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={swapMatches} disabled={selected.length < 2} style={{ marginBottom: "16px" }}>
        Поменять местами выбранные матчи
      </button>

      {Object.entries(displaySchedule).map(([date, matches]) => (
        <div key={date} style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>{date}</h2>
          <table style={{ borderCollapse: "collapse", border: "1px solid black", tableLayout: "auto" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th style={{ border: "1px solid black", textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>Время</th>
                <th style={{ border: "1px solid black", textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>Категория</th>
                <th style={{ border: "1px solid black", textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>Группа</th>
                <th style={{ border: "1px solid black", textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>Команда 1</th>
                <th style={{ border: "1px solid black", textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>Команда 2</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(matches).map(([time, match]) => {
                const isSelected = selected.some((s) => s.date === date && s.time === time);
                return (
                  <tr
                    key={time}
                    style={{
                      backgroundColor: isSelected ? "yellow" : categoryColors[match.category] || "#fafafa",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSelect(date, time)}
                  >
                    <td style={{ border: "1px solid black", textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>{time}</td>
                    <td style={{ border: "1px solid black", textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>{match.category}</td>
                    <td style={{ border: "1px solid black", textAlign: "center", padding: "4px", whiteSpace: "nowrap" }}>{match.group}</td>
                    <td style={{ border: "1px solid black", textAlign: "center", padding: "4px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {match.team1}
                    </td>
                    <td style={{ border: "1px solid black", textAlign: "center", padding: "4px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      {match.team2}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <div style={{ marginTop: "16px", color: "red", fontWeight: "bold" }}>
        {warnings.length > 0 ? (
          warnings.map((warning, index) => <p key={index}>{warning}</p>)
        ) : (
          <p style={{ color: "green" }}>✅ Нет нарушений</p>
        )}
      </div>
      <div style={{ overflowX: "auto", marginTop: "20px" }}>
        <h2>Матрицы матчей по категориям</h2>
        {categoryOrder
          .filter((category) => matchMatrix[category])
          .map((category) => (
            <div key={category} style={{ marginBottom: "40px" }}>
              <h2 style={{ textAlign: "center", color: "#333" }}>{category}</h2>
              {Object.entries(matchMatrix[category]).map(([group, matrix]) => (
                <div key={group} style={{ marginBottom: "20px" }}>
                  <h3 style={{ textAlign: "center", marginBottom: "8px" }}>{group}</h3>
                  <table style={{ borderCollapse: "collapse", border: "1px solid black" }}>
                    <thead>
                      <tr>
                        <th style={{ border: "1px solid black", padding: "4px", backgroundColor: "#f0f0f0" }}>Команда</th>
                        {Object.keys(matrix).map((team) => (
                          <th key={team} style={{ border: "1px solid black", padding: "4px", backgroundColor: "#f0f0f0", whiteSpace: "nowrap" }}>
                            {removeCategory(team)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(matrix).map(([team1, opponents]) => (
                        <tr key={team1}>
                          <td style={{ border: "1px solid black", padding: "4px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                            {removeCategory(team1)}
                          </td>
                          {Object.keys(matrix).map((team2) => (
                            <td key={team2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", whiteSpace: "nowrap" }}>
                              {team1 === team2 ? "—" : opponents[team2] || ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
      </div>
      <button onClick={() => exportScheduleToExcel(displaySchedule, categoryColors)}
        style={{ margin: "16px", padding: "8px", backgroundColor: "#28A745", color: "white", border: "none", cursor: "pointer" }}>
        📥 Экспорт расписания в Excel
      </button>
    </div>
  );
};

export default DisplayTournamentData;
