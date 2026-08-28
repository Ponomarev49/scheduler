const MATCH_DURATION = 40 * 60 * 1000; // 40 минут в миллисекундах

// Создание расписания на основе JSON-данных
export function createTimetable(jsonData: any) {
  return Object.keys(jsonData).map((date) => ({
    date,
    start: jsonData[date].start,
    end: jsonData[date].end,
  }));
}

// Генерация матчей на основе доступных временных слотов
export function generateMatches(data: { date: string; start: string; end: string }[]) {
  const schedule: string[] = [];

  data.forEach(({ date, start, end }) => {
    let startTime = new Date(`${date}T${start}:00`).getTime();
    const endTime = new Date(`${date}T${end}:00`).getTime();

    while (startTime + MATCH_DURATION <= endTime) {
      schedule.push(new Date(startTime).toISOString());
      startTime += MATCH_DURATION;
    }
  });

  return schedule;
}
