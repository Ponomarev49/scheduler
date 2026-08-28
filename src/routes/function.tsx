const MATCH_DURATION = 40 * 60 * 1000;
// Функция прибавления часа к позднему времени
function addHourToLatest(date1: string, date2: string): string {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return "";
  }

  return new Date(Math.max(d1.getTime(), d2.getTime()) + 60 * 60 * 1000).toISOString();
}

// Функция создания матча с учетом прибытия команд
function createMatch(category: string, group: string, teams: Team[]): Match {
  const team1Arrives = new Date(teams[0].arrivalTime).getTime();
  const team2Arrives = new Date(teams[1].arrivalTime).getTime();

  if (isNaN(team1Arrives) && isNaN(team2Arrives)) {
    return { category, group, team1: teams[0], team2: teams[1], time: null };
  }

  let possibleTimeStart: string;
  if (isNaN(team1Arrives)) {
    possibleTimeStart = new Date(team2Arrives + 60 * 60 * 1000).toISOString();
  } else if (isNaN(team2Arrives)) {
    possibleTimeStart = new Date(team1Arrives + 60 * 60 * 1000).toISOString();
  } else {
    possibleTimeStart = addHourToLatest(teams[0].arrivalTime, teams[1].arrivalTime);
  }

  return { category, group, team1: teams[0], team2: teams[1], time: new Date(possibleTimeStart) };
}

// Генерация матчей для группового этапа и плей-офф
  export function addMatches(jsonData: any): { groupStage: Match[]; playOff: Match[] } {
  const groupStage: Match[] = [];
  const playOff: Match[] = [];

  jsonData.categories.forEach((category: any) => {
    category.groups.forEach((group: any) => {
      const teams = group.teams;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          groupStage.push(createMatch(category.name, group.name, [teams[i], teams[j]]));
        }
      }
    });

    if (category.stages.quarterfinal) {
      for (let i = 0; i < 4; i++) {
        playOff.push({
          category: category.name,
          group: "quarterfinal",
          team1: "Четвертьфиналист1",
          team2: "Четвертьфиналист2",
        });
      }
    }

    if (category.stages.semifinal) {
      for (let i = 0; i < 2; i++) {
        playOff.push({
          category: category.name,
          group: "semifinal",
          team1: "Полуфиналист1",
          team2: "Полуфиналист2",
        });
      }

      playOff.push({
        category: category.name,
        group: "final",
        team1: "Финалист1",
        team2: "Финалист2",
      });

      playOff.push({
        category: category.name,
        group: "third_place",
        team1: "Лузер1",
        team2: "Лузер2",
      });
    }
  });

  return { groupStage, playOff };
}

export function generateMatches(data: { [date: string]: { start: string; end: string } }) {
    const schedule: string[] = [];

    // Проходим по всем дням
    Object.keys(data).forEach((date) => {
        const { start, end } = data[date];

        // Учитываем местное время, создаем даты с учетом часового пояса
        let startTime = new Date(`${date}T${start}:00`);  // Местное время
        let endTime = new Date(`${date}T${end}:00`);      // Местное время
        startTime.setHours(startTime.getHours() + 6);
        endTime.setHours(endTime.getHours() + 6);

        // Генерация матчей, пока не наступит конец рабочего дня
        while (startTime.getTime() + MATCH_DURATION <= endTime.getTime()) {
            schedule.push(new Date(startTime).toISOString()); // Добавляем время в формате ISO
            startTime.setTime(startTime.getTime() + MATCH_DURATION); // Переходим к следующему времени
        }
    });

    return schedule;
}